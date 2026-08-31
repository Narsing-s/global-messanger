# Render deployment

The backend must never run Prisma migrations against `localhost` during a cloud build. The Render deployment now uses the backend Dockerfile and runs `prisma migrate deploy` when the container starts, after Render has injected `DATABASE_URL`.

## Render Blueprint

`render.yaml` creates:

- `global-messenger-api` — Docker web service
- `global-messenger-web` — static site
- `global-messenger-db` — PostgreSQL database

The backend reads Render's injected `PORT` and listens on `0.0.0.0`.

## Important: existing Render service

If an existing `global-messenger-api` service was created manually, make sure its settings match the Blueprint. In particular:

- Runtime: Docker
- Dockerfile: `apps/server/Dockerfile`
- Docker context: repository root
- Remove any manually configured `DATABASE_URL` containing `localhost:5432`
- Keep `DATABASE_URL` connected to the Render PostgreSQL service
- Do not put `prisma migrate deploy` in the build command

The Docker container runs the migration at startup:

```text
npx prisma migrate deploy --schema apps/server/prisma/schema.prisma
node apps/server/dist/index.js
```

## Expected deployment

Build:

```text
npm ci --include=dev
npm run db:generate
npm run build -w apps/server
```

Start:

```text
Prisma migrate deploy
Global Messenger API listening on Render's PORT
```

## Frontend

Set `VITE_API_URL` to:

```text
https://global-messenger-api.onrender.com
```

The static site is configured with an SPA rewrite to `/index.html`.

## Local development

Local development can continue using:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/global_messenger
```

That value must stay in `apps/server/.env` locally and must not be committed. Production uses Render's database URL instead.
