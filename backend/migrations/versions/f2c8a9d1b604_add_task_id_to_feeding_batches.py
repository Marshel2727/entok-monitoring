"""Add task id to feeding batches

Revision ID: f2c8a9d1b604
Revises: e8b1f4a3d902
Create Date: 2026-06-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'f2c8a9d1b604'
down_revision = 'e8b1f4a3d902'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('feeding_batches', schema=None) as batch_op:
        batch_op.add_column(sa.Column('task_id', sa.String(length=50), nullable=True))
        batch_op.create_index('ix_feeding_batches_task_id', ['task_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_feeding_batches_task_id_tasks',
            'tasks',
            ['task_id'],
            ['id'],
            ondelete='SET NULL'
        )


def downgrade():
    with op.batch_alter_table('feeding_batches', schema=None) as batch_op:
        batch_op.drop_constraint('fk_feeding_batches_task_id_tasks', type_='foreignkey')
        batch_op.drop_index('ix_feeding_batches_task_id')
        batch_op.drop_column('task_id')
