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

The existing Node/Fastify backend is intentionally kept. This Cloudflare backend is a separate migration path so the current self-hosted/SQLite deployment is not broken while Cloudflare functionality is moved endpoint-by-endpoint.

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

Still outside the Cloudflare-native path:
- uploads/media object storage
- password-reset email delivery
- passkeys/2FA
- push notifications
- SFU/mediasoup calling
- some advanced group/admin and organization features

The existing Node/Fastify + SQLite backend remains available for self-hosting. The Cloudflare backend is intentionally isolated so it can be deployed and tested independently.
