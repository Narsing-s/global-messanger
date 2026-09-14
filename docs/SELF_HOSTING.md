# Global Messenger — Self-Hosted

Global Messenger can run as a complete private deployment without Render, Vercel, Cloudflare, Neon, Firebase, managed object storage, or managed TURN/SFU services.

The self-hosted stack owns the application data and runtime:

- PostgreSQL: users, conversations, messages and application state
- Fastify API + Socket.IO: REST API and realtime transport
- mediasoup inside the API image: realtime voice/video media processing
- coturn: self-hosted STUN/TURN for difficult networks
- local persistent upload volume: files and images
- ClamAV: local upload malware scanning
- Nginx: single public HTTP gateway
- Web frontend: built and served from the repository's own container

These are open-source software components running on infrastructure you control. The product does not require a third-party SaaS account for normal username/password messaging.

## Important boundary

"Self-hosted" does not mean the operating system, Docker, PostgreSQL, Nginx or cryptographic libraries are written by us. Those are software dependencies. The important difference is that they run under your control and the product does not depend on an external hosted service.

Email is optional for core messaging. If password-reset email is required, configure an SMTP server you operate yourself. Android/iOS background push delivery is platform-controlled; the self-hosted server cannot replace the operating-system push transport completely.

## Quick start

On a Linux server with Docker Engine and Docker Compose v2:

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
cp deploy/.env.self-hosted.example deploy/.env
# edit deploy/.env and set POSTGRES_PASSWORD, JWT_SECRET and TURN_CREDENTIAL
bash deploy/scripts/install.sh
```

The gateway listens on port `80` by default. For a domain, point the domain's A/AAAA record to the server and set `PUBLIC_HOST` and `WEB_ORIGIN` in `deploy/.env`.

For internet calling, set `MEDIASOUP_ANNOUNCED_IP` to the server's public IP and open the configured mediasoup UDP/TCP range plus the TURN ports in the firewall.

## Operations

Update:

```bash
bash deploy/scripts/update.sh
```

Backup PostgreSQL and uploads:

```bash
bash deploy/scripts/backup.sh
```

Restore a backup directory:

```bash
bash deploy/scripts/restore.sh /path/to/backup-directory
```

Check the stack:

```bash
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env ps
docker compose -f deploy/docker-compose.global.yml --env-file deploy/.env logs --tail=200 api
```

## Data ownership

The PostgreSQL and upload volumes are local Docker volumes. Backups are explicit and can be copied to storage that you own. No external database or object-storage endpoint is required by the self-hosted compose file.

## Security baseline

- Never commit `deploy/.env`.
- Use long random `JWT_SECRET`, `POSTGRES_PASSWORD` and `TURN_CREDENTIAL` values.
- Put the server behind a firewall and expose only the required ports.
- Use HTTPS before exposing the web application publicly.
- Restrict PostgreSQL so it is not directly reachable from the internet.
- Keep Docker images and the host operating system patched.
- Back up both PostgreSQL and uploads and test restoration periodically.

## Architecture

```text
Internet
   |
   v
 Nginx :80
   |--------------------|
   v                    v
Web :80              API :4000
                         |
             +-----------+-----------+
             |           |           |
          Postgres    Uploads     mediasoup
                                     |
                                  coturn
```

The public web client uses same-origin `/api`, `/socket.io` and `/uploads` routes, so the browser does not need a Render/Vercel/Cloudflare API URL.
