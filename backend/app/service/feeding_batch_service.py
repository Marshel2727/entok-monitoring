from datetime import datetime
import pytz

from app.utils.db import db
from app.models.feed import Feed, FeedTransaction
from app.models.formulation import Formulation
from app.models.population import Population
from app.models.growth_phase import GrowthPhase, normalize_phase_key
from app.models.timbangan import Timbangan, TimbanganReading
from app.models.feeding_batch import FeedingBatch, FeedingBatchIngredient
from app.models.task import TaskExecution
from app.realtime import emit_realtime_event
from app.service.activity_service import create_log

PHASE_ORDER = ('starter', 'grower 1', 'grower 2', 'finisher')


def _emit_batch_updated(action, batch, extra=None):
    payload = {
        'action': action,
        'batch_id': batch.id,
        'date': batch.batch_date.isoformat() if batch.batch_date else None,
        'status': batch.status,
        'task_id': batch.task_id,
        'task_execution_id': batch.task_execution_id,
    }
    if extra:
        payload.update(extra)
    emit_realtime_event('feeding_batch_updated', payload)


def _emit_batch_stock_updated(action, batch):
    feed_ids = sorted({item.feed_id for item in batch.ingredients if item.feed_id})
    emit_realtime_event('feed_stock_updated', {
        'action': action,
        'batch_id': batch.id,
        'feed_ids': feed_ids,
    })


def _today_wita():
    return datetime.now(pytz.timezone('Asia/Makassar')).date()


