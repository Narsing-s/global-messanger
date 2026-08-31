# Production Launch

Global Messenger is prepared for a Render-based production deployment with a persistent Fastify + Socket.IO API, managed PostgreSQL, and a static React web client.

## Render Blueprint

The repository root contains `render.yaml` with:

- `global-messenger-api` — Node/Fastify + Socket.IO
- `global-messenger-web` — Vite/React static site
- `global-messenger-db` — managed PostgreSQL
- persistent media disk for API uploads
- generated JWT secret
- `/health` health check

## Required values during first Blueprint sync

Render will ask for:

- `WEB_ORIGIN` — the final web application URL, for example `https://global-messenger-web.onrender.com`
- `VITE_API_URL` — the API URL, for example `https://global-messenger-api.onrender.com`

Use HTTPS URLs only in production.

## Database

The API deployment runs Prisma client generation before compiling the server. Database migrations must be applied before opening the application to users:

```bash
npm run db:migrate -w apps/server
```

For an automated production migration, use Render's `preDeployCommand` after reviewing the migration strategy for your database.

## Production checklist

- [ ] Apply Prisma migrations
- [ ] Confirm `/health` returns HTTP 200
- [ ] Confirm `WEB_ORIGIN` matches the deployed web origin
- [ ] Confirm `VITE_API_URL` points to the deployed API
- [ ] Register two test accounts
- [ ] Test direct messaging and Socket.IO realtime delivery
- [ ] Test group creation
- [ ] Test attachments
- [ ] Test message edit/delete/reactions
- [ ] Test read receipts and offline sync
- [ ] Test push notification registration on Android
- [ ] Configure production STUN/TURN for reliable calls
- [ ] Configure Firebase credentials for push notifications
- [ ] Configure backups and monitoring
- [ ] Publish privacy policy and account-deletion process

## Launch flow

1. Push `main` to GitHub.
2. In Render, create a new Blueprint from this repository.
3. Review the three resources and apply the Blueprint.
4. Enter the two public HTTPS URLs requested by Render.
5. Wait for the database, API, and web deployments to finish.
6. Run the database migration.
7. Open the web URL and perform the two-account smoke test.

The repository also contains `.github/workflows/ci.yml`, which builds Prisma, the web app, and the server on pushes and pull requests.
