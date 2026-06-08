# app/service/formulation_service.py
from app.utils.db import db
from app.models.formulation import Formulation
from app.service.activity_service import create_log

def get_all_formulations():
    formulations = Formulation.query.all()
    return {
        'status': 'success',
        'data': [form.to_dict() for form in formulations]
    }, 200

def get_formulation_by_id(form_id):
    form = Formulation.query.get(form_id)
    if not form:
        return {'status': 'error', 'message': 'Formulasi tidak ditemukan'}, 404
    return {
        'status': 'success',
        'data': form.to_dict()
    }, 200

def save_formulation(form_id, data):
    fase = data.get('fase', '').strip()
    target_konsumsi = float(data.get('targetKonsumsi', 0.0))
    kategori = data.get('kategori', '').strip()
    komposisi = data.get('komposisi', {})  # Dict {"Dedak": 40.0, "Jagung": 60.0}
    pakan_alternatif = data.get('pakanAlternatif', ["-"])

    if not fase or not kategori:
        return {'status': 'error', 'message': 'Fase usia dan kategori wajib diisi'}, 400

    # Validate composition total percentage equals 100%
    total_pct = sum(float(val) for val in komposisi.values())
    if abs(total_pct - 100.0) > 0.01:
        return {
            'status': 'error', 
            'message': f'Total persentase komposisi wajib 100%. Saat ini: {total_pct}%'
        }, 400

    if form_id:
        # Edit mode
        form = Formulation.query.get(form_id)
        if not form:
            return {'status': 'error', 'message': 'Formulasi tidak ditemukan'}, 404

        # Check phase uniqueness if changed
        existing = Formulation.query.filter_by(phase=fase).first()
        if existing and existing.id != form_id:
            return {'status': 'error', 'message': f'Formulasi untuk fase "{fase}" sudah terdaftar'}, 400

        form.phase = fase
        form.target_consumption = target_konsumsi
        form.category = kategori
        form.composition = komposisi
        form.alternative_feeds = pakan_alternatif

        db.session.commit()
        create_log("FORMULASI", f"Memperbarui formulasi pakan fase \"{form.phase}\". Target konsumsi: {form.target_consumption:.0f} gr.", data.get('user_id'))
        
        return {
            'status': 'success',
            'message': 'Formulasi berhasil diperbarui',
            'data': form.to_dict()
        }, 200
    else:
        # Create mode
        existing = Formulation.query.filter_by(phase=fase).first()
        if existing:
            return {'status': 'error', 'message': f'Formulasi untuk fase "{fase}" sudah terdaftar'}, 400

        new_form = Formulation(
            phase=fase,
            target_consumption=target_konsumsi,
            category=kategori,
            composition=komposisi,
            alternative_feeds=pakan_alternatif
        )
        db.session.add(new_form)
        db.session.commit()

        create_log("FORMULASI", f"Membuat formulasi pakan baru fase \"{new_form.phase}\". Target konsumsi: {new_form.target_consumption:.0f} gr.", data.get('user_id'))

        return {
            'status': 'success',
            'message': 'Formulasi berhasil ditambahkan',
            'data': new_form.to_dict()
        }, 201

def delete_formulation(form_id, user_id=None):
    form = Formulation.query.get(form_id)
    if not form:
        return {'status': 'error', 'message': 'Formulasi tidak ditemukan'}, 404

    fase = form.phase
    db.session.delete(form)
    db.session.commit()
    create_log("FORMULASI", f"Menghapus formulasi pakan fase \"{fase}\".", user_id)
    
    return {
        'status': 'success',
        'message': f'Formulasi fase "{fase}" berhasil dihapus'
    }, 200
