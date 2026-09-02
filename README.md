# 🌍 Global Messenger

> **Realtime conversations. One shared product. Built for people everywhere.**

Global Messenger is an independently developed, open-source messaging application focused on fast realtime communication across web and future mobile/desktop surfaces.

It brings conversations, presence, profiles, groups, media sharing, message controls and optional AI assistance into one workspace. The core messaging experience does **not** require AI.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-22%2B-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-316192)
![Realtime](https://img.shields.io/badge/realtime-Socket.IO-black)

## 🚀 Live project

- **Web:** https://global-messanger.onrender.com
- **API:** https://global-messanger-backend.onrender.com
- **API health:** https://global-messanger-backend.onrender.com/health
- **Source:** https://github.com/Narsing-s/global-messanger

The API exposes `/health` for service checks and `/` for a lightweight service-status response.

## ✨ Why Global Messenger?

Global Messenger is designed around a few principles:

- ⚡ **Realtime first** — messaging, presence, typing and reconnect behavior use Socket.IO.
- 🔐 **User ownership** — application source, database schema and deployment configuration live together.
- 🧭 **Local-first development** — PostgreSQL and Mailpit can run locally for predictable testing.
- 📱 **Cross-platform foundation** — the responsive web client can be packaged with Capacitor.
- 🤖 **AI by choice** — optional Smart Assist can be enabled through a configured provider.
- 🧩 **Practical engineering** — verification, smoke testing, deployment and release procedures are documented.

## 💬 Feature set

### Messaging
- One-to-one realtime conversations
- Group conversations
- Online/offline presence and last seen
- Typing indicators
- Replies and reactions
- Message editing
- Delete for me / everyone
- Clear chat
- Conversation export

### Profiles & media
- User profiles and profile photos
- Image and file sharing
- Bookmarks and pinned messages
- User blocking
- Emoji support

### Calls & notifications
- Voice/video calling foundation
- Microphone and camera controls
- Notification sounds
- Capacitor mobile packaging path

### Account & security
- JWT authentication
- bcrypt password hashing
- Password recovery
- Account deletion support

> **Scope note:** a feature described as a foundation is not presented as production-complete infrastructure. Public WebRTC calling, for example, requires production STUN/TURN infrastructure.

## 🏗️ Architecture

```text
                       GLOBAL MESSENGER
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      React + Vite Client                Fastify API
      TypeScript + Capacitor              Node.js + TS
             │                                 │
       Web / Mobile                      Socket.IO
       / Desktop                              │
                                             ▼
                                      Prisma + PostgreSQL

Optional local services:
  Docker Compose → PostgreSQL
  Mailpit        → local password-reset email capture
```

## 🧰 Stack

| Layer | Technology |
|---|---|
| Client | React + TypeScript + Vite |
| UI | Responsive CSS + Lucide |
| API | Node.js + Fastify |
| Realtime | Socket.IO |
| Database | PostgreSQL + Prisma |
| Authentication | JWT + bcrypt |
| Calls | WebRTC foundation |
| Mobile | Capacitor |
| Local services | Docker Compose + Mailpit |
| Optional AI | Provider-based integration |

## 📁 Repository structure

```text
.
├── apps/
│   ├── web/                 React/Vite/Capacitor client
│   └── server/              Fastify/Socket.IO API
├── apps/server/prisma/      Prisma schema and migrations
├── docs/                    Development and release documentation
├── scripts/                 Verification and development helpers
├── .github/workflows/       CI configuration
├── docker-compose.yml       Local PostgreSQL + Mailpit
├── render.yaml              Render deployment configuration
├── LICENSE                  MIT license
└── package.json             npm workspace configuration
```

## 💻 Local development

### Requirements

- Node.js 22+
- npm
- Git
- Docker Desktop (recommended)

### Install

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
npm ci
```

### Start local services

```bash
docker compose up -d postgres mailpit
```

Mailpit captures password-reset emails locally. Open `http://127.0.0.1:8025` to inspect them.

### Configure the server

Copy `apps/server/.env.example` to `apps/server/.env` and configure local database/auth values. Never use development placeholder secrets in production.

### Prepare the database

```bash
npm run db:generate
npm run db:migrate
```

### Verify and run

```bash
npm run doctor
npm run verify:local
npm run dev
```

In another terminal:

```bash
npm run smoke
```

Typical local endpoints:

- Web: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:4000`
- API health: `http://127.0.0.1:4000/health`
- Mailpit: `http://127.0.0.1:8025`

## 🔐 Authentication

Protected routes expect:

```text
Authorization: Bearer <token>
```

Passwords are hashed with bcrypt and protected routes use JWT authentication. A `401` response from a protected endpoint without an access token can be normal and does not by itself mean the API is unavailable.

## 🗄️ Database

Core Prisma entities include users, conversations, members, messages, reactions, bookmarks, pinned messages, push devices and blocks.

Useful commands:

```bash
npx prisma validate --schema ./apps/server/prisma/schema.prisma
npm run db:generate
npm run db:migrate
npm run db:deploy
```

## 🧪 Verification

Recommended pre-commit checks:

```bash
npm run doctor
npm run verify:local
npm run smoke
npm run build
```

For realtime QA, use two independent accounts and two browser sessions/devices. Test messaging, presence, typing, reconnects, media, reactions, replies, editing, deletion, groups and permissions without relying on a refresh.

## ☁️ Render deployment

The repository contains Render configuration for the web/API services. The server listens on the `PORT` supplied by Render.

Deployment documentation: [`docs/10-render-deploy.md`](./docs/10-render-deploy.md)

After deployment, verify:

```text
GET /health → HTTP 200
GET /       → service-status JSON
```

If `/health` works but `/` returns `Route GET:/ not found`, the running API build is missing the root route; check that the latest source was built and deployed.

## 🛡️ Production checklist

Before a broad public launch:

- HTTPS and secure WebSockets
- Strong randomly generated JWT secret
- PostgreSQL backups and restore testing
- Rate limiting and abuse protection
- Persistent media/object storage
- Restricted production CORS
- Structured logs and error monitoring
- Privacy Policy and Terms of Service
- Account/data deletion verification
- Camera/microphone/notification permission handling
- Production STUN/TURN for WebRTC
- Secure environment variables and secret rotation
- Signed mobile/desktop builds

Never commit `.env` files, passwords, tokens, private keys or database credentials.

See [`docs/SECURITY.md`](./docs/SECURITY.md).

## 📱 Platform direction

The shared client is intended to support:

- 🌐 Web
- 🤖 Android via Capacitor
- 🍎 iOS/iPadOS via Capacitor
- 🪟 Windows desktop packaging
- 🍎 macOS desktop packaging

Platform signing and store-release procedures are documented under `docs/`.

## 🤝 Contributing

```bash
git checkout -b feature/my-improvement
npm ci
npm run doctor
npm run verify:local
npm run build
# test the change
git add .
git commit -m "feat: describe the change"
git push origin feature/my-improvement
```

Pull requests should explain the change, motivation, testing performed and any migration/environment requirements.

See [`docs/08-contributing.md`](./docs/08-contributing.md).

## 🐛 Reporting a bug

Include the device/browser, OS, reproduction steps, expected result, actual result and relevant logs. Screenshots are useful for UI issues.

**Never publish credentials, tokens, private messages or other sensitive information.**

## 📚 Documentation

- [`01-getting-started.md`](./docs/01-getting-started.md) — setup
- [`02-architecture.md`](./docs/02-architecture.md) — architecture
- [`03-features.md`](./docs/03-features.md) — feature inventory
- [`04-testing.md`](./docs/04-testing.md) — testing
- [`05-production-deployment.md`](./docs/05-production-deployment.md) — deployment guidance
- [`06-android-play-store.md`](./docs/06-android-play-store.md) — Android/Play Store
- [`07-release-checklist.md`](./docs/07-release-checklist.md) — release checklist
- [`08-contributing.md`](./docs/08-contributing.md) — contribution workflow
- [`09-cross-platform-release.md`](./docs/09-cross-platform-release.md) — platform releases
- [`09-production-launch.md`](./docs/09-production-launch.md) — production readiness
- [`10-cross-platform-push-notifications.md`](./docs/10-cross-platform-push-notifications.md) — push notifications
- [`10-render-deploy.md`](./docs/10-render-deploy.md) — Render deployment
- [`ADVANCED_FEATURES.md`](./docs/ADVANCED_FEATURES.md) — advanced capabilities
- [`LOCAL_TESTING.md`](./docs/LOCAL_TESTING.md) — local testing
- [`STORE_RELEASE.md`](./docs/STORE_RELEASE.md) — store release
- [`SECURITY.md`](./docs/SECURITY.md) — security and disclosure

## 📄 License

Global Messenger is released under the **MIT License**.

The current repository license is the standard MIT license with the copyright notice `Copyright (c) 2026 Narsing-s`. MIT permits use, copying, modification, distribution, sublicensing and sale of the software subject to its notice and disclaimer terms.

**Branding note:** the MIT software license does not automatically grant trademark rights to the name, logo or other branding of Global Messenger.

See [`LICENSE`](./LICENSE) for the complete legal text.

## 🪪 Project identity

| Item | Value |
|---|---|
| Project | Global Messenger |
| Repository | `Narsing-s/global-messanger` |
| License | MIT |
| Copyright | `Copyright (c) 2026 Narsing-s` |
| Primary client | React + TypeScript + Vite |
| Primary API | Fastify + Socket.IO |
| Database | PostgreSQL + Prisma |

## 💰 Pricing

**Free for end users.** Infrastructure and operational costs are separate from the user-facing pricing model.

## 📝 Store copy

**Short description:** Free realtime messaging for everyone — chat, share, react and connect without borders.

**Long description:** Global Messenger is a free messaging application built for fast conversations across web and mobile experiences. Chat one-to-one or in groups, share images and files, react to messages, reply to conversations, manage your profile and see realtime presence without unnecessary complexity.

## ⭐ Project principle

> **Build communication that feels simple to use, honest about its capabilities, and ready to grow.**
