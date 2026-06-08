from datetime import datetime
import pytz

from app.utils.db import db
from app.models.feed import Feed, FeedTransaction
from app.models.formulation import Formulation
from app.models.population import Population
from app.models.timbangan import Timbangan, TimbanganReading
from app.models.feeding_batch import FeedingBatch, FeedingBatchIngredient
from app.service.activity_service import create_log

PHASE_ORDER = ('starter', 'grower 1', 'grower 2', 'finisher')


def _today_wita():
    return datetime.now(pytz.timezone('Asia/Makassar')).date()


def _parse_date(date_str=None):
    if not date_str:
        return _today_wita(), None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date(), None
    except ValueError:
        return None, {'status': 'error', 'message': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.'}


def _phase_population(form_phase, populations):
    form_phase_lower = form_phase.lower()
    for population in populations:
        pop_phase_lower = population.phase.lower()
        if form_phase_lower in pop_phase_lower or pop_phase_lower in form_phase_lower:
            return population.total_ducks
    return 0


def _phase_key(phase):
    phase_lower = (phase or '').strip().lower()
    if 'starter' in phase_lower:
        return 'starter'
    if 'grower 1' in phase_lower or 'grower1' in phase_lower:
        return 'grower 1'
    if 'grower 2' in phase_lower or 'grower2' in phase_lower:
        return 'grower 2'
    if 'finisher' in phase_lower:
        return 'finisher'
    return phase_lower


def _phase_rank(phase):
    key = _phase_key(phase)
    try:
        return PHASE_ORDER.index(key)
    except ValueError:
        return len(PHASE_ORDER)


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

    planned = []
    for formulation in formulations:
        population = _phase_population(formulation.phase, populations)
        if population <= 0:
            continue

        for feed_name, percentage in formulation.composition.items():
            amount = (formulation.target_consumption * population * (percentage / 100.0)) / 1000.0
            if amount <= 0:
                continue

            feed = _find_feed_by_name(feed_name)
            if not feed:
                return None, {'status': 'error', 'message': f'Bahan pakan "{feed_name}" belum terdaftar di inventaris'}, 404

            planned.append({
                'feed': feed,
                'phase': formulation.phase,
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


def _planned_signature(ingredients):
    return sorted([
        (
            _phase_key(item['phase']),
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


def get_today_batch(date_str=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return error, 400

    batch = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status.in_(('PREPARING', 'FINALIZED'))
    ).order_by(FeedingBatch.created_at.desc()).first()
    return {
        'status': 'success',
        'data': batch.to_dict() if batch else None
    }, 200


def create_batch(user_id, date_str=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return error, 400

    existing = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status.in_(('PREPARING', 'FINALIZED'))
    ).order_by(FeedingBatch.created_at.desc()).first()
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

    batch = FeedingBatch(batch_date=batch_date, keeper_id=user_id, status='PREPARING')
    db.session.add(batch)
    db.session.flush()

    _add_batch_ingredients(batch, ingredients)

    db.session.commit()
    create_log("SISTEM", f"Membuat batch racikan pakan tanggal {batch_date.isoformat()}.", user_id)

    return {
        'status': 'success',
        'message': 'Batch racikan berhasil dibuat',
        'data': batch.to_dict()
    }, 201


def _get_active_batch_for_scale(date_str, user_id=None):
    batch_date, error = _parse_date(date_str)
    if error:
        return None, error, 400

    batch = FeedingBatch.query.filter(
        FeedingBatch.batch_date == batch_date,
        FeedingBatch.status == 'PREPARING'
    ).order_by(FeedingBatch.created_at.desc()).first()

    if batch:
        response, code = create_batch(user_id, batch_date.isoformat())
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


def _find_batch_ingredient(batch, feed, label, phase=None):
    requested_phase = _phase_key(phase)
    label_lower = (label or '').strip().lower()

    candidates = []
    for item in batch.ingredients:
        same_feed = feed and item.feed_id == feed.id
        same_label = item.feed_name.strip().lower() == label_lower
        if same_feed or same_label:
            candidates.append(item)

    if phase:
        candidates = [item for item in candidates if _phase_key(item.phase) == requested_phase]

    if len(candidates) == 1:
        return candidates[0], None

    if not candidates:
        return None, 'Bahan atau fase tidak ditemukan di target batch racikan hari ini'

    phase_options = ', '.join(sorted({item.phase for item in candidates}))
    return None, f'Bahan "{label}" ada di beberapa fase. Kirim phase yang jelas: {phase_options}'


def record_scale_reading(data, user_id=None):
    """
    Terima data tombol bahan dari Timbangan 2.
    Payload: { timbangan_id, phase, label, value, mode?: SET|ADD, date? }
    """
    timbangan_id = data.get('timbangan_id', 2)
    label = (data.get('label') or data.get('feed_name') or '').strip()
    phase = (data.get('phase') or data.get('fase') or '').strip()
    value = data.get('value', data.get('amount'))
    unit = (data.get('unit') or 'kg').strip()
    mode = (data.get('mode') or 'SET').strip().upper()

    if not label:
        return {'status': 'error', 'message': 'Label bahan wajib dikirim dari timbangan'}, 400

    try:
        value = float(value)
    except (TypeError, ValueError):
        return {'status': 'error', 'message': 'Berat timbang harus berupa angka'}, 400

    if value < 0:
        return {'status': 'error', 'message': 'Berat timbang tidak boleh negatif'}, 400

    if mode not in ('SET', 'ADD'):
        return {'status': 'error', 'message': 'Mode harus SET atau ADD'}, 400

    batch, error, code = _get_active_batch_for_scale(data.get('date'), user_id)
    if error:
        return error, code

    timbangan = Timbangan.query.get(timbangan_id)
    if not timbangan:
        return {'status': 'error', 'message': f'Timbangan dengan ID {timbangan_id} tidak terdaftar'}, 404
    if timbangan.tipe != 'MULTI':
        return {'status': 'error', 'message': 'Racikan pakan harus dikirim dari timbangan tipe MULTI'}, 400

    feed = _find_feed_by_name(label)
    ingredient, ingredient_error = _find_batch_ingredient(batch, feed, label, phase)
    if ingredient_error:
        return {'status': 'error', 'message': ingredient_error}, 400

    new_amount = value if mode == 'SET' else ingredient.weighed_amount + value
    ingredient.weighed_amount = round(new_amount, 3)
    ingredient.variance_amount = round(ingredient.weighed_amount - ingredient.planned_amount, 3)

    timbangan.status = 'ONLINE'
    db.session.add(TimbanganReading(
        timbangan_id=timbangan.id,
        value=round(value, 3),
        unit=unit,
        label=f'{ingredient.phase} - {ingredient.feed_name}',
        feed_id=ingredient.feed_id
    ))

    db.session.commit()

    return {
        'status': 'success',
        'message': 'Data racikan dari timbangan berhasil masuk ke batch',
        'data': batch.to_dict()
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

    missing = [item.feed_name for item in batch.ingredients if item.weighed_amount <= 0]
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

    return {
        'status': 'success',
        'message': 'Batch racikan dibatalkan',
        'data': batch.to_dict()
    }, 200


def has_finalized_batch(date_str):
    batch_date, error = _parse_date(date_str)
    if error:
        return False

    return FeedingBatch.query.filter_by(
        batch_date=batch_date,
        status='FINALIZED'
    ).first() is not None
