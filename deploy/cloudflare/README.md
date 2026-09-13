# Public HTTPS Docker access

This deployment exposes the Docker web container through Cloudflare Tunnel so the same public HTTPS origin can be used by the browser and the Android app.

## 1. Start Global Messenger

From the repository root:

```bash
docker compose up -d --build
```

Verify locally:

```text
http://localhost:8080/healthz
http://localhost:8080/ready
```

The web container already proxies `/api/`, `/socket.io/`, and `/uploads/` to the internal API service. The mobile app should therefore use the public **web origin**, not the internal API container address.

## 2. Fast temporary public URL

Install `cloudflared` on the machine running Docker, then run:

```bash
cloudflared tunnel --url http://localhost:8080
```

Cloudflare prints a temporary HTTPS address similar to:

```text
https://random-name.trycloudflare.com
```

Use that complete HTTPS address as the Android workflow `api_url` input. Do not add `/api` to it.

This quick tunnel is for testing. The address can change when the process is restarted.

## 3. Permanent production hostname

For a stable address, use a domain managed by Cloudflare and create a named tunnel. Point its public hostname to:

```text
http://host.docker.internal:8080
```

when `cloudflared` itself runs in Docker on Docker Desktop, or:

```text
http://localhost:8080
```

when `cloudflared` runs directly on the Docker host.

A recommended production hostname is:

```text
https://messenger.example.com
```

The Android app's `api_url` is then exactly:

```text
https://messenger.example.com
```

## 4. Build the Android APK with the public origin

In GitHub Actions, open **Actions → Android Build → Run workflow** and enter the public HTTPS origin in `api_url`.

Example:

```text
https://messenger.example.com
```

The workflow passes this value to `VITE_API_URL`, so the APK is built with the public Docker endpoint. The native login screen also supports changing the server URL when no build-time URL was supplied.

## 5. Production environment

Set the Docker environment to the same public origin:

```env
WEB_ORIGIN=https://messenger.example.com
PASSWORD_RESET_WEB_ORIGIN=https://messenger.example.com
API_URL=https://messenger.example.com
```

Keep secrets such as `POSTGRES_PASSWORD` and `JWT_SECRET` in `.env` or your deployment secret store. Never commit them.

## Architecture

```text
Android / Browser
       |
       | HTTPS
       v
https://messenger.example.com
       |
       v
Cloudflare Tunnel
       |
       v
Docker host :8080
       |
       v
Web/Nginx container
   |           |
   | /api      | /socket.io + /uploads
   v           v
API :4000    API :4000
       |
       v
PostgreSQL
```

The tunnel terminates public access at the web container. No direct public exposure of PostgreSQL or the API container is required.
