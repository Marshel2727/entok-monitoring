"""Harden IoT batch delivery and device credentials

Revision ID: f7b9c2d4e611
Revises: d6a71b8c9e20
Create Date: 2026-07-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = 'f7b9c2d4e611'
down_revision = 'd6a71b8c9e20'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == 'mysql':
        op.execute(
            "ALTER TABLE feeding_batches "
            "MODIFY status ENUM('PREPARING','WEIGHING','READY_TO_FINALIZE','FINALIZED','CANCELLED') "
            "NOT NULL DEFAULT 'PREPARING'"
        )

    with op.batch_alter_table('timbangan', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_seen_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('firmware_version', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('last_ip', sa.String(length=45), nullable=True))
        batch_op.add_column(sa.Column('device_key_hash', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('device_key_prefix', sa.String(length=16), nullable=True))
        batch_op.add_column(sa.Column('device_key_revoked_at', sa.DateTime(), nullable=True))
        batch_op.create_index('ix_timbangan_last_seen_at', ['last_seen_at'], unique=False)

    op.create_table(
        'timbangan_requests',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('timbangan_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.String(length=50), nullable=False),
        sa.Column('request_id', sa.String(length=100), nullable=False),
        sa.Column('payload_hash', sa.String(length=64), nullable=False),
        sa.Column('batch_id', sa.String(length=50), nullable=True),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('response_payload', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['batch_id'], ['feeding_batches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['timbangan_id'], ['timbangan.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('timbangan_id', 'endpoint', 'request_id', name='uq_timbangan_request'),
    )
    op.create_index('ix_timbangan_requests_timbangan_id', 'timbangan_requests', ['timbangan_id'], unique=False)
    op.create_index('ix_timbangan_requests_batch_id', 'timbangan_requests', ['batch_id'], unique=False)


def downgrade():
    op.drop_index('ix_timbangan_requests_batch_id', table_name='timbangan_requests')
    op.drop_index('ix_timbangan_requests_timbangan_id', table_name='timbangan_requests')
    op.drop_table('timbangan_requests')

    with op.batch_alter_table('timbangan', schema=None) as batch_op:
        batch_op.drop_index('ix_timbangan_last_seen_at')
        batch_op.drop_column('device_key_revoked_at')
        batch_op.drop_column('device_key_prefix')
        batch_op.drop_column('device_key_hash')
        batch_op.drop_column('last_ip')
        batch_op.drop_column('firmware_version')
        batch_op.drop_column('last_seen_at')

    bind = op.get_bind()
    if bind.dialect.name == 'mysql':
        op.execute("UPDATE feeding_batches SET status='PREPARING' WHERE status='WEIGHING'")
        op.execute(
            "ALTER TABLE feeding_batches "
            "MODIFY status ENUM('PREPARING','READY_TO_FINALIZE','FINALIZED','CANCELLED') "
            "NOT NULL DEFAULT 'PREPARING'"
        )
