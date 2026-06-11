"""Add growth phases master table

Revision ID: d4e7a9b2c601
Revises: c1a5e9d2f804
Create Date: 2026-06-08 00:00:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa


revision = 'd4e7a9b2c601'
down_revision = 'c1a5e9d2f804'
branch_labels = None
depends_on = None


DEFAULT_PHASES = (
    ('Starter (1-14 Hari)', 'starter', 1, 14, 10),
    ('Grower 1 (15-35 Hari)', 'grower 1', 15, 35, 20),
    ('Grower 2 (36-60 Hari)', 'grower 2', 36, 60, 30),
    ('Finisher (>60 Hari)', 'finisher', 61, None, 40),
)


TABLES_WITH_PHASE = (
    'formulations',
    'populations',
    'population_logs',
    'feeding_batch_ingredients',
)


def _phase_key(phase):
    phase_lower = (phase or '').strip().lower()
    if 'starter' in phase_lower:
        return 'starter'
    if 'grower 1' in phase_lower or 'grower1' in phase_lower:
        return 'grower 1'
    if 'grower 2' in phase_lower or 'grower2' in phase_lower:
        return 'grower 2'
    if 'finisher' in phase_lower:
        return 'finisher'
    return phase_lower


def _ensure_phase(conn, name, phase_key=None, min_age_days=None, max_age_days=None, sort_order=0):
    key = phase_key or _phase_key(name)
    existing = conn.execute(
        sa.text('SELECT id FROM growth_phases WHERE phase_key = :key OR name = :name LIMIT 1'),
        {'key': key, 'name': name}
    ).fetchone()
    if existing:
        return existing[0]

    phase_id = str(uuid.uuid4())
    conn.execute(
        sa.text(
            '''
            INSERT INTO growth_phases
                (id, name, phase_key, min_age_days, max_age_days, sort_order, created_at, updated_at)
            VALUES
                (:id, :name, :phase_key, :min_age_days, :max_age_days, :sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            '''
        ),
        {
            'id': phase_id,
            'name': name,
            'phase_key': key,
            'min_age_days': min_age_days,
            'max_age_days': max_age_days,
            'sort_order': sort_order,
        }
    )
    return phase_id


def upgrade():
    op.create_table(
        'growth_phases',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('phase_key', sa.String(length=50), nullable=False),
        sa.Column('min_age_days', sa.Integer(), nullable=True),
        sa.Column('max_age_days', sa.Integer(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_growth_phases_name'),
        sa.UniqueConstraint('phase_key', name='uq_growth_phases_phase_key'),
    )
    op.create_index('ix_growth_phases_phase_key', 'growth_phases', ['phase_key'], unique=False)

    for table_name in TABLES_WITH_PHASE:
        with op.batch_alter_table(table_name, schema=None) as batch_op:
            batch_op.add_column(sa.Column('phase_id', sa.String(length=50), nullable=True))

    conn = op.get_bind()
    for name, phase_key, min_age_days, max_age_days, sort_order in DEFAULT_PHASES:
        _ensure_phase(conn, name, phase_key, min_age_days, max_age_days, sort_order)

    for table_name in TABLES_WITH_PHASE:
        rows = conn.execute(
            sa.text(f"SELECT DISTINCT phase FROM {table_name} WHERE phase IS NOT NULL AND phase != ''")
        ).fetchall()

        for row in rows:
            phase_name = row[0]
            phase_id = _ensure_phase(conn, phase_name)
            conn.execute(
                sa.text(f"UPDATE {table_name} SET phase_id = :phase_id WHERE phase = :phase"),
                {'phase_id': phase_id, 'phase': phase_name}
            )

    with op.batch_alter_table('formulations', schema=None) as batch_op:
        batch_op.create_index('ix_formulations_phase_id', ['phase_id'], unique=False)
        batch_op.create_foreign_key('fk_formulations_phase_id_growth_phases', 'growth_phases', ['phase_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('populations', schema=None) as batch_op:
        batch_op.create_index('ix_populations_phase_id', ['phase_id'], unique=True)
        batch_op.create_foreign_key('fk_populations_phase_id_growth_phases', 'growth_phases', ['phase_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('population_logs', schema=None) as batch_op:
        batch_op.create_index('ix_population_logs_phase_id', ['phase_id'], unique=False)
        batch_op.create_foreign_key('fk_population_logs_phase_id_growth_phases', 'growth_phases', ['phase_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('feeding_batch_ingredients', schema=None) as batch_op:
        batch_op.create_index('ix_feeding_batch_ingredients_phase_id', ['phase_id'], unique=False)
        batch_op.create_foreign_key('fk_feeding_batch_ingredients_phase_id_growth_phases', 'growth_phases', ['phase_id'], ['id'], ondelete='SET NULL')


def downgrade():
    with op.batch_alter_table('feeding_batch_ingredients', schema=None) as batch_op:
        batch_op.drop_constraint('fk_feeding_batch_ingredients_phase_id_growth_phases', type_='foreignkey')
        batch_op.drop_index('ix_feeding_batch_ingredients_phase_id')
        batch_op.drop_column('phase_id')

    with op.batch_alter_table('population_logs', schema=None) as batch_op:
        batch_op.drop_constraint('fk_population_logs_phase_id_growth_phases', type_='foreignkey')
        batch_op.drop_index('ix_population_logs_phase_id')
        batch_op.drop_column('phase_id')

    with op.batch_alter_table('populations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_populations_phase_id_growth_phases', type_='foreignkey')
        batch_op.drop_index('ix_populations_phase_id')
        batch_op.drop_column('phase_id')

    with op.batch_alter_table('formulations', schema=None) as batch_op:
        batch_op.drop_constraint('fk_formulations_phase_id_growth_phases', type_='foreignkey')
        batch_op.drop_index('ix_formulations_phase_id')
        batch_op.drop_column('phase_id')

    op.drop_index('ix_growth_phases_phase_key', table_name='growth_phases')
    op.drop_table('growth_phases')
