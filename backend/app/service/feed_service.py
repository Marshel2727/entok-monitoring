# app/service/feed_service.py
from app.utils.db import db
from app.models.feed import Feed, FeedTransaction
from app.service.activity_service import create_log

def _to_percent(value, default=0.0):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return round(min(100.0, max(0.0, parsed)), 2)

def _get_nutrition_payload(data):
    nutrisi = data.get('nutrisi') or {}
    return {
        'protein': _to_percent(nutrisi.get('protein')),
        'carbohydrate': _to_percent(nutrisi.get('karbohidrat')),
        'fat': _to_percent(nutrisi.get('lemak')),
        'fiber': _to_percent(nutrisi.get('serat')),
        'mineral': _to_percent(nutrisi.get('mineral')),
    }

def get_all_feeds():
    feeds = Feed.query.all()
    return {
        'status': 'success',
        'data': [feed.to_dict() for feed in feeds]
    }, 200

def get_feed_by_id(feed_id):
    feed = Feed.query.get(feed_id)
    if not feed:
        return {'status': 'error', 'message': 'Bahan pakan tidak ditemukan'}, 404
    return {
        'status': 'success',
        'data': feed.to_dict()
    }, 200

def save_feed(feed_id, data):
    nama = data.get('nama', '').strip()
    kategori = data.get('kategori', '').strip()
    stok = float(data.get('stok', 0.0))
    ambang_batas = float(data.get('ambangBatas', 5.0))
    nutrition = _get_nutrition_payload(data)

    if not nama or not kategori:
        return {'status': 'error', 'message': 'Nama dan kategori wajib diisi'}, 400

    if feed_id:
        # Edit mode
        feed = Feed.query.get(feed_id)
        if not feed:
            return {'status': 'error', 'message': 'Bahan pakan tidak ditemukan'}, 404
        
        # Check if new name collides with another feed
        existing_feed = Feed.query.filter_by(name=nama).first()
        if existing_feed and existing_feed.id != feed_id:
            return {'status': 'error', 'message': f'Bahan pakan dengan nama "{nama}" sudah ada'}, 400

        old_name = feed.name
        feed.name = nama
        feed.category = kategori
        feed.min_threshold = ambang_batas
        feed.protein = nutrition['protein']
        feed.carbohydrate = nutrition['carbohydrate']
        feed.fat = nutrition['fat']
        feed.fiber = nutrition['fiber']
        feed.mineral = nutrition['mineral']
        # Note: stock is modified only via restock or deduct transactions in a strict system,
        # but if we allow manual override here:
        if 'stok' in data:
            feed.stock = stok

        db.session.commit()
        create_log("INVENTARIS", f"Mengedit bahan pakan \"{feed.name}\" ({feed.category}). Ambang batas: {feed.min_threshold} kg.", data.get('user_id'))
        
        return {
            'status': 'success',
            'message': 'Bahan pakan berhasil diperbarui',
            'data': feed.to_dict()
        }, 200
    else:
        # Create mode
        existing_feed = Feed.query.filter_by(name=nama).first()
        if existing_feed:
            return {'status': 'error', 'message': f'Bahan pakan dengan nama "{nama}" sudah terdaftar'}, 400

        new_feed = Feed(
            name=nama,
            category=kategori,
            stock=stok,
            min_threshold=ambang_batas,
            protein=nutrition['protein'],
            carbohydrate=nutrition['carbohydrate'],
            fat=nutrition['fat'],
            fiber=nutrition['fiber'],
            mineral=nutrition['mineral']
        )
        db.session.add(new_feed)
        db.session.commit()

        # Log initial stock as transaction if stock > 0
        if stok > 0:
            tx = FeedTransaction(
                feed_id=new_feed.id,
                type='IN',
                amount=stok,
                description='Inisialisasi stok awal pakan baru',
                user_id=data.get('user_id')
            )
            db.session.add(tx)
            db.session.commit()

        create_log("INVENTARIS", f"Menambahkan pakan baru: \"{new_feed.name}\" dengan kategori \"{new_feed.category}\". Stok awal: {new_feed.stock} kg.", data.get('user_id'))

        return {
            'status': 'success',
            'message': 'Bahan pakan berhasil ditambahkan',
            'data': new_feed.to_dict()
        }, 201

def delete_feed(feed_id, user_id=None):
    feed = Feed.query.get(feed_id)
    if not feed:
        return {'status': 'error', 'message': 'Bahan pakan tidak ditemukan'}, 404

    feed_name = feed.name
    db.session.delete(feed)
    db.session.commit()
    create_log("INVENTARIS", f"Menghapus pakan \"{feed_name}\" dari database.", user_id)
    
    return {
        'status': 'success',
        'message': f'Bahan pakan "{feed_name}" berhasil dihapus'
    }, 200

def restock_feed(feed_id, amount, description, user_id):
    """Adds stock to a feed ingredient and records transaction and activity logs."""
    feed = Feed.query.get(feed_id)
    if not feed:
        return {'status': 'error', 'message': 'Bahan pakan tidak ditemukan'}, 404

    if amount <= 0:
        return {'status': 'error', 'message': 'Jumlah restock harus lebih dari 0 kg'}, 400

    # Increase stock
    feed.stock = round(feed.stock + amount, 2)
    
    # Record transaction
    tx = FeedTransaction(
        feed_id=feed.id,
        type='IN',
        amount=amount,
        description=description or 'Restock pakan masuk',
        user_id=user_id
    )
    db.session.add(tx)
    db.session.commit()

    create_log("RESTOCK", f"Restock masuk {amount:.1f} kg untuk \"{feed.name}\". Sisa stok saat ini: {feed.stock:.1f} kg.", user_id)

    return {
        'status': 'success',
        'message': f'Berhasil restock {amount} kg untuk {feed.name}',
        'data': feed.to_dict()
    }, 200

def deduct_feed_stock(deductions, user_id=None):
    """
    Deducts stock for multiple feed ingredients.
    deductions: dict mapping feed name to deduction amount (kg), e.g., {"Dedak": 18.4, "Jagung": 12.0}
    """
    updated_feeds = []
    
    # Verify all feeds exist first
    for name, deduction in deductions.items():
        if deduction <= 0:
            continue
            
        feed = Feed.query.filter_by(name=name).first()
        if not feed:
            return {'status': 'error', 'message': f'Bahan pakan "{name}" tidak terdaftar di inventaris'}, 404

    # Perform deductions
    for name, deduction in deductions.items():
        if deduction <= 0:
            continue
            
        feed = Feed.query.filter_by(name=name).first()
        # Deduct stock
        feed.stock = round(max(0.0, feed.stock - deduction), 2)
        
        # Record transaction
        tx = FeedTransaction(
            feed_id=feed.id,
            type='OUT',
            amount=deduction,
            description='Potong stok otomatis oleh pakan harian',
            user_id=user_id
        )
        db.session.add(tx)
        updated_feeds.append(feed)

    db.session.commit()
    return {
        'status': 'success',
        'message': 'Stok pakan berhasil dikurangi',
        'data': [feed.to_dict() for feed in updated_feeds]
    }, 200

def get_feed_transactions(feed_id=None):
    """Gets transactions, optionally filtered by feed_id."""
    if feed_id:
        txs = FeedTransaction.query.filter_by(feed_id=feed_id).order_by(FeedTransaction.created_at.desc()).all()
    else:
        txs = FeedTransaction.query.order_by(FeedTransaction.created_at.desc()).all()
        
    return {
        'status': 'success',
        'data': [tx.to_dict() for tx in txs]
    }, 200
