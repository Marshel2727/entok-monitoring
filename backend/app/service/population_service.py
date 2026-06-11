# app/service/population_service.py
from app.utils.db import db
from app.models.population import Population, PopulationLog
from app.models.growth_phase import GrowthPhase
from app.service.activity_service import create_log
from app.service.growth_phase_service import ensure_default_growth_phases, get_or_create_growth_phase

def get_current_populations():
    ensure_default_growth_phases()

    phases = GrowthPhase.query.order_by(GrowthPhase.sort_order.asc(), GrowthPhase.name.asc()).all()
    for phase in phases:
        pop = Population.query.filter_by(phase_id=phase.id).first()
        if not pop:
            legacy_pop = Population.query.filter_by(phase=phase.name).first()
            if legacy_pop:
                legacy_pop.phase_id = phase.id
                legacy_pop.phase = phase.name
            else:
                db.session.add(Population(phase_id=phase.id, phase=phase.name, total_ducks=0))

    db.session.commit()
    populations = Population.query.outerjoin(GrowthPhase, Population.phase_id == GrowthPhase.id).order_by(
        GrowthPhase.sort_order.asc(),
        Population.phase.asc()
    ).all()
        
    return {
        'status': 'success',
        'data': {(p.growth_phase.name if p.growth_phase else p.phase): p.total_ducks for p in populations}
    }, 200

def update_population(phase, new_value, user_id=None):
    if new_value < 0:
        return {'status': 'error', 'message': 'Jumlah populasi bebek tidak boleh negatif'}, 400

    growth_phase = get_or_create_growth_phase(phase)
    pop = Population.query.filter_by(phase_id=growth_phase.id).first()
    if not pop:
        pop = Population.query.filter_by(phase=phase).first()

    if not pop:
        # Create new phase record if not found
        pop = Population(phase_id=growth_phase.id, phase=growth_phase.name, total_ducks=0)
        db.session.add(pop)
        db.session.commit()
    else:
        pop.phase_id = growth_phase.id
        pop.phase = growth_phase.name

    old_value = pop.total_ducks
    if old_value == new_value:
        return {
            'status': 'success',
            'message': 'Jumlah populasi tidak berubah',
            'data': {(pop.growth_phase.name if pop.growth_phase else pop.phase): pop.total_ducks}
        }, 200

    # Calculate difference
    diff = new_value - old_value
    sign = "+" if diff >= 0 else ""
    difference_str = f"{sign}{diff} ekor"

    # Update population
    pop.total_ducks = new_value
    
    # Write change log
    history_log = PopulationLog(
        phase_id=growth_phase.id,
        phase=growth_phase.name,
        old_value=old_value,
        new_value=new_value,
        difference=difference_str
    )
    db.session.add(history_log)
    db.session.commit()

    # Write system activity audit log
    create_log("SISTEM", f"Populasi fase \"{growth_phase.name}\" diperbarui: {old_value} -> {new_value} ekor ({sign}{diff}).", user_id)

    return {
        'status': 'success',
        'message': f'Berhasil memperbarui populasi fase [{growth_phase.name}] menjadi {new_value} ekor!',
        'data': {
            'phase_id': growth_phase.id,
            'phase': growth_phase.name,
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
