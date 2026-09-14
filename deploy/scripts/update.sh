#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

git pull --ff-only origin main

docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env build --pull
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env up -d --remove-orphans
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env ps
