#!/usr/bin/env sh
set -eu

PROJECT_DIR="${PROJECT_DIR:-$HOME/entok-monitoring-git}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-entok-monitoring}"
ENV_FILE="${ENV_FILE:-}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUTPUT="$BACKUP_DIR/entok-$TIMESTAMP.sql.gz"

compose() {
  if [ -n "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
  else
    docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
  fi
}

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

compose exec -T database \
  sh -c 'exec mysqldump --single-transaction --quick --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip -9 > "$OUTPUT"

gzip -t "$OUTPUT"
find "$BACKUP_DIR" -type f -name 'entok-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "Backup selesai: $OUTPUT"