def _parse_date(date_str=None):
    if not date_str:
        return _today_wita(), None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date(), None
    except ValueError:
        return None, {'status': 'error', 'message': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.'}


def _apply_task_scope(query, task_id=None, task_execution_id=None):
    if task_execution_id:
        return query.filter(FeedingBatch.task_execution_id == task_execution_id)
    if task_id:
        return query.filter(
            FeedingBatch.task_id == task_id,
            FeedingBatch.task_execution_id.is_(None)
        )
    return query.filter(
        FeedingBatch.task_id.is_(None),
        FeedingBatch.task_execution_id.is_(None)
    )


def _resolve_task_scope(batch_date, task_id=None, task_execution_id=None):
    if not task_execution_id:
        return task_id, None, None, 200

    execution = TaskExecution.query.get(task_execution_id)
    if not execution:
        return None, None, {
            'status': 'error',
            'message': 'Eksekusi tugas tidak ditemukan untuk batch racikan.'
        }, 404

    if execution.execution_date != batch_date:
        return None, None, {
            'status': 'error',
            'message': 'Tanggal batch racikan tidak cocok dengan tanggal eksekusi tugas.'
        }, 400

    if task_id and execution.task_id != task_id:
        return None, None, {
            'status': 'error',
            'message': 'task_id tidak cocok dengan task_execution_id.'
        }, 400

    return execution.task_id, execution.id, None, 200


def _phase_population(form_phase, populations):
    form_phase_lower = form_phase.lower()
    for population in populations:
        pop_phase_lower = population.phase.lower()
        if form_phase_lower in pop_phase_lower or pop_phase_lower in form_phase_lower:
            return population.total_ducks
    return 0


def _phase_key(phase):
    return normalize_phase_key(phase)


def _phase_rank(phase):
    key = _phase_key(phase)
    try:
        return PHASE_ORDER.index(key)
    except ValueError:
        return len(PHASE_ORDER)


def _compact_code(value, fallback):
    cleaned = ''.join(
        char if char.isalnum() or char.isspace() else ' '
        for char in (value or '').upper()
    )
    words = [word for word in cleaned.split() if word]
    if not words:
        return fallback
    if len(words) > 1:
        return ''.join(word[0] for word in words[:3])[:3]
    return words[0][:3]


def _phase_short(phase):
    key = _phase_key(phase)
    if key == 'starter':
        return 'ST'
    if key == 'grower 1':
        return 'G1'
    if key == 'grower 2':
        return 'G2'
    if key == 'finisher':
        return 'FN'
    return _compact_code(phase, 'FS')


def _feed_short(feed_name):
    normalized = (feed_name or '').strip().lower()
    aliases = (
        ('larva bsf', 'BSF'),
        ('bsf', 'BSF'),
        ('dedak', 'DDK'),
        ('jagung', 'JGG'),
        ('bekicot', 'BKC'),
        ('ayam', 'AYM'),
        ('konsentrat', 'KNS'),
        ('azolla', 'AZL'),
        ('pur', 'PUR'),
    )
    for keyword, short_name in aliases:
        if keyword in normalized:
            return short_name
    return _compact_code(feed_name, 'BHN')


def _find_feed_by_name(name):
    normalized = (name or '').strip()
    if not normalized:
        return None

    feed = Feed.query.filter(db.func.lower(Feed.name) == normalized.lower()).first()
    if feed:
        return feed

    return Feed.query.filter(Feed.name.ilike(normalized)).first()


def _build_planned_ingredients():
    populations = Population.query.all()
    formulations = Formulation.query.all()
    populations_by_phase_id = {population.phase_id: population for population in populations if population.phase_id}

    planned = []
    for formulation in formulations:
        population_record = populations_by_phase_id.get(formulation.phase_id)
        population = population_record.total_ducks if population_record else _phase_population(formulation.phase, populations)
        if population <= 0:
            continue

        phase_name = formulation.growth_phase.name if formulation.growth_phase else formulation.phase

        for feed_name, percentage in formulation.composition.items():
            amount = (formulation.target_consumption * population * (percentage / 100.0)) / 1000.0
            if amount <= 0:
                continue

            feed = _find_feed_by_name(feed_name)
            if not feed:
                return None, {'status': 'error', 'message': f'Bahan pakan "{feed_name}" belum terdaftar di inventaris'}, 404

            planned.append({
                'feed': feed,
                'phase_id': formulation.phase_id,
                'phase': phase_name,
                'population_count': population,
                'target_consumption': formulation.target_consumption,
                'planned_amount': round(amount, 3),
            })

    if not planned:
        return None, {'status': 'error', 'message': 'Belum ada formulasi dan populasi aktif untuk membuat racikan'}, 400

    planned.sort(key=lambda item: (_phase_rank(item['phase']), item['feed'].name.lower()))
    return planned, None, 200


def _add_batch_ingredients(batch, ingredients):
    for item in ingredients:
        feed = item['feed']
        db.session.add(FeedingBatchIngredient(
            batch_id=batch.id,
            feed_id=feed.id,
            phase_id=item.get('phase_id'),
            feed_name=feed.name,
            phase=item['phase'],
            population_count=item['population_count'],
            target_consumption=item['target_consumption'],
            planned_amount=item['planned_amount'],
            weighed_amount=0.0,
            deducted_amount=0.0,
            variance_amount=round(-item['planned_amount'], 3),
        ))


def _batch_has_scale_data(batch):
    return any(item.weighed_amount > 0 or item.deducted_amount > 0 for item in batch.ingredients)


def _batch_scale_is_complete(batch):
    return bool(batch.ingredients) and all((item.weighed_amount or 0) > 0 for item in batch.ingredients)


def _select_scale_batch(batches):
    for batch in batches:
        if not _batch_scale_is_complete(batch):
            return batch
    return batches[-1] if batches else None


def _planned_signature(ingredients):
    return sorted([
        (
            _phase_key(item['phase']),
            item.get('phase_id'),
            item['feed'].id,
            round(float(item['planned_amount']), 3),
            int(item['population_count']),
            round(float(item['target_consumption']), 3),
        )
        for item in ingredients
    ])


def _batch_signature(batch):
    return sorted([
        (
            _phase_key(item.phase),
            item.phase_id,
            item.feed_id,
            round(float(item.planned_amount or 0), 3),
            int(item.population_count or 0),
            round(float(item.target_consumption or 0), 3),
        )
        for item in batch.ingredients
    ])


def _batch_needs_plan_sync(batch, ingredients):
    has_legacy_rows = any(
        _phase_key(item.phase) == 'gabungan'
        or not item.population_count
        or not item.target_consumption
        for item in batch.ingredients
    )
    return has_legacy_rows or _batch_signature(batch) != _planned_signature(ingredients)


def _sync_preparing_batch_plan(batch, ingredients):
    if not _batch_needs_plan_sync(batch, ingredients):
        return None

    if _batch_has_scale_data(batch):
        return {
            'status': 'error',
            'message': 'Target batch racikan sudah berubah, tetapi batch ini sudah berisi data timbangan. Batalkan batch lama lalu buat ulang.'
        }

    FeedingBatchIngredient.query.filter_by(batch_id=batch.id).delete()
    db.session.flush()
    _add_batch_ingredients(batch, ingredients)
    db.session.commit()
    return None


def get_today_batch(date_str=None, task_id=None, task_execution_id=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return error, 400

    resolved_task_id, resolved_execution_id, error, code = _resolve_task_scope(batch_date, task_id, task_execution_id)
    if error:
        return error, code

    query = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status.in_(('PREPARING', 'FINALIZED'))
    )
    batch = _apply_task_scope(query, resolved_task_id, resolved_execution_id).order_by(FeedingBatch.created_at.desc()).first()
    return {
        'status': 'success',
        'data': batch.to_dict() if batch else None
    }, 200


def get_today_batches(date_str=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return error, 400

    batches = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status.in_(('PREPARING', 'FINALIZED'))
    ).order_by(FeedingBatch.created_at.desc()).all()

    return {
        'status': 'success',
        'data': [batch.to_dict() for batch in batches]
    }, 200


def create_batch(user_id, date_str=None, task_id=None, task_execution_id=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return error, 400

    resolved_task_id, resolved_execution_id, error, code = _resolve_task_scope(batch_date, task_id, task_execution_id)
    if error:
        return error, code

    query = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status.in_(('PREPARING', 'FINALIZED'))
    )
    existing = _apply_task_scope(query, resolved_task_id, resolved_execution_id).order_by(FeedingBatch.created_at.desc()).first()
    if existing:
        if existing.status == 'PREPARING':
            ingredients, error, code = _build_planned_ingredients()
            if error:
                return error, code

            sync_error = _sync_preparing_batch_plan(existing, ingredients)
            if sync_error:
                return sync_error, 400

        return {
            'status': 'success',
            'message': 'Batch racikan hari ini sudah tersedia',
            'data': existing.to_dict()
        }, 200

    ingredients, error, code = _build_planned_ingredients()
    if error:
        return error, code

    batch = FeedingBatch(
        batch_date=batch_date,
        task_id=resolved_task_id,
        task_execution_id=resolved_execution_id,
        keeper_id=user_id,
        status='PREPARING'
    )
    db.session.add(batch)
    db.session.flush()

    _add_batch_ingredients(batch, ingredients)

    db.session.commit()
    task_label = f" untuk tugas {resolved_task_id}" if resolved_task_id else ""
    create_log("SISTEM", f"Membuat batch racikan pakan tanggal {batch_date.isoformat()}{task_label}.", user_id)
    _emit_batch_updated('created', batch)

    return {
        'status': 'success',
        'message': 'Batch racikan berhasil dibuat',
        'data': batch.to_dict()
    }, 201


def _get_active_batch_for_scale(date_str, user_id=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return None, error, 400

    batches = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status == 'PREPARING'
    ).order_by(FeedingBatch.created_at.asc()).all()
    batch = _select_scale_batch(batches)

    if batch:
        response, code = create_batch(user_id, batch_date.isoformat(), batch.task_id, batch.task_execution_id)
        if code not in (200, 201):
            return None, response, code

        batch_id = response.get('data', {}).get('id')
        batch = FeedingBatch.query.get(batch_id) if batch_id else batch
        return batch, None, 200

    response, code = create_batch(user_id, batch_date.isoformat())
    if code not in (200, 201):
        return None, response, code

    batch_id = response.get('data', {}).get('id')
    batch = FeedingBatch.query.get(batch_id) if batch_id else None
    if not batch or batch.status != 'PREPARING':
        return None, {'status': 'error', 'message': 'Batch racikan aktif tidak tersedia'}, 400

    return batch, None, 200


def _get_batch_for_scale(date_str=None, user_id=None, batch_id=None):
    if not batch_id:
        return _get_active_batch_for_scale(date_str, user_id)

    batch = FeedingBatch.query.get(batch_id)
    if not batch:
        return None, {'status': 'error', 'message': 'Batch racikan dari timbangan tidak ditemukan'}, 404
    if batch.status != 'PREPARING':
        return None, {'status': 'error', 'message': 'Batch racikan sudah tidak bisa menerima data timbangan'}, 400

    if date_str:
        batch_date, error = _parse_date(date_str)
        if error:
            return None, error, 400
        if batch.batch_date != batch_date:
            return None, {'status': 'error', 'message': 'Tanggal data timbangan tidak cocok dengan batch racikan'}, 400

    response, code = create_batch(
        user_id,
        batch.batch_date.isoformat() if batch.batch_date else date_str,
        batch.task_id,
        batch.task_execution_id
    )
    if code not in (200, 201):
        return None, response, code

    resolved_batch_id = response.get('data', {}).get('id') or batch.id
    batch = FeedingBatch.query.get(resolved_batch_id) or batch
    return batch, None, 200


def _scale_map_items(batch):
    ingredients = sorted(
        batch.ingredients,
        key=lambda item: (_phase_rank(item.phase), item.feed_name.lower())
    )

    items = []
    for index, item in enumerate(ingredients, start=1):
        phase_name = item.growth_phase.name if item.growth_phase else item.phase
        target = round(float(item.planned_amount or 0), 3)
        weighed = round(float(item.weighed_amount or 0), 3)
        phase_short = _phase_short(phase_name)
        label_short = _feed_short(item.feed_name)

        items.append({
            'kode': index,
            'ingredient_id': item.id,
            'feed_id': item.feed_id,
            'phase_id': item.phase_id,
            'phase': phase_name,
            'phase_short': phase_short,
            'label': item.feed_name,
            'label_short': label_short,
            'target': target,
            'weighed': weighed,
            'unit': item.unit,
            'saved': weighed > 0,
            'lcd_title': f'{phase_short} {label_short} #{index:02d}',
            'lcd_target': f'T:{target:.3f}',
        })

    return items


def get_scale_map(timbangan_id=2, date_str=None, user_id=None, batch_id=None):
    """
    Daftar urutan timbang untuk ESP32 Timbangan 2.
    ESP32 memakai response ini untuk mode timbang berurutan di LCD.
    """
    timbangan = Timbangan.query.get(timbangan_id)
    if not timbangan:
        return {'status': 'error', 'message': f'Timbangan dengan ID {timbangan_id} tidak terdaftar'}, 404
    if timbangan.tipe != 'MULTI':
        return {'status': 'error', 'message': 'Scale map hanya tersedia untuk timbangan tipe MULTI'}, 400

    batch, error, code = _get_batch_for_scale(date_str, user_id, batch_id)
    if error:
        return error, code

    items = _scale_map_items(batch)
    saved_items = sum(1 for item in items if item['saved'])

    return {
        'status': 'success',
        'message': 'Scale map Timbangan 2 siap',
        'batch_id': batch.id,
        'date': batch.batch_date.isoformat() if batch.batch_date else None,
        'timbangan_id': timbangan.id,
        'tolerance_percent': batch.tolerance_percent,
        'total_items': len(items),
        'saved_items': saved_items,
        'items': items,
    }, 200


def _find_batch_ingredient(batch, feed, label, phase=None, phase_id=None):
    requested_phase = _phase_key(phase)
    label_lower = (label or '').strip().lower()

    candidates = []
    for item in batch.ingredients:
        same_feed = feed and item.feed_id == feed.id
        same_label = item.feed_name.strip().lower() == label_lower
        if same_feed or same_label:
            candidates.append(item)

    if phase_id:
        candidates = [item for item in candidates if item.phase_id == phase_id]
    elif phase:
        candidates = [item for item in candidates if _phase_key(item.phase) == requested_phase]

    if len(candidates) == 1:
        return candidates[0], None

    if not candidates:
        return None, 'Bahan atau fase tidak ditemukan di target batch racikan hari ini'

    phase_options = ', '.join(sorted({item.phase for item in candidates}))
    return None, f'Bahan "{label}" ada di beberapa fase. Kirim phase yang jelas: {phase_options}'


def _normalize_scale_reading_data(data):
    timbangan_id = data.get('timbangan_id', 2)
    ingredient_id = data.get('ingredient_id')
    feed_id = (data.get('feed_id') or '').strip() or None
    label = (data.get('label') or data.get('feed_name') or '').strip()
    phase = (data.get('phase') or data.get('fase') or '').strip()
    phase_id = (data.get('phase_id') or data.get('fase_id') or '').strip() or None
    value = data.get('value', data.get('amount'))
    unit = (data.get('unit') or 'kg').strip()
    mode = (data.get('mode') or 'SET').strip().upper()

    if not ingredient_id and not label:
        return None, {'status': 'error', 'message': 'Label bahan wajib dikirim dari timbangan'}, 400

    try:
        ingredient_id = int(ingredient_id) if ingredient_id is not None else None
    except (TypeError, ValueError):
        return None, {'status': 'error', 'message': 'ingredient_id harus berupa angka'}, 400

    try:
        value = float(value)
    except (TypeError, ValueError):
        return None, {'status': 'error', 'message': 'Berat timbang harus berupa angka'}, 400

    if value < 0:
        return None, {'status': 'error', 'message': 'Berat timbang tidak boleh negatif'}, 400

    if mode not in ('SET', 'ADD'):
        return None, {'status': 'error', 'message': 'Mode harus SET atau ADD'}, 400

    return {
        'timbangan_id': timbangan_id,
        'ingredient_id': ingredient_id,
        'feed_id': feed_id,
        'label': label,
        'phase': phase,
        'phase_id': phase_id,
        'value': value,
        'unit': unit,
        'mode': mode,
    }, None, 200


def _apply_scale_reading_to_batch(batch, timbangan, reading_data):
    ingredient_id = reading_data['ingredient_id']
    label = reading_data['label']
    phase = reading_data['phase']
    phase_id = reading_data['phase_id']
    value = reading_data['value']
    unit = reading_data['unit']
    mode = reading_data['mode']

    if ingredient_id:
        ingredient = FeedingBatchIngredient.query.filter_by(id=ingredient_id, batch_id=batch.id).first()
        if not ingredient:
            return None, {'status': 'error', 'message': 'Bahan komposisi fase tidak ditemukan di batch aktif'}, 400
    else:
        feed = _find_feed_by_name(label)
        ingredient, ingredient_error = _find_batch_ingredient(batch, feed, label, phase, phase_id)
        if ingredient_error:
            return None, {'status': 'error', 'message': ingredient_error}, 400

    new_amount = value if mode == 'SET' else ingredient.weighed_amount + value
    ingredient.weighed_amount = round(new_amount, 3)
    ingredient.variance_amount = round(ingredient.weighed_amount - ingredient.planned_amount, 3)

    timbangan.status = 'ONLINE'
    reading = TimbanganReading(
        timbangan_id=timbangan.id,
        value=round(value, 3),
        unit=unit,
        label=f'{ingredient.phase} - {ingredient.feed_name}',
        feed_id=ingredient.feed_id
    )
    db.session.add(reading)

    return {
        'ingredient_id': ingredient.id,
        'phase': ingredient.phase,
        'label': ingredient.feed_name,
        'value': round(value, 3),
        'weighed_amount': ingredient.weighed_amount,
        'variance_amount': ingredient.variance_amount,
    }, None, 200


def record_scale_reading(data, user_id=None):
    """
    Terima data tombol bahan dari Timbangan 2.
    Payload: { batch_id?, timbangan_id, phase, label, value, mode?: SET|ADD, date? }
    """
    reading_data, error, code = _normalize_scale_reading_data(data)
    if error:
        return error, code

    batch, error, code = _get_batch_for_scale(data.get('date'), user_id, data.get('batch_id'))
    if error:
        return error, code

    timbangan = Timbangan.query.get(reading_data['timbangan_id'])
    if not timbangan:
        return {'status': 'error', 'message': f'Timbangan dengan ID {reading_data["timbangan_id"]} tidak terdaftar'}, 404
    if timbangan.tipe != 'MULTI':
        return {'status': 'error', 'message': 'Racikan pakan harus dikirim dari timbangan tipe MULTI'}, 400

    applied, error, code = _apply_scale_reading_to_batch(batch, timbangan, reading_data)
    if error:
        return error, code

    db.session.commit()
    emit_realtime_event('scale_reading_created', {
        'timbangan_id': timbangan.id,
        'timbangan_tipe': timbangan.tipe,
        'batch_id': batch.id,
        'label': applied.get('label') if applied else reading_data['label'],
        'phase': applied.get('phase') if applied else reading_data['phase'],
        'value': reading_data['value'],
        'unit': reading_data['unit'],
    })
    _emit_batch_updated('scale_reading_recorded', batch, {
        'ingredient_id': applied.get('ingredient_id') if applied else None,
    })

    return {
        'status': 'success',
        'message': 'Data racikan dari timbangan berhasil masuk ke batch',
        'data': batch.to_dict()
    }, 200


def record_scale_readings_bulk(data, user_id=None):
    """
    Terima beberapa data Timbangan 2 dalam satu request.
    Payload: { batch_id?, timbangan_id?, date?, mode?, unit?, items: [{ phase, label, value, mode? }] }
    """
    timbangan_id = data.get('timbangan_id', 2)
    items = data.get('items') or []
    batch_id = data.get('batch_id')
    if not batch_id and items:
        batch_id = items[0].get('batch_id')

    batch, error, code = _get_batch_for_scale(data.get('date'), user_id, batch_id)
    if error:
        return error, code

    timbangan = Timbangan.query.get(timbangan_id)
    if not timbangan:
        return {'status': 'error', 'message': f'Timbangan dengan ID {timbangan_id} tidak terdaftar'}, 404
    if timbangan.tipe != 'MULTI':
        return {'status': 'error', 'message': 'Racikan pakan harus dikirim dari timbangan tipe MULTI'}, 400

    applied_items = []
    try:
        for index, item in enumerate(items, start=1):
            item_data = {
                **item,
                'batch_id': item.get('batch_id') or batch_id,
                'timbangan_id': item.get('timbangan_id') or timbangan_id,
                'date': item.get('date') or data.get('date'),
                'unit': item.get('unit') or data.get('unit') or 'kg',
                'mode': item.get('mode') or data.get('mode') or 'SET',
            }

            if item_data['timbangan_id'] != timbangan_id:
                db.session.rollback()
                return {
                    'status': 'error',
                    'message': f'Item ke-{index} memakai timbangan_id berbeda dari request bulk'
                }, 400

            reading_data, error, code = _normalize_scale_reading_data(item_data)
            if error:
                db.session.rollback()
                return {
                    'status': 'error',
                    'message': f'Item ke-{index}: {error.get("message", "Data tidak valid")}',
                    'detail': error,
                }, code

            applied, error, code = _apply_scale_reading_to_batch(batch, timbangan, reading_data)
            if error:
                db.session.rollback()
                return {
                    'status': 'error',
                    'message': f'Item ke-{index}: {error.get("message", "Data tidak valid")}',
                    'detail': error,
                }, code

            applied_items.append(applied)

        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    emit_realtime_event('scale_reading_created', {
        'timbangan_id': timbangan.id,
        'timbangan_tipe': timbangan.tipe,
        'batch_id': batch.id,
        'items_count': len(applied_items),
    })
    _emit_batch_updated('scale_readings_recorded', batch, {
        'items_count': len(applied_items),
    })

    return {
        'status': 'success',
        'message': f'{len(applied_items)} data racikan dari timbangan berhasil masuk ke batch',
        'data': batch.to_dict(),
        'applied_items': applied_items,
    }, 200


def record_weight(batch_id, ingredient_id, amount, user_id=None, timbangan_id=2):
    batch = FeedingBatch.query.get(batch_id)
    if not batch:
        return {'status': 'error', 'message': 'Batch racikan tidak ditemukan'}, 404
    if batch.status != 'PREPARING':
        return {'status': 'error', 'message': 'Batch racikan sudah tidak bisa diubah'}, 400

    ingredient = FeedingBatchIngredient.query.filter_by(id=ingredient_id, batch_id=batch_id).first()
    if not ingredient:
        return {'status': 'error', 'message': 'Bahan racikan tidak ditemukan'}, 404

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {'status': 'error', 'message': 'Berat timbang harus berupa angka'}, 400

    if amount < 0:
        return {'status': 'error', 'message': 'Berat timbang tidak boleh negatif'}, 400

    ingredient.weighed_amount = round(amount, 3)
    ingredient.variance_amount = round(ingredient.weighed_amount - ingredient.planned_amount, 3)

    timbangan = Timbangan.query.get(timbangan_id)
    if timbangan:
        timbangan.status = 'ONLINE'
        reading = TimbanganReading(
            timbangan_id=timbangan.id,
            value=ingredient.weighed_amount,
            unit='kg',
            label=ingredient.feed_name,
            feed_id=ingredient.feed_id
        )
        db.session.add(reading)

    db.session.commit()
    emit_realtime_event('scale_reading_created', {
        'timbangan_id': timbangan.id if timbangan else timbangan_id,
        'timbangan_tipe': timbangan.tipe if timbangan else None,
        'batch_id': batch.id,
        'label': ingredient.feed_name,
        'phase': ingredient.phase,
        'value': ingredient.weighed_amount,
        'unit': 'kg',
    })
    _emit_batch_updated('weight_recorded', batch, {
        'ingredient_id': ingredient.id,
    })

    return {
        'status': 'success',
        'message': 'Berat bahan racikan berhasil dicatat',
        'data': batch.to_dict()
    }, 200


def finalize_batch(batch_id, user_id=None):
    batch = FeedingBatch.query.get(batch_id)
    if not batch:
        return {'status': 'error', 'message': 'Batch racikan tidak ditemukan'}, 404
    if batch.status == 'FINALIZED':
        return {'status': 'success', 'message': 'Batch racikan sudah final', 'data': batch.to_dict()}, 200
    if batch.status != 'PREPARING':
        return {'status': 'error', 'message': 'Batch racikan tidak bisa difinalisasi'}, 400

    missing = [f'{item.phase} - {item.feed_name}' for item in batch.ingredients if item.weighed_amount <= 0]
    if missing:
        return {'status': 'error', 'message': f'Bahan belum ditimbang: {", ".join(missing)}'}, 400

    out_of_tolerance = []
    for item in batch.ingredients:
        tolerance = max(0.05, item.planned_amount * (batch.tolerance_percent / 100.0))
        if abs(item.weighed_amount - item.planned_amount) > tolerance:
            out_of_tolerance.append(
                f'{item.feed_name} target {item.planned_amount:.2f} kg, timbang {item.weighed_amount:.2f} kg'
            )

    if out_of_tolerance:
        return {
            'status': 'error',
            'message': 'Hasil timbang belum sesuai toleransi: ' + '; '.join(out_of_tolerance)
        }, 400

    required_by_feed = {}
    for item in batch.ingredients:
        required_by_feed[item.feed_id] = required_by_feed.get(item.feed_id, 0.0) + item.weighed_amount

    for feed_id, required_amount in required_by_feed.items():
        feed = Feed.query.get(feed_id)
        if not feed:
            return {'status': 'error', 'message': 'Bahan pakan tidak ditemukan di inventaris'}, 404
        if feed.stock < required_amount:
            return {
                'status': 'error',
                'message': f'Stok "{feed.name}" tidak cukup. Stok {feed.stock:.1f} kg, kebutuhan {required_amount:.1f} kg'
            }, 400

    for item in batch.ingredients:
        feed = Feed.query.get(item.feed_id)
        feed.stock = round(feed.stock - item.weighed_amount, 2)
        item.deducted_amount = item.weighed_amount
        item.variance_amount = round(item.weighed_amount - item.planned_amount, 3)

        db.session.add(FeedTransaction(
            feed_id=feed.id,
            type='OUT',
            amount=item.weighed_amount,
            description=f'Finalisasi racikan pakan {batch.id} - {item.phase}',
            user_id=user_id
        ))

    batch.status = 'FINALIZED'
    batch.keeper_id = user_id or batch.keeper_id
    batch.finalized_at = datetime.utcnow()

    db.session.commit()
    create_log("SISTEM", f"Finalisasi racikan pakan {batch.id}. Stok dipotong sesuai hasil Timbangan 2.", user_id)
    _emit_batch_updated('finalized', batch)
    _emit_batch_stock_updated('batch_finalized', batch)

    return {
        'status': 'success',
        'message': 'Racikan final. Stok pakan berhasil dipotong.',
        'data': batch.to_dict()
    }, 200


def cancel_batch(batch_id, user_id=None):
    batch = FeedingBatch.query.get(batch_id)
    if not batch:
        return {'status': 'error', 'message': 'Batch racikan tidak ditemukan'}, 404

    # If the batch was finalized, we reverse the stock deductions and transactions
    if batch.status == 'FINALIZED':
        for item in batch.ingredients:
            if item.deducted_amount and item.deducted_amount > 0:
                feed = Feed.query.get(item.feed_id)
                if feed:
                    feed.stock = round(feed.stock + item.deducted_amount, 2)
                item.deducted_amount = 0.0
        
        # Delete related FeedTransactions
        desc_pattern = f"Finalisasi racikan pakan {batch.id}%"
        FeedTransaction.query.filter(
            FeedTransaction.feed_id.in_([item.feed_id for item in batch.ingredients]),
            FeedTransaction.type == 'OUT',
            FeedTransaction.description.like(desc_pattern)
        ).delete(synchronize_session=False)

    batch.status = 'CANCELLED'
    db.session.commit()
    create_log("SISTEM", f"Membatalkan batch racikan pakan {batch.id} (pembalikan stok dilakukan jika sebelumnya FINAL).", user_id)
    _emit_batch_updated('cancelled', batch)
    _emit_batch_stock_updated('batch_cancelled', batch)

    return {
        'status': 'success',
        'message': 'Batch racikan dibatalkan',
        'data': batch.to_dict()
    }, 200


def has_finalized_batch(date_str, task_id=None, task_execution_id=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return False

    resolved_task_id, resolved_execution_id, error, _ = _resolve_task_scope(batch_date, task_id, task_execution_id)
    if error:
        return False

    query = FeedingBatch.query.filter_by(
        batch_date=batch_date,
        status='FINALIZED'
    )
    if _apply_task_scope(query, resolved_task_id, resolved_execution_id).first() is not None:
        return True

    if resolved_execution_id:
        return False

    if resolved_task_id:
        return query.filter(
            FeedingBatch.task_id.is_(None),
            FeedingBatch.task_execution_id.is_(None)
        ).first() is not None

    return False
