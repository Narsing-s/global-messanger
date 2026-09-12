# 🐳 Global Messenger — Docker Guide

This guide explains Docker in simple language first, then gives the commands needed by developers and server administrators.

## 1. What is Docker?

Think of Docker as a **box that contains the application and everything it needs to run**.

Global Messenger uses several boxes (called containers):

| Container | Simple meaning |
|---|---|
| `web` | The website that users open. Nginx also sends API requests to the backend. |
| `api` | The backend that handles accounts, messages, files and realtime communication. |
| `postgres` | The database that stores application data. |
| `mailpit` | A fake/local mailbox for testing emails. It is not for real production email. |

Docker Compose starts these containers together and lets them communicate privately.

## 2. Docker does not automatically mean “online”

This is important:

**Docker can run on your computer or on an Internet server.**

When Docker runs on your computer, only you can normally access it:

```text
Your computer
   ↓
Docker
   ↓
http://localhost:8080
```

When Docker runs on an online server, users can access it through a domain:

```text
Users
  ↓
https://your-domain.example
  ↓
Online server
  ↓
Docker
```

So Docker is the packaging and running system. An online server is still required for a public Internet service.

---

## 3. Run Global Messenger locally

### Step 1 — Install Docker Desktop

Install Docker Desktop and make sure Docker is running.

