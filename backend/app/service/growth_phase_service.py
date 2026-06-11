from app.utils.db import db
from app.models.growth_phase import GrowthPhase, DEFAULT_GROWTH_PHASES, normalize_phase_key
from sqlalchemy import or_


def ensure_default_growth_phases():
    for item in DEFAULT_GROWTH_PHASES:
        phase = GrowthPhase.query.filter_by(phase_key=item['phase_key']).first()
        if phase:
            continue

        db.session.add(GrowthPhase(
            name=item['name'],
            phase_key=item['phase_key'],
            min_age_days=item['min_age_days'],
            max_age_days=item['max_age_days'],
            sort_order=item['sort_order'],
        ))

    db.session.flush()


def get_or_create_growth_phase(phase_name):
    normalized = (phase_name or '').strip()
    if not normalized:
        return None

    key = normalize_phase_key(normalized)
    phase = GrowthPhase.query.filter(
        or_(
            GrowthPhase.phase_key == key,
            db.func.lower(GrowthPhase.name) == normalized.lower()
        )
    ).first()
    if phase:
        return phase

    next_order = (GrowthPhase.query.count() + 1) * 10
    phase = GrowthPhase(
        name=normalized,
        phase_key=key,
        sort_order=next_order,
    )
    db.session.add(phase)
    db.session.flush()
    return phase
