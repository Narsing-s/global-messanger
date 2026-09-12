# Global Messenger

A production-ready, realtime messaging platform for web and mobile clients.

## Production architecture

For a reliable self-hosted deployment, the **Docker frontend is the canonical production frontend**. It serves the Vite production build through Nginx and proxies `/api`, `/socket.io`, and `/uploads` to the API service.

```text
Browser / Mobile Web
        |
        v
  Docker Web :8080
        |
        +---- /api/* ------> Fastify API :4000
        +---- /socket.io/* -> Fastify + Socket.IO :4000
        +---- /uploads/* ---> Fastify API :4000
        |
        +---- static Vite frontend
```

The repository also contains a Render Blueprint for deployments that use Render. If your Render account does not expose the latest-commit redeploy controls, use the Docker frontend instead so the frontend build is fully controlled by your Docker image.

## Docker frontend

The web frontend is built from `apps/web/Dockerfile` and exposed by Docker Compose on port `8080` by default.

### Production build

From the repository root:

```bash
docker compose build --no-cache --pull web
docker compose up -d --force-recreate --no-deps web
```

Docker's `--no-cache` forces all Dockerfile build layers to be rebuilt, while `--pull` refreshes base images. This is the recommended clean rebuild when an old frontend image is suspected.

To rebuild the complete stack:

```bash
docker compose down
docker compose build --no-cache --pull
docker compose up -d
```

### Docker frontend URL

After the stack starts locally:

**Frontend:** `http://localhost:8080`

The browser should use the Docker frontend URL, not a stale Render frontend URL.

For a server exposed through a public domain, publish port `8080` behind your reverse proxy and use that public HTTPS URL as the user-facing application URL.

### Verify the running frontend

```bash
docker compose ps web
docker compose logs --tail=100 web
curl -I http://localhost:8080/
curl -I http://localhost:8080/index.html
```

The production Nginx configuration deliberately disables caching for `index.html` and `config.js`. Vite's hashed JS/CSS assets are immutable and can be cached safely. This prevents a deployment from loading an old HTML entry point that references an old application bundle.

### Force a fresh browser load

After replacing an existing container, open the Docker URL in a private/incognito window. If the browser has an old service worker or cached application data, clear site data for the Docker hostname and reload.

## Current product capabilities

Global Messenger is designed as a modern realtime messenger with:

- Direct conversations and group conversations
- Realtime Socket.IO messaging
- Online/offline presence
- Message replies, editing, deletion and reactions
- File/image attachments
- Typing indicators and delivery/read behaviour
- Emoji picker
- Voice/video call hooks
- Smart Assist integration
- Mobile-responsive web experience
- Push-notification support where the platform allows it
- Production API and PostgreSQL backend
- Dockerized frontend and backend deployment

## Deployment recommendation

For a single predictable production frontend, use the Docker web service as the source of truth. Build the image from the current `main` branch, recreate the container, and expose only the Docker frontend to end users. Keep the API behind the frontend's same-origin `/api` and `/socket.io` routes whenever possible.

## Development

```bash
npm ci
npm run dev -w apps/web
```

Build only the frontend:

```bash
npm run build -w apps/web
```

## Repository

urlGitHub repositoryhttps://github.com/Narsing-s/global-messanger
