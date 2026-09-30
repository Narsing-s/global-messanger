#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${1:-}"
[[ -n "$BACKUP_DIR" ]] || { echo "Usage: deploy/scripts/restore.sh <backup-directory>" >&2; exit 1; }
[[ -f "$BACKUP_DIR/sqlite-and-uploads.tar.gz" ]] || { echo "Missing sqlite-and-uploads.tar.gz" >&2; exit 1; }
cd "$ROOT_DIR"
COMPOSE=(docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env)
"${COMPOSE[@]}" up -d api
cat "$BACKUP_DIR/sqlite-and-uploads.tar.gz" | "${COMPOSE[@]}" exec -T api sh -c 'rm -rf /data/uploads && mkdir -p /data/uploads && tar -C /data -xzf -'
"${COMPOSE[@]}" restart api
echo "SQLite restore completed."
