#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Pemakaian: $0 /path/entok-backup.sql.gz" >&2
  exit 2
fi

PROJECT_DIR="${PROJECT_DIR:-$HOME/entok-monitoring-git}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-entok-monitoring}"
ENV_FILE="${ENV_FILE:-}"
BACKUP_FILE="$1"

compose() {
  if [ -n "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
  else
    docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" "$@"
  fi
}

if [ ! -f "$BACKUP_FILE" ]; then
  echo "File backup tidak ditemukan: $BACKUP_FILE" >&2
  exit 2
fi

gzip -t "$BACKUP_FILE"
cd "$PROJECT_DIR"

gzip -dc "$BACKUP_FILE" \
  | compose exec -T database \
      sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

echo "Restore selesai dari: $BACKUP_FILE"
