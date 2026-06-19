"""Add task execution id to feeding batches

Revision ID: a3b4c5d6e7f8
Revises: f2c8a9d1b604
Create Date: 2026-06-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = 'a3b4c5d6e7f8'
down_revision = 'f2c8a9d1b604'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('feeding_batches', schema=None) as batch_op:
        batch_op.add_column(sa.Column('task_execution_id', sa.String(length=50), nullable=True))
        batch_op.create_index('ix_feeding_batches_task_execution_id', ['task_execution_id'], unique=False)
        batch_op.create_foreign_key(
            'fk_feeding_batches_task_execution_id_task_executions',
            'task_executions',
            ['task_execution_id'],
            ['id'],
            ondelete='SET NULL'
        )


def downgrade():
    with op.batch_alter_table('feeding_batches', schema=None) as batch_op:
        batch_op.drop_constraint('fk_feeding_batches_task_execution_id_task_executions', type_='foreignkey')
        batch_op.drop_index('ix_feeding_batches_task_execution_id')
        batch_op.drop_column('task_execution_id')
