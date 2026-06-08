"""Add phase details to feeding batch items

Revision ID: c1a5e9d2f804
Revises: b7f3c2d1a904
Create Date: 2026-06-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'c1a5e9d2f804'
down_revision = 'b7f3c2d1a904'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('feeding_batch_ingredients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('phase', sa.String(length=100), nullable=False, server_default='Gabungan'))
        batch_op.add_column(sa.Column('population_count', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('target_consumption', sa.Float(), nullable=False, server_default='0'))

    with op.batch_alter_table('feeding_batch_ingredients', schema=None) as batch_op:
        batch_op.alter_column('phase', server_default=None)
        batch_op.alter_column('population_count', server_default=None)
        batch_op.alter_column('target_consumption', server_default=None)


def downgrade():
    with op.batch_alter_table('feeding_batch_ingredients', schema=None) as batch_op:
        batch_op.drop_column('target_consumption')
        batch_op.drop_column('population_count')
        batch_op.drop_column('phase')
