#!/bin/sh
set -e

python - <<'PY'
import os
import time
import pymysql

host = os.getenv("DB_HOST", "database")
port = int(os.getenv("DB_PORT", "3306"))
user = os.getenv("DB_USER", "entok_user")
password = os.getenv("DB_PASSWORD", "entok_password")
database = os.getenv("DB_NAME", "entok_db")

for attempt in range(1, 31):
    try:
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            connect_timeout=5,
        )
        connection.close()
        break
    except Exception as exc:
        if attempt == 30:
            raise
        print(f"Waiting for MySQL ({attempt}/30): {exc}")
        time.sleep(2)
PY

flask --app main db upgrade

exec "$@"
