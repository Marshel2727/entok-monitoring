from datetime import date

import pytest

from app import create_app
from app.config import Config
from app.models.feed import Feed
from app.models.formulation import Formulation
from app.models.growth_phase import GrowthPhase
from app.models.population import Population
from app.models.task import Task, TaskExecution
from app.models.timbangan import Timbangan
from app.models.user import User
from app.utils.db import db


class TestConfig(Config):
    TESTING = True
    IS_PRODUCTION = False
    SECRET_KEY = 'test-secret'
    JWT_SECRET_KEY = 'test-jwt-secret'
    SQLALCHEMY_DATABASE_URI = 'sqlite://'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_URL = 'http://localhost:3000'
    ALLOW_LEGACY_DEVICE_KEY = True
    IOT_DEVICE_API_KEY = 'test-device-key'


@pytest.fixture()
def app():
    application = create_app(TestConfig)
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def seeded_batch_context(app):
    keeper = User(name='Joko', username='joko-test', role='PENJAGA', status='AKTIF')
    keeper.set_password('joko123')
    phase = GrowthPhase(
        name='Starter (1-14 Hari)',
        phase_key='starter',
        min_age_days=1,
        max_age_days=14,
        sort_order=10,
    )
    feed = Feed(name='Dedak', category='Protein', stock=10.0, min_threshold=1.0)
    task = Task(
        title='Beri Pakan Pagi',
        schedule_time='07:00',
        description='Berikan racikan sesuai target.',
    )
    db.session.add_all([keeper, phase, feed, task])
    db.session.flush()

    population = Population(
        phase_id=phase.id,
        phase=phase.name,
        total_ducks=10,
    )
    formulation = Formulation(
        phase_id=phase.id,
        phase=phase.name,
        target_consumption=100.0,
        category='Utama',
        composition={'Dedak': 100},
        alternative_feeds=[],
    )
    execution = TaskExecution(
        task_id=task.id,
        keeper_id=keeper.id,
        execution_date=date.today(),
        is_completed=False,
    )
    scale = Timbangan(
        id=2,
        nama='Timbangan 2',
        tipe='MULTI',
        status='OFFLINE',
    )
    db.session.add_all([population, formulation, execution, scale])
    db.session.commit()

    return {
        'keeper': keeper,
        'phase': phase,
        'feed': feed,
        'task': task,
        'execution': execution,
        'scale': scale,
        'date': date.today().isoformat(),
    }
