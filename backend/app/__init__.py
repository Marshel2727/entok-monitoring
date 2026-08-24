# app/__init__.py
import os

from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from flasgger import Swagger
from app.utils.db import db
from app.utils.cache import init_cache_headers
from app.config import Config
from app.realtime import init_realtime, parse_cors_origins
from app.utils.logging_config import configure_logging

migrate = Migrate()

def create_app(config_class=Config):
    if hasattr(config_class, 'validate'):
        config_class.validate()
    app = Flask(__name__)
    app.config.from_object(config_class)
    configure_logging(app)

    # Enable CORS dynamically based on FRONTEND_URL
    frontend_url = app.config.get('FRONTEND_URL', '')
    cors_origins = parse_cors_origins(frontend_url, allow_wildcard=not app.config.get('IS_PRODUCTION', False))
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    # Initialize Swagger
    if app.config.get('SWAGGER_ENABLED', False):
        Swagger(app)
    init_cache_headers(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    init_realtime(app, cors_origins)

    # Ensure uploads directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Blueprint registrations
    from app.routes.auth_routes import auth_bp
    from app.routes.feed_routes import feed_bp
    from app.routes.formulation_routes import formulation_bp
    from app.routes.population_routes import population_bp
    from app.routes.task_routes import task_bp
    from app.routes.catalog_routes import catalog_bp
    from app.routes.activity_routes import activity_bp
    from app.routes.timbangan_routes import timbangan_bp
    from app.routes.feeding_batch_routes import feeding_batch_bp
    from app.routes.system_routes import system_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(feed_bp, url_prefix='/api/feeds')
    app.register_blueprint(formulation_bp, url_prefix='/api/formulations')
    app.register_blueprint(population_bp, url_prefix='/api/populations')
    app.register_blueprint(task_bp, url_prefix='/api/tasks')
    app.register_blueprint(catalog_bp, url_prefix='/api/catalogs')
    app.register_blueprint(activity_bp, url_prefix='/api/activities')
    app.register_blueprint(timbangan_bp, url_prefix='/api/timbangan')
    app.register_blueprint(feeding_batch_bp, url_prefix='/api/feeding-batches')
    app.register_blueprint(system_bp, url_prefix='/api/system')

    # Import models to ensure they are registered with SQLAlchemy
    from app import models

    # Auto-seed default timbangan & users on first run
    with app.app_context():
        from app.service.timbangan_service import seed_default_timbangan
        from app.service.auth_service import seed_default_users
        try:
            seed_default_timbangan()
            seed_default_users()
        except Exception:
            pass  # Table may not exist yet before migration

    @app.route('/')
    def index():
        return {"status": "success", "message": "ENTOK API Backend is running"}

    return app
