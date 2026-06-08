# app/service/population_service.py
from app.utils.db import db
from app.models.population import Population, PopulationLog
from app.service.activity_service import create_log

def get_current_populations():
    populations = Population.query.all()
    # Default phases fallback list if db is empty
    phases_default = [
        "Starter (1-14 Hari)",
        "Grower 1 (15-35 Hari)",
        "Grower 2 (36-60 Hari)",
        "Finisher (>60 Hari)"
    ]
    
    if not populations:
        # Auto seed default populations to prevent empty tables
        for phase in phases_default:
            p = Population(phase=phase, total_ducks=0)
            db.session.add(p)
        db.session.commit()
        populations = Population.query.all()
        
    return {
        'status': 'success',
        'data': {p.phase: p.total_ducks for p in populations}
    }, 200

def update_population(phase, new_value, user_id=None):
    if new_value < 0:
        return {'status': 'error', 'message': 'Jumlah populasi bebek tidak boleh negatif'}, 400

    pop = Population.query.filter_by(phase=phase).first()
    if not pop:
        # Create new phase record if not found
        pop = Population(phase=phase, total_ducks=0)
        db.session.add(pop)
        db.session.commit()

    old_value = pop.total_ducks
    if old_value == new_value:
        return {
            'status': 'success',
            'message': 'Jumlah populasi tidak berubah',
            'data': {pop.phase: pop.total_ducks}
        }, 200

    # Calculate difference
    diff = new_value - old_value
    sign = "+" if diff >= 0 else ""
    difference_str = f"{sign}{diff} ekor"

    # Update population
    pop.total_ducks = new_value
    
    # Write change log
    history_log = PopulationLog(
        phase=phase,
        old_value=old_value,
        new_value=new_value,
        difference=difference_str
    )
    db.session.add(history_log)
    db.session.commit()

    # Write system activity audit log
    create_log("SISTEM", f"Populasi fase \"{phase}\" diperbarui: {old_value} -> {new_value} ekor ({sign}{diff}).", user_id)

    return {
        'status': 'success',
        'message': f'Berhasil memperbarui populasi fase [{phase}] menjadi {new_value} ekor!',
        'data': {
            'phase': phase,
            'total_ducks': new_value,
            'log': history_log.to_dict()
        }
    }, 200

def get_population_logs():
    logs = PopulationLog.query.order_by(PopulationLog.logged_at.desc()).all()
    return {
        'status': 'success',
        'data': [log.to_dict() for log in logs]
    }, 200

def delete_population_log(log_id):
    log = PopulationLog.query.get(log_id)
    if not log:
        return {'status': 'error', 'message': 'Log riwayat populasi tidak ditemukan'}, 404
        
    db.session.delete(log)
    db.session.commit()
    return {
        'status': 'success',
        'message': 'Log riwayat populasi berhasil dihapus'
    }, 200
