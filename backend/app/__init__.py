# app/__init__.py
import os
from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
from app.utils.db import db
from app.config import Config

migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS dynamically based on FRONTEND_URL
    frontend_url = os.getenv('FRONTEND_URL', '*')
    CORS(app, resources={r"/api/*": {"origins": frontend_url}})

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)

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

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(feed_bp, url_prefix='/api/feeds')
    app.register_blueprint(formulation_bp, url_prefix='/api/formulations')
    app.register_blueprint(population_bp, url_prefix='/api/populations')
    app.register_blueprint(task_bp, url_prefix='/api/tasks')
    app.register_blueprint(catalog_bp, url_prefix='/api/catalogs')
    app.register_blueprint(activity_bp, url_prefix='/api/activities')
    app.register_blueprint(timbangan_bp, url_prefix='/api/timbangan')
    app.register_blueprint(feeding_batch_bp, url_prefix='/api/feeding-batches')

    # Import models to ensure they are registered with SQLAlchemy
    from app import models

    # Auto-seed default timbangan (3 unit) on first run
    with app.app_context():
        from app.service.timbangan_service import seed_default_timbangan
        try:
            seed_default_timbangan()
        except Exception:
            pass  # Table may not exist yet before migration

    @app.route('/')
    def index():
        return {"status": "success", "message": "ENTOK API Backend is running"}

    return app
