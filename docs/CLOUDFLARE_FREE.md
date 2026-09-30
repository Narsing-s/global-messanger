# Cloudflare Free backend

This directory is the new Cloudflare-native backend path for Global Messenger.

It uses:
- Cloudflare Workers for HTTP API execution.
- Cloudflare D1 for SQLite-backed relational data.
- Durable Objects with SQLite storage for realtime room coordination.
- No VPS, Render, Vercel, Docker, or PostgreSQL requirement.

Cloudflare currently makes SQLite-backed Durable Objects available on the Workers Free plan. Free-plan limits include 100,000 Durable Object requests/day, 5 million SQLite rows read/day, 100,000 rows written/day, and 5 GB total SQLite stored data. See the current Cloudflare pricing/limits documentation before production use.

## First-time Cloudflare setup

From a machine with Wrangler installed:

```bash
cd apps/cloudflare
npx wrangler login
npx wrangler d1 create global-messenger
```

Copy the returned D1 `database_id` into `wrangler.toml` in place of `REPLACE_WITH_D1_DATABASE_ID`.

Set a strong JWT secret:

```bash
npx wrangler secret put JWT_SECRET
```

Apply the SQLite schema:

```bash
npx wrangler d1 migrations apply global-messenger --remote
```

Deploy:

```bash
npx wrangler deploy
```

Wrangler will print the public Worker URL, for example:

```
https://global-messenger-api.<your-subdomain>.workers.dev
```

For the web app, set:

```
VITE_API_URL=https://global-messenger-api.<your-subdomain>.workers.dev
```

The Cloudflare Worker + D1 stack is now the only supported application backend in this repository. The legacy Node/Fastify/Prisma/PostgreSQL backend has been removed.

## Current Cloudflare migration scope

Implemented in the current migration:
- health/readiness
- registration and username/email login
- JWT authentication
- profile lookup and user search
- direct conversations and basic group creation
- conversation list and message history
- message creation/edit/delete
- read receipts
- message search
- reactions
- bookmarks/saved messages
- pinned messages
- Durable Object realtime event hub
- native WebSocket client compatibility for the web app

Remaining integrations can be added to the Cloudflare Worker using Cloudflare-native services or external APIs where required; they must not introduce PostgreSQL, Neon, Prisma, Render, or Vercel as a database/backend dependency.
