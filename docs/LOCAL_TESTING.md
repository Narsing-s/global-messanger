# Global Messenger — Local Testing First

This project should be validated locally before deployment. The goal is a quiet, predictable development loop: no source-code patching during `dev`/`build`, no expected browser push warnings, and clear failures when the environment is wrong.

## 1. Requirements

- Windows 11, macOS or Linux
- Node.js 22+
- npm
- Docker Desktop for the bundled PostgreSQL setup
- Git

Check the environment:

```bash
npm run doctor
```

## 2. Install cleanly

For a clean checkout:

```bash
npm ci
```

If dependencies have not been installed before:

```bash
npm install
```

## 3. Start PostgreSQL + local email capture

```bash
docker compose up -d postgres mailpit
```

Mailpit is the local SMTP inbox used to test password recovery without a real email provider:

- SMTP: `127.0.0.1:2525`
- Inbox UI: `http://127.0.0.1:8025`

Confirm it is running:

```bash
docker compose ps
```

## 4. Configure the server

Copy the example environment file:

**Git Bash:**

```bash
cp apps/server/.env.example apps/server/.env
```

**PowerShell:**

```powershell
Copy-Item apps/server/.env.example apps/server/.env
```

The local example uses PostgreSQL on `127.0.0.1:5432`, the API on port `4000`, and the Vite client on port `5173`.

## 5. Prepare Prisma

```bash
npm run db:generate
npm run db:migrate
```

For a brand-new local database where migration history is not yet present, `npm run db:deploy` can be used after the migration files are available.

## 6. Build before running

```bash
npm run verify:local
```

This runs the environment doctor and a full web/server TypeScript + production build.

## 7. Start the application

```bash
npm run dev
```

Expected local services:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000`
- API health: `http://127.0.0.1:4000/health`

The development runner is Windows-safe and does not require `cmd.exe` to be manually configured.

## 8. Run the smoke test

With `npm run dev` still running in another terminal:

```bash
npm run smoke
```

The smoke test checks both the API health endpoint and the web application.

Optional URLs:

```powershell
$env:API_URL='http://127.0.0.1:4000/health'
$env:WEB_URL='http://127.0.0.1:5173/'
npm run smoke
```

## 9. Two-account realtime test

Use two separate browser profiles or one normal window plus one private window.

1. Register Account A and Account B.
2. Log into both accounts.
3. Open a direct conversation.
4. Send messages in both directions.
5. Switch conversations repeatedly.
6. Verify unread counts do not jump or disappear incorrectly.
7. Verify typing indicators.
8. Verify reactions, replies, editing and deletion.
9. Verify image/file sharing.
10. Test password recovery: request a reset email, open Mailpit, click the reset link, set a new password, then sign in again.
11. Test Smart Assist with `GROQ_API_KEY` or `OPENAI_API_KEY` configured; verify the chat still works when AI is unavailable.
12. Disconnect one browser from the network and reconnect it.
13. Confirm messages recover without a page refresh.
14. Confirm presence changes only after the user's final active connection disconnects.
15. Test group creation and messaging.
16. Test profile/photo flows.
17. Test call permission-denied and successful permission flows on supported devices.

## 10. Quiet-browser policy

Expected platform limitations must not make local development noisy. Web builds do not initialize Capacitor native push registration. Push failures must never interrupt chat rendering.

Do not hide real application errors. Errors that indicate broken authentication, API requests, realtime synchronization, rendering, or database behavior should remain observable during debugging.

## 11. Before every deployment

Run:

```bash
npm ci
npm run verify:local
```

Then start the app and run:

```bash
npm run smoke
```

Finally perform the two-account realtime checklist above.

## 12. Troubleshooting

### Port 4000 is busy

PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue
```

Stop the process that owns the port, then restart the server.

### PostgreSQL is not running

```bash
docker compose up -d postgres
docker compose ps
```

### Prisma client is stale

```bash
npm run db:generate
```

### Build fails after a dependency change

```bash
rm -rf node_modules apps/server/node_modules apps/web/node_modules
npm ci
npm run verify:local
```

On PowerShell use `Remove-Item -Recurse -Force node_modules, apps/server/node_modules, apps/web/node_modules` instead.

### Browser opens but chat is blank

1. Check `http://127.0.0.1:4000/health`.
2. Run `npm run smoke`.
3. Check the browser Network tab for `/api/*` and `/socket.io/*` failures.
4. Check that `apps/server/.env` has the correct `WEB_ORIGIN` and `DATABASE_URL`.
5. Re-run `npm run verify:local`.

## Production reminder

Local development defaults are intentionally non-production. Before launch, use a unique production JWT secret, HTTPS, restricted CORS, persistent object storage, database backups, rate limiting, monitoring, and production WebRTC TURN infrastructure.
