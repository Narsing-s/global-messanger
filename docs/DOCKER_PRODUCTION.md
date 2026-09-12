# Docker production deployment

Global Messenger can run as a complete containerized stack:

- `web` — Nginx + React/Vite production frontend
- `api` — Fastify + Socket.IO + Prisma API
- `postgres` — PostgreSQL 17 database
- `messenger_uploads` — persistent media volume
- `mailpit` — optional local SMTP inbox for development

The web container proxies `/api`, `/socket.io`, and `/uploads` to the API container, so the browser can use one origin. Socket.IO WebSocket upgrade headers are preserved.

## Start the complete stack

1. Copy `.env.example` to `.env` and set a strong `POSTGRES_PASSWORD` and `JWT_SECRET`.
2. Start everything:

```bash
docker compose up -d --build
```

3. Open:

```text
http://localhost:8080
```

4. Check the containers:

```bash
docker compose ps
docker compose logs -f api
```

5. Stop the stack:

```bash
docker compose down
```

Database and uploaded-media data are retained in named Docker volumes.

## Local email testing

Start Mailpit with the development profile:

```bash
docker compose --profile dev up -d
```

Open the Mailpit UI at `http://localhost:8025`.

The API automatically uses `mailpit:1025` by default in the Docker Compose stack.

## Production secrets

Do not use the example defaults in production. Set at minimum:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `WEB_ORIGIN`
- `PASSWORD_RESET_WEB_ORIGIN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_STARTTLS`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `MAIL_FROM`

For production, use an external managed PostgreSQL database or a separately managed PostgreSQL cluster if the deployment platform does not provide durable Docker volumes.

## Container images

GitHub Actions builds both images on pull requests and publishes production images to GitHub Container Registry for pushes to `main` and version tags.

Images:

```text
ghcr.io/<owner>/global-messenger-api
ghcr.io/<owner>/global-messenger-web
```

## Operational requirements for a serious deployment

Docker makes the application reproducible, but production reliability still requires:

1. Durable PostgreSQL backups and tested restore procedures.
2. Durable media storage. The bundled Docker volume is suitable for a single-host deployment; use S3-compatible object storage for multi-node/HA deployments.
3. HTTPS at the edge with HSTS and secure cookies/headers where applicable.
4. A real SMTP provider for password recovery and transactional mail.
5. STUN/TURN infrastructure for reliable WebRTC calls across restrictive networks.
6. Monitoring for API latency, Socket.IO connections, database health, upload failures, authentication failures, and container restarts.
7. Log aggregation and alerting outside the individual container filesystem.
8. Rate limiting and abuse controls before exposing the service publicly at scale.

## Useful commands

```bash
# Rebuild after code changes
docker compose build --no-cache

# Start in the background
docker compose up -d

# Follow API logs
docker compose logs -f api

# Follow all logs
docker compose logs -f

# Verify API readiness from inside the web network
docker compose exec api node -e "fetch('http://127.0.0.1:4000/ready').then(async r=>{console.log(await r.text()); process.exit(r.ok?0:1)}).catch(e=>{console.error(e);process.exit(1)})"

# Remove containers but keep persistent volumes
docker compose down

# Destructive: remove containers and all named data volumes
docker compose down -v
```
