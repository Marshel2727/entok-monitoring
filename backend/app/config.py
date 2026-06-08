# app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key-1234')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-jwt-secret-key-5678')
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
