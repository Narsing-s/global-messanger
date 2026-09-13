# 📚 Global Messenger Documentation

Welcome to the **Global Messenger** documentation hub.

Global Messenger is a full-stack, real-time messaging platform for Web and Android. The documentation is organized around the actual product architecture, feature centers, security model, deployment model and end-to-end release process.

> **Documentation rule:** a feature described as a *foundation* or *roadmap* item is not a claim that every UI state, platform-specific edge case or production integration is complete.

## 🧭 Start Here

- **[🏠 Project README](../README.md)** — public overview, architecture, setup, Docker deployment, Android testing and roadmap.
- **[🌍 Project Wiki](./WIKI.md)** — detailed product behavior, architecture, security, retention and operational guidance.
- **[✨ Feature Matrix](./03-features.md)** — current product centers, feature scope, foundation status and roadmap.
- **[⚡ Performance Release Gate](./15-performance-release-gate.md)** — P0 speed, offline, retry, realtime and production SLO requirements.
- **[🧪 Testing & QA](./04-testing.md)** — browser, Android, two-user realtime, media, groups, calls, E2EE and release-gate testing.
- **[🌍 Global-Market Blueprint](./14-global-market-blueprint.md)** — global product, privacy, scale and ecosystem roadmap.
- **[🚀 Remaining Global Features](./15-remaining-global-features.md)** — implementation checklist for every remaining global-market capability.

## 📖 Documentation Map

| Document | Purpose |
|---|---|
| `01-getting-started.md` | Local setup and first run |
| `02-architecture.md` | Application architecture and service boundaries |
| `03-features.md` | Product feature matrix and roadmap |
| `04-testing.md` | End-to-end QA and release testing |
| `05-production-deployment.md` | Production deployment guidance |
| `06-android-play-store.md` | Android release / Play Store preparation |
| `07-release-checklist.md` | Release checklist |
| `08-contributing.md` | Contribution workflow and engineering rules |
| `09-cross-platform-release.md` | Cross-platform release process |
| `09-production-launch.md` | Production launch checklist |
| `10-cross-platform-push-notifications.md` | Push notification architecture/setup |
| `10-render-deploy.md` | Render deployment reference |
| `11-market-readiness.md` | Product and launch readiness |
| `12-production-operations.md` | Production operations and support |
| `13-external-production-setup.md` | External production service setup |
| `14-global-market-blueprint.md` | Global-market product blueprint |
| `15-performance-release-gate.md` | P0 performance/reliability release gate |
| `15-remaining-global-features.md` | Complete remaining-feature implementation checklist |
| `WIKI.md` | Detailed product/architecture reference |

## 🧩 Product Centers

1. **Profile Center** — profile photo, display name, username, bio, status/privacy and profile sharing.
2. **Chat Info** — contact/group information, media, files, links, starred/pinned items and chat controls.
3. **Message Tools** — reply, forward, copy, star/save, pin, message info, retry and multi-select/bulk operations.
4. **Conversation Organization** — favorites, pinned chats, archive, filters, folders and Saved Messages.
5. **Media Center** — images, video, audio, voice messages, documents and transfer progress.
6. **Groups** — membership, administration, invite links and group messaging.
7. **Notification Center** — message, mention, group and call notification controls.
8. **Security Center** — authentication, sessions, revocation, privacy and security roadmap.
9. **Universal Search** — people, chats, messages, files, links and groups.
10. **Command Center** — fast access to unread items, calls, groups, saved content and security.
11. **Settings Center** — account, privacy, security, notifications, appearance, chat and storage.
12. **Advanced Messaging** — polls, scheduling, reminders, location, contacts and events roadmap.
13. **Advanced Calls** — voice/video foundation, history, signalling and reliability roadmap.
14. **AI Workspace** — rewriting, translation, summaries, smart search, transcription and assistant roadmap.
15. **Performance & Reliability** — optimistic UI, offline outbox, idempotent retries, reconnect/reconciliation, pagination, rendering performance and SLO telemetry.
16. **Global Ecosystem** — stories, communities, channels, business messaging, bots/mini apps, accessibility and global localization.

## 🧪 Release Testing

Do not use a successful Gradle/Vite build as the release gate. Test the real user journey:

```text
APK/browser startup
  ↓
Backend health
  ↓
Registration/login
  ↓
User search
  ↓
Direct chat
  ↓
Realtime send/receive
  ↓
Offline/reconnect/retry
  ↓
Message operations
  ↓
Media
  ↓
Groups
  ↓
Calls
  ↓
Profile/privacy/sessions
  ↓
E2EE behavior
```

See **[Performance Release Gate](./15-performance-release-gate.md)**, **[Remaining Global Features](./15-remaining-global-features.md)** and **[Testing & QA](./04-testing.md)** before production deployment.

## 🚀 Deployment

- **Docker/Nginx:** recommended production frontend/source of truth.
- **Fastify + Socket.IO:** backend API and realtime layer.
- **PostgreSQL + Prisma:** persistent application data.
- **Render:** supported deployment blueprint/reference.
- **Capacitor + Android:** native Android application.

Production secrets must be supplied through secure environment configuration and must never be committed to the repository.

## 🔐 Product & Security Rules

- Authentication and authorization are server-side responsibilities.
- Normal messages must not be silently deleted because they are old.
- Disappearing Messages are explicitly user-controlled.
- Internal encryption envelopes and call-signalling payloads must never render as normal chat messages.
- Encrypted historical messages may require device key material that is unavailable after a device change; cryptographic identity recovery is separate from password recovery.
- Uploaded files require persistent storage in production deployments where container-local storage is ephemeral.
- Never commit passwords, JWT secrets, Firebase private keys, API tokens, database credentials or Android signing keys.
- Performance optimizations must not weaken authorization, rate limiting or encryption boundaries.

## 🔗 Important Repository Areas

- [Web application](../apps/web/)
- [Server application](../apps/server/)
- [Prisma schema](../apps/server/prisma/schema.prisma)
- [Product-center definitions](../apps/server/src/product-center.ts)
- [Render deployment](../render.yaml)
- [CI/CD workflows](../.github/workflows/)

> Keep the README, documentation, tests and product behavior synchronized whenever a feature or architecture changes.
