# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()


def _as_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


class Config:
    APP_ENV = os.getenv('APP_ENV', os.getenv('FLASK_ENV', 'development')).strip().lower()
    IS_PRODUCTION = APP_ENV in ('production', 'prod')
    SECRET_KEY = os.getenv('SECRET_KEY') or (None if IS_PRODUCTION else 'entok-dev-secret')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY') or (None if IS_PRODUCTION else 'entok-dev-jwt-secret')
    IOT_DEVICE_API_KEY = os.getenv('IOT_DEVICE_API_KEY', '')
    ALLOW_LEGACY_DEVICE_KEY = _as_bool(os.getenv('ALLOW_LEGACY_DEVICE_KEY'), default=not IS_PRODUCTION)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000' if not IS_PRODUCTION else '')
    FARM_TIMEZONE = os.getenv('FARM_TIMEZONE', 'Asia/Makassar')
    DEVICE_OFFLINE_SECONDS = int(os.getenv('DEVICE_OFFLINE_SECONDS', '90'))
    LOGIN_RATE_LIMIT = int(os.getenv('LOGIN_RATE_LIMIT', '10'))
    DEVICE_RATE_LIMIT = int(os.getenv('DEVICE_RATE_LIMIT', '120'))
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    SWAGGER_ENABLED = _as_bool(os.getenv('SWAGGER_ENABLED'), default=not IS_PRODUCTION)
    ALLOW_PUBLIC_REGISTRATION = _as_bool(os.getenv('ALLOW_PUBLIC_REGISTRATION'), default=not IS_PRODUCTION)
    # Constructing MySQL URI dynamically from env variables
    db_user = os.getenv('DB_USER', 'root')
    db_password = os.getenv('DB_PASSWORD', '')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '3306')
    db_name = os.getenv('DB_NAME', 'entok_db')
    
    # Build connection URI
    password_part = f":{db_password}" if db_password else ""
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{db_user}{password_part}@{db_host}:{db_port}/{db_name}"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Static folder upload configuration
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'static', 'uploads')
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB Max size

    @classmethod
    def validate(cls):
        if not cls.IS_PRODUCTION:
            return

        required = {
            'SECRET_KEY': cls.SECRET_KEY,
            'JWT_SECRET_KEY': cls.JWT_SECRET_KEY,
            'DB_PASSWORD': cls.db_password,
            'FRONTEND_URL': cls.FRONTEND_URL,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise RuntimeError(f"Konfigurasi production wajib diisi: {', '.join(missing)}")

        if cls.FRONTEND_URL.strip() == '*':
            raise RuntimeError('FRONTEND_URL tidak boleh * pada environment production')

        if cls.ALLOW_LEGACY_DEVICE_KEY and not cls.IOT_DEVICE_API_KEY:
            raise RuntimeError('IOT_DEVICE_API_KEY wajib diisi selama legacy device key masih diaktifkan')
