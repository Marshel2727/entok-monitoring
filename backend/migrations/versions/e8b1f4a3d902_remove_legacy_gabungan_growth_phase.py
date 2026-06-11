"""Remove legacy Gabungan from growth phases

Revision ID: e8b1f4a3d902
Revises: d4e7a9b2c601
Create Date: 2026-06-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'e8b1f4a3d902'
down_revision = 'd4e7a9b2c601'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    legacy = conn.execute(
        sa.text("SELECT id FROM growth_phases WHERE phase_key = 'gabungan' OR name = 'Gabungan' LIMIT 1")
    ).fetchone()
    if not legacy:
        return

    legacy_id = legacy[0]
    for table_name in ('formulations', 'populations', 'population_logs', 'feeding_batch_ingredients'):
        conn.execute(
            sa.text(f"UPDATE {table_name} SET phase_id = NULL WHERE phase_id = :phase_id"),
            {'phase_id': legacy_id}
        )

    conn.execute(sa.text("DELETE FROM growth_phases WHERE id = :phase_id"), {'phase_id': legacy_id})


def downgrade():
    # The legacy "Gabungan" value was not a real growth phase, so downgrade does not restore it.
    pass
