# app/service/catalog_service.py
from app.utils.db import db
from app.models.catalog import Catalog
from app.service.activity_service import create_log
from app.utils.uploads import save_base64_image_if_needed

def get_all_catalog():
    items = Catalog.query.all()
    return {
        'status': 'success',
        'data': [item.to_dict() for item in items]
    }, 200

def save_catalog(catalog_id, data):
    nama = data.get('nama', '').strip()
    deskripsi = data.get('deskripsi', '').strip()
    harga = int(data.get('harga', 0))
    stok = int(data.get('stok', 0))
    satuan = data.get('satuan', 'Ekor').strip()
    tag = data.get('tag', 'NEW').strip()
    try:
        img = save_base64_image_if_needed(data.get('img', ''), 'catalogs')
    except ValueError as exc:
        return {'status': 'error', 'message': str(exc)}, 400

    if not nama or not deskripsi or harga <= 0 or stok < 0:
        return {'status': 'error', 'message': 'Mohon lengkapi formulir dengan data yang valid'}, 400

    if catalog_id:
        # Edit mode
        item = Catalog.query.get(catalog_id)
        if not item:
            return {'status': 'error', 'message': 'Produk katalog tidak ditemukan'}, 404

        item.name = nama
        item.description = deskripsi
        item.price = harga
        item.stock = stok
        item.unit = satuan
        item.tag = tag
        item.image_url = img

        db.session.commit()
        create_log("SISTEM", f"Memperbarui katalog produk: \"{item.name}\".", data.get('user_id'))
        
        return {
            'status': 'success',
            'message': 'Produk katalog berhasil diperbarui',
            'data': item.to_dict()
        }, 200
    else:
        # Create mode
        new_item = Catalog(
            name=nama,
            description=deskripsi,
            price=harga,
            stock=stok,
            unit=satuan,
            tag=tag,
            image_url=img
        )
        db.session.add(new_item)
        db.session.commit()

        create_log("SISTEM", f"Menambahkan produk baru ke katalog: \"{new_item.name}\".", data.get('user_id'))

        return {
            'status': 'success',
            'message': 'Produk katalog berhasil ditambahkan',
            'data': new_item.to_dict()
        }, 201

def delete_catalog(catalog_id, user_id=None):
    item = Catalog.query.get(catalog_id)
    if not item:
        return {'status': 'error', 'message': 'Produk katalog tidak ditemukan'}, 404

    name = item.name
    db.session.delete(item)
    db.session.commit()
    create_log("SISTEM", f"Menghapus produk \"{name}\" dari katalog.", user_id)
    
    return {
        'status': 'success',
        'message': f'Produk "{name}" berhasil dihapus dari katalog'
    }, 200
