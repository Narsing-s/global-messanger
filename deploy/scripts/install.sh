#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$ROOT_DIR/deploy"
cd "$DEPLOY_DIR"

command -v docker >/dev/null 2>&1 || { echo "Docker is required." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required." >&2; exit 1; }

if [[ ! -f .env ]]; then
  cp .env.self-hosted.example .env
  echo "Created deploy/.env. Edit it before continuing."
  echo "Required: JWT_SECRET and TURN_CREDENTIAL."
  exit 0
fi

set -a
source .env
set +a

: "${JWT_SECRET:?Set JWT_SECRET in deploy/.env}"
: "${TURN_CREDENTIAL:?Set TURN_CREDENTIAL in deploy/.env}"

cd "$ROOT_DIR"
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env build --pull
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env up -d

echo "Global Messenger self-hosted stack is running."
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env ps
