#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${1:-}"
[[ -n "$BACKUP_DIR" ]] || { echo "Usage: deploy/scripts/restore.sh <backup-directory>" >&2; exit 1; }
[[ -f "$BACKUP_DIR/postgres.dump" ]] || { echo "Missing postgres.dump" >&2; exit 1; }
[[ -f "$BACKUP_DIR/uploads.tar.gz" ]] || { echo "Missing uploads.tar.gz" >&2; exit 1; }

cd "$ROOT_DIR"
COMPOSE=(docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env)
"${COMPOSE[@]}" up -d postgres api
"${COMPOSE[@]}" exec -T postgres dropdb --if-exists -U "${POSTGRES_USER:-global_messenger}" "${POSTGRES_DB:-global_messenger}"
"${COMPOSE[@]}" exec -T postgres createdb -U "${POSTGRES_USER:-global_messenger}" "${POSTGRES_DB:-global_messenger}"
cat "$BACKUP_DIR/postgres.dump" | "${COMPOSE[@]}" exec -T postgres pg_restore -U "${POSTGRES_USER:-global_messenger}" -d "${POSTGRES_DB:-global_messenger}" --clean --if-exists
cat "$BACKUP_DIR/uploads.tar.gz" | "${COMPOSE[@]}" exec -T api sh -c 'rm -rf /data/uploads && mkdir -p /data/uploads && tar -C /data -xzf -'
"${COMPOSE[@]}" up -d

echo "Restore completed."
