"""Add feeding batches

Revision ID: b7f3c2d1a904
Revises: 8a2c9d4f1b73
Create Date: 2026-06-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'b7f3c2d1a904'
down_revision = '8a2c9d4f1b73'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'feeding_batches',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('batch_date', sa.Date(), nullable=False),
        sa.Column('keeper_id', sa.String(length=50), nullable=True),
        sa.Column(
            'status',
            sa.Enum('PREPARING', 'FINALIZED', 'CANCELLED', name='feeding_batch_status'),
            nullable=False
        ),
        sa.Column('tolerance_percent', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('finalized_at', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['keeper_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feeding_batches_batch_date'), 'feeding_batches', ['batch_date'], unique=False)

    op.create_table(
        'feeding_batch_ingredients',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('batch_id', sa.String(length=50), nullable=False),
        sa.Column('feed_id', sa.String(length=50), nullable=True),
        sa.Column('feed_name', sa.String(length=100), nullable=False),
        sa.Column('planned_amount', sa.Float(), nullable=False),
        sa.Column('weighed_amount', sa.Float(), nullable=False),
        sa.Column('deducted_amount', sa.Float(), nullable=False),
        sa.Column('variance_amount', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(['batch_id'], ['feeding_batches.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['feed_id'], ['feeds.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_feeding_batch_ingredients_batch_id'), 'feeding_batch_ingredients', ['batch_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_feeding_batch_ingredients_batch_id'), table_name='feeding_batch_ingredients')
    op.drop_table('feeding_batch_ingredients')
    op.drop_index(op.f('ix_feeding_batches_batch_date'), table_name='feeding_batches')
    op.drop_table('feeding_batches')