### Step 2 — Get the project

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
```

### Step 3 — Create your local environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

For local development, use strong local values for `POSTGRES_PASSWORD` and `JWT_SECRET`.

**Never copy real production passwords into a public repository.**

### Step 4 — Start Docker

```bash
docker compose --profile dev up -d --build
```

The first build can take several minutes because Docker downloads base images and installs dependencies.

### Step 5 — Check the containers

```bash
docker compose ps
```

You want to see:

```text
postgres   healthy
api        healthy
web        healthy
mailpit    healthy
```

### Step 6 — Open the application

Open:

**http://localhost:8080**

### Step 7 — Check the Web health page

Open:

**http://localhost:8080/healthz**

It should return:

```text
ok
```

### Step 8 — Check the API through Nginx

PowerShell:

```powershell
Invoke-WebRequest http://localhost:8080/api/health -UseBasicParsing
```

A successful response has HTTP status `200` and JSON similar to:

```json
{"ok":true,"service":"global-messenger"}
```

The browser uses one public origin. Nginx internally forwards:

```text
/api/*       → API
/socket.io/* → API
/uploads/*   → API
```

The API itself listens on port `4000` inside the Docker network. It does not need to be exposed directly to the public Internet.

---

## 4. Local email testing

Mailpit is included for development.

Open:

**http://localhost:8025**

When the application sends a test password-reset email, Mailpit catches it so you can read it in the browser.

Mailpit is **not a real email service**. Do not use it as the production email provider.

---

## 5. Data that must survive restarts

The Compose setup uses named Docker volumes for persistent data.

Important data includes:

- PostgreSQL database data.
- Uploaded media.

`docker compose down` removes the containers but normally keeps named volumes.

### ⚠️ Dangerous command

Do not run this unless you intentionally want to delete the local Docker data:

```bash
docker compose down -v
```

The `-v` option removes the named volumes and therefore can delete your local database and uploaded files.

---

## 6. Production secrets

Production must use real, private values for at least:

```text
POSTGRES_PASSWORD
JWT_SECRET
WEB_ORIGIN
PASSWORD_RESET_WEB_ORIGIN
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_STARTTLS
SMTP_USER
SMTP_PASSWORD
MAIL_FROM
```

Do not put these values into:

- `README.md`
- Dockerfiles
- source code
- screenshots
- Git commits
- public GitHub issues

Use your hosting provider's secret/environment-variable system.

Also rotate any production secret immediately if it has accidentally been published.

---

## 7. Production database

For a serious public service, database reliability is extremely important.

Recommended setup:

```text
Application containers
        ↓
Managed PostgreSQL
        ↓
Automatic backups
        ↓
Tested restore process
```

A PostgreSQL container on the same server can work for a small single-server deployment, but it creates more operational responsibility.

For a larger service, use managed PostgreSQL or a separately managed database cluster.

---

## 8. Production media storage

Uploaded images and files need storage that survives container replacement.

For one small server, a persistent Docker volume can be used.

For multiple servers or higher availability, use S3-compatible object storage.

```text
User upload
    ↓
API
    ↓
Persistent object storage
```

Do not rely on a temporary container filesystem for important user files.

---

## 9. HTTPS

A public production service should use HTTPS.

Users should access:

```text
https://messenger.example.com
```

not:

```text
http://server-ip:8080
```

Use a production reverse proxy/load balancer or managed edge service to terminate TLS and forward traffic to the Docker Web container.

Use HSTS and appropriate secure headers once HTTPS is configured correctly.

---

## 10. Realtime messaging

Global Messenger uses Socket.IO for realtime communication.

The Nginx configuration preserves WebSocket upgrade headers for `/socket.io/`.

Architecture:

```text
Phone / Browser
      ↓
   HTTPS/WSS
      ↓
   Nginx
      ↓
 Socket.IO
      ↓
    Fastify
```

For multiple API servers, use an appropriate Socket.IO scaling/adapter strategy and shared infrastructure.

---

## 11. Password-reset email

Production password recovery requires a real SMTP provider.

Configure the SMTP variables in the production environment.

Then test:

1. Create an account.
2. Request a password reset.
3. Confirm the email arrives.
4. Open the reset link.
5. Set a new password.
6. Log in using the new password.

Do not consider password recovery production-ready until this complete flow works.

---

## 12. Monitoring

A production deployment should monitor at least:

- API health.
- API response time.
- Container restarts.
- Database health.
- Database storage.
- Socket.IO connections.
- Failed logins.
- Password-reset failures.
- Upload failures.
- Server CPU and memory.
- Disk space.
- HTTPS certificate expiry.

Also send important failures to an alerting system rather than relying only on container logs.

---

## 13. Backups

A production database needs backups.

A good process is:

```text
Automatic backup
      ↓
Backup storage
      ↓
Periodic restore test
      ↓
Confirmed recovery procedure
```

A backup that has never been restored/tested should not be treated as fully reliable.

Back up uploaded media as well, or use durable object storage with its own backup/versioning strategy.

---

## 14. Docker images and GitHub Actions

The repository includes Dockerfiles for the Web and API and a GitHub Actions workflow that builds container images.

The intended flow is:

```text
Developer pushes code
        ↓
GitHub Actions
        ↓
Build Web image
Build API image
        ↓
Tests / verification
        ↓
GitHub Container Registry
        ↓
Production server pulls image
        ↓
Docker Compose starts new version
```

Version tags can be used for releases so a specific production version can be identified and rolled back if necessary.

---

## 15. Safe production deployment process

Do not replace a working production service blindly.

Use this process:

```text
1. Build
   ↓
2. Test
   ↓
3. Health check
   ↓
4. Deploy new containers
   ↓
5. Run database migrations
   ↓
6. Check API
   ↓
7. Check Web
   ↓
8. Test login
   ↓
9. Test realtime chat
   ↓
10. Test uploads
   ↓
11. Monitor
```

Keep the previous image/version available so you have a rollback option.

---

## 16. Useful commands

Start:

```bash
docker compose up -d
```

Start with local Mailpit:

```bash
docker compose --profile dev up -d
```

Rebuild after code changes:

```bash
docker compose build --no-cache
```

Restart:

```bash
docker compose up -d
```

Check containers:

```bash
docker compose ps
```

View API logs:

```bash
docker compose logs -f api
```

View Web logs:

```bash
docker compose logs -f web
```

View everything:

```bash
docker compose logs -f
```

Stop containers but keep named volumes:

```bash
docker compose down
```

Delete containers and named volumes — **destructive**:

```bash
docker compose down -v
```

---

## 17. Production checklist

Before telling users that the Docker production service is ready, confirm every item below:

- [ ] Domain works.
- [ ] HTTPS works.
- [ ] Web page opens.
- [ ] API health returns `200`.
- [ ] Registration works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Realtime messages work.
- [ ] Message history survives restart.
- [ ] Group chats work.
- [ ] File/image upload works.
- [ ] Uploaded files survive container replacement.
- [ ] Password reset email works.
- [ ] Database backups work.
- [ ] Backup restore has been tested.
- [ ] Monitoring is active.
- [ ] Alerts are active.
- [ ] Production secrets are private.
- [ ] Rate limiting/abuse protection is enabled.
- [ ] Previous production image can be restored.
- [ ] Android production build points to the correct production API.

Only after these checks should a major public release such as `v1.0.0` be announced as the primary production release.

---

## 18. Simple explanation for non-developers

If all you remember is these five things, remember this:

1. **Docker** packages the app.
2. **A cloud/server** makes the app available online.
3. **PostgreSQL** stores the important application data.
4. **Persistent storage** keeps uploaded files safe.
5. **HTTPS + backups + monitoring** are required for a serious public service.

That is the difference between “the app runs on my computer” and “the app is a reliable Internet service.”
