"""Add nutrition fields to feeds

Revision ID: 8a2c9d4f1b73
Revises: 39d72db892ce
Create Date: 2026-06-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '8a2c9d4f1b73'
down_revision = '39d72db892ce'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('feeds', schema=None) as batch_op:
        batch_op.add_column(sa.Column('protein', sa.Float(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('carbohydrate', sa.Float(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('fat', sa.Float(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('fiber', sa.Float(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('mineral', sa.Float(), nullable=False, server_default='0'))

    with op.batch_alter_table('feeds', schema=None) as batch_op:
        batch_op.alter_column('protein', server_default=None)
        batch_op.alter_column('carbohydrate', server_default=None)
        batch_op.alter_column('fat', server_default=None)
        batch_op.alter_column('fiber', server_default=None)
        batch_op.alter_column('mineral', server_default=None)


def downgrade():
    with op.batch_alter_table('feeds', schema=None) as batch_op:
        batch_op.drop_column('mineral')
        batch_op.drop_column('fiber')
        batch_op.drop_column('fat')
        batch_op.drop_column('carbohydrate')
        batch_op.drop_column('protein')
