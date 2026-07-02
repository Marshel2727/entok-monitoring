"""Add ready-to-finalize feeding batch status

Revision ID: d6a71b8c9e20
Revises: 9c1f7a2b4d30
Create Date: 2026-06-30 00:00:00.000000

"""
from alembic import op


revision = 'd6a71b8c9e20'
down_revision = '9c1f7a2b4d30'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'mysql':
        op.execute(
            "ALTER TABLE feeding_batches "
            "MODIFY status ENUM('PREPARING','READY_TO_FINALIZE','FINALIZED','CANCELLED') "
            "NOT NULL DEFAULT 'PREPARING'"
        )


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'mysql':
        op.execute("UPDATE feeding_batches SET status='PREPARING' WHERE status='READY_TO_FINALIZE'")
        op.execute(
            "ALTER TABLE feeding_batches "
            "MODIFY status ENUM('PREPARING','FINALIZED','CANCELLED') "
            "NOT NULL DEFAULT 'PREPARING'"
        )
