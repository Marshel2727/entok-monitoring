"""add user profile image

Revision ID: 9c1f7a2b4d30
Revises: a3b4c5d6e7f8
Create Date: 2026-06-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '9c1f7a2b4d30'
down_revision = 'a3b4c5d6e7f8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('profile_image', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('users', 'profile_image')
