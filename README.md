# 🌍 Global Messenger

> **Realtime conversations. One shared product. Built for people everywhere.**

Global Messenger is an independently developed messaging application focused on fast realtime communication across web and Android, with a shared codebase that can be extended to other platforms.

It brings conversations, presence, profiles, groups, media sharing, message controls, calling foundations and optional AI assistance into one workspace. The core messaging experience does **not** require AI.

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-22%2B-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-316192)
![Realtime](https://img.shields.io/badge/realtime-Socket.IO-black)
![Android](https://img.shields.io/badge/Android-APK-3DDC84)

## 🚀 Live project

- **Web:** https://global-messanger.onrender.com
- **API:** https://global-messanger-backend.onrender.com
- **API health:** https://global-messanger-backend.onrender.com/health
- **Source:** https://github.com/Narsing-s/global-messanger

## 📱 Android APK — direct installation

**Yes — the repository currently has a real `.apk` file available for download.** The latest GitHub Release contains an Android Package (`application/vnd.android.package-archive`) named `global-messenger.apk`, about 5 MB in size. It is a real APK, not an `.aab`, `.zip`, or source-code archive.

### Download the Android APK

**👉 https://github.com/Narsing-s/global-messanger/releases/tag/android-latest**

On the release page, under **Assets**, download:

```text
global-messenger.apk
```

After downloading it to an Android phone, open the APK to install Global Messenger. Android may ask you to allow installation from that source. Only install APKs obtained from a source you trust.

### APK vs AAB vs ZIP

| File | Purpose | Directly install on Android? |
|---|---|---|
| `global-messenger.apk` | Android application package | ✅ Yes |
| `.aab` | Google Play publishing bundle | ❌ No |
| `.zip` | Source/archive/artifact container | ❌ No |

The GitHub Actions workflow builds the Android release APK, validates that an APK exists, checks the package, verifies the APK signature, and uploads the APK as a workflow artifact and GitHub Release asset.

**Important:** the current APK is intended for direct testing/install. For Google Play, build and publish a properly signed `.aab` and complete Play Console requirements. See [`docs/06-android-play-store.md`](./docs/06-android-play-store.md).

## ✨ Features

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
- Android packaging through Capacitor

### Account & security
- JWT authentication
- bcrypt password hashing
- Password recovery
- Account deletion support

> **Scope note:** a feature described as a foundation is not presented as production-complete infrastructure. Public WebRTC calling requires suitable production STUN/TURN infrastructure.

## 🏗️ Architecture

```text
                       GLOBAL MESSENGER
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      React + Vite Client                Fastify API
      TypeScript + Capacitor              Node.js + TS
             │                                 │
       Web / Android                       Socket.IO
                                             │
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
| Mobile | Capacitor + Android |
| Local services | Docker Compose + Mailpit |
| Optional AI | Provider-based integration |

## 📁 Repository structure

```text
.
├── apps/
│   ├── web/                 React/Vite/Capacitor client
│   └── server/              Fastify/Socket.IO API
├── apps/server/prisma/      Prisma schema and migrations
├── docs/                    Development, Android and release documentation
├── scripts/                 Verification and development helpers
├── .github/workflows/       CI and Android build workflows
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
- Android Studio + Android SDK for native Android development

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

For Android QA, use the actual APK on a real device and test login, messaging, permissions, notifications, media, calls and reconnect behavior.

## 🤖 Android build and release

The Android client is generated from the shared React/Vite application through Capacitor. The repository includes:

```text
.github/workflows/android-build.yml
apps/web/capacitor.config.ts
```

The Android workflow builds the web client, generates/synchronizes Android, configures required permissions, creates a release APK, verifies it, uploads it as a GitHub Actions artifact and publishes the latest APK to the `android-latest` GitHub Release.

For the complete process, see:

- [`docs/ANDROID_APK.md`](./docs/ANDROID_APK.md) — download/install/build APK
- [`docs/06-android-play-store.md`](./docs/06-android-play-store.md) — Android and Play Store release
- [`docs/07-release-checklist.md`](./docs/07-release-checklist.md) — release checklist

## ☁️ Render deployment

The repository contains Render configuration for the web/API services. The server listens on the `PORT` supplied by Render.

Deployment documentation: [`docs/10-render-deploy.md`](./docs/10-render-deploy.md)

After deployment, verify:

```text
GET /health → HTTP 200
GET /       → service-status JSON
```

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
- Signed mobile builds

Never commit `.env` files, passwords, tokens, private keys or database credentials.

See [`docs/SECURITY.md`](./docs/SECURITY.md).

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

See [`docs/08-contributing.md`](./docs/08-contributing.md).

## 📚 Documentation

- [`01-getting-started.md`](./docs/01-getting-started.md) — setup
- [`02-architecture.md`](./docs/02-architecture.md) — architecture
- [`03-features.md`](./docs/03-features.md) — feature inventory
- [`04-testing.md`](./docs/04-testing.md) — testing
- [`05-production-deployment.md`](./docs/05-production-deployment.md) — deployment guidance
- [`06-android-play-store.md`](./docs/06-android-play-store.md) — Android/Play Store
- [`ANDROID_APK.md`](./docs/ANDROID_APK.md) — Android APK download/install/build
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
| Android package | `com.globalmessenger.app` |

## 💰 Pricing

**Free for end users.** Infrastructure and operational costs are separate from the user-facing pricing model.

## 📝 Store copy

**Short description:** Free realtime messaging for everyone — chat, share, react and connect without borders.

**Long description:** Global Messenger is a free messaging application built for fast conversations across web and Android experiences. Chat one-to-one or in groups, share images and files, react to messages, reply to conversations, manage your profile and see realtime presence without unnecessary complexity.

## ⭐ Project principle

> **Build communication that feels simple to use, honest about its capabilities, and ready to grow.**
