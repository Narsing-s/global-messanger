#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR/$STAMP"
cd "$ROOT_DIR"
set -a
source deploy/.env
set +a
COMPOSE=(docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env)
"${COMPOSE[@]}" exec -T api sh -c 'tar -C /data -czf - global-messenger.db uploads' > "$BACKUP_DIR/$STAMP/sqlite-and-uploads.tar.gz"
printf '%s\n' "$BACKUP_DIR/$STAMP" > "$BACKUP_DIR/latest"
echo "SQLite backup created: $BACKUP_DIR/$STAMP"
