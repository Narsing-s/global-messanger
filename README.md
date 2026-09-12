# 🌍 Global Messenger

> A secure, real-time, self-hostable messaging platform for Web and Android — built to go beyond a basic WhatsApp-style chat experience.

[![Open Source](https://img.shields.io/badge/open--source-yes-success)](https://github.com/Narsing-s/global-messanger)
[![Web](https://img.shields.io/badge/web-React%20%2B%20Vite-blue)](https://github.com/Narsing-s/global-messanger)
[![Backend](https://img.shields.io/badge/backend-Fastify%20%2B%20Socket.IO-orange)](https://github.com/Narsing-s/global-messanger)
[![Database](https://img.shields.io/badge/database-PostgreSQL-informational)](https://github.com/Narsing-s/global-messanger)
[![Mobile](https://img.shields.io/badge/mobile-Capacitor%20%2B%20Android-brightgreen)](https://github.com/Narsing-s/global-messanger)

## 🚀 What is Global Messenger?

Global Messenger is a full-stack messaging platform designed for private communication, real-time delivery, groups, media sharing, calls, multi-device sessions, privacy controls, and self-hosted production deployments.

The product direction is intentionally broader than a conventional messenger: the application is being organized around a **Profile Center, Chat Info, advanced message operations, conversation organization, media center, notification center, security center, universal search, command center, settings center, AI workspace, and advanced calling**.

## ✨ Product Highlights

### 💬 Messaging

- One-to-one conversations
- Group conversations
- Real-time Socket.IO messaging
- Online/offline presence
- Typing indicators
- Delivery and read states
- Message replies and quoted replies
- Message editing and deletion
- Reactions
- Forwarding
- Copy and share
- Star / save messages
- Pin messages
- Message information and timestamps
- Multi-select and bulk message actions
- Message search
- Retry failed messages
- Link previews

### 👤 Profile Center

- Profile photo
- Display name
- Username
- About / bio
- Online-status controls
- Last-seen controls
- Profile preview
- QR/profile sharing
- Copy username
- Account identity information

### 🗂️ Chat & Conversation Management

- Complete chat information
- Contact profile
- Media, files and links views
- Starred messages
- Pinned messages
- Search inside conversations
- Per-chat notification controls
- Disappearing-message controls
- Block and report controls
- Clear chat / delete chat actions
- Favorites and pinned chats
- Archive
- Unread / group / personal filters
- Custom conversation organization
- Saved Messages

### 📎 Media Experience

- Image viewer and gallery
- Video playback
- Audio playback
- Voice messages
- Document previews
- Media grid
- Files and links tabs
- Upload/download progress
- Sharing and downloads
- Common image, audio, video and document uploads

### 👥 Groups

- Group creation
- Group profile and description
- Member management
- Admin controls
- Invite links
- Group messaging
- Group pins
- Group search
- Leave group

### 🔐 Privacy & Security

- JWT authentication
- Password hashing
- Authenticated API routes
- Security headers
- Rate/request protection
- Production CORS controls
- Input validation
- Session management and revocation
- Device/session visibility
- Privacy controls
- Optional end-to-end encrypted message envelopes
- Security/key-management roadmap
- Passkey and biometric security roadmap

### 📞 Calls & Notifications

- Voice-call support/hooks
- Video-call support/hooks
- Socket.IO signalling
- Incoming/outgoing call UI
- Call history and missed calls
- Mute, speaker and camera controls
- Push-notification integration
- Per-chat and global notification controls

### 🔎 Power Features

- Universal search across people, chats, messages, files, links and groups
- Command Center for fast access to unread chats, calls, groups, saved items and security status
- Settings Center
- Multi-device sessions
- Mobile-responsive web application
- Android application through Capacitor
- AI Workspace roadmap for rewriting, translation, summaries, smart search and assistance

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │  Web / Android User  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │ Docker Web / Nginx :8080   │
                    │ React + Vite production UI │
                    └─────────────┬──────────────┘
                                  │ same-origin routes
                     ┌────────────┼─────────────┐
                     ▼            ▼             ▼
                  /api/*    /socket.io/*    /uploads/*
                     │            │             │
                     └────────────┼─────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │ Fastify + Socket.IO :4000  │
                    │ Auth / API / realtime      │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌────────────────────────────┐
                    │ PostgreSQL + Prisma        │
                    │ Users / chats / messages   │
                    │ sessions / media / groups  │
                    └────────────────────────────┘
```

The Docker web service is the recommended production frontend because it serves the built application through Nginx and proxies API, Socket.IO, and upload routes to the backend. This avoids stale or mismatched frontend deployments.

## 🔒 Message Security Model

The application is designed so the chat UI renders **human-readable messages**, not internal transport records.

```text
Compose message
      ↓
Optional E2EE envelope
      ↓
Socket.IO message:send
      ↓
Server authentication + validation
      ↓
Database persistence
      ↓
Realtime delivery
      ↓
Client decrypts supported E2EE content
      ↓
Normal message bubble
```

Encrypted content may appear as an unavailable message on a device that does not possess the required device identity key. Key recovery is therefore a separate security concern from ordinary account/password recovery.

## 🐳 Production Docker Frontend

From the repository root:

```bash
docker compose build --no-cache --pull web
docker compose up -d --force-recreate --no-deps web
```

For the complete stack:

```bash
docker compose down
docker compose build --no-cache --pull
docker compose up -d
```

Default local frontend:

```text
http://localhost:8080
```

Verify the container:

```bash
docker compose ps web
docker compose logs --tail=100 web
curl -I http://localhost:8080/
curl -I http://localhost:8080/index.html
```

`index.html` and `config.js` are deliberately not cached aggressively, while Vite's hashed assets can be cached safely. This helps prevent an old HTML entry point from loading an obsolete JavaScript bundle after deployment.

## 💻 Local Development

Requirements:

- Node.js
- npm
- PostgreSQL for the server
- Android Studio + Android SDK for native Android builds
- Docker for containerized deployment/testing

Install dependencies:

```bash
npm ci
```

Run the development environment:

```bash
npm run dev
```

Run server only:

```bash
npm run dev:server:direct
```

Run web only:

```bash
npm run dev:web:direct
```

Build everything:

```bash
npm run build
```

Verify locally:

```bash
npm run verify:local
npm run smoke
```

## 🗄️ Database

The server uses PostgreSQL through Prisma.

Useful commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
```

Never commit production database credentials.

## 📱 Android

The Android application is generated from the Capacitor web application.

Application ID:

```text
com.globalmessenger.app
```

Commands:

```bash
npm run android:add
npm run android:sync
npm run android:open
npm run android:run
```

Release signing credentials must remain in GitHub Actions Secrets or another secure secret manager.

## ⚙️ Environment Variables

Typical server configuration includes:

```text
DATABASE_URL
JWT_SECRET
WEB_ORIGIN
PASSWORD_RESET_WEB_ORIGIN
UPLOAD_DIR
CRON_SECRET
```

Optional integrations can use environment-provided credentials for email and push notifications.

**Never commit passwords, JWT secrets, Firebase private keys, API tokens, production database URLs, or Android signing keys.**

## 🗺️ Product Roadmap

The roadmap is intentionally split into product centers rather than isolated UI buttons.

### Phase 1 — Core product completeness

- [x] Profile Center foundation
- [x] Chat Info foundation
- [x] Advanced message-operation foundation
- [x] Conversation organization foundation
- [x] Media experience foundation
- [x] Notification Center foundation
- [x] Universal Search foundation
- [x] Command Center foundation
- [x] Settings Center foundation
- [ ] Complete every UI state and edge case for multi-select/bulk actions
- [ ] Complete message-info details across all message types
- [ ] Complete forward/share flows across groups and direct chats

### Phase 2 — Security Center

- [x] Active sessions foundation
- [x] Session revocation
- [x] Privacy controls
- [ ] Two-factor authentication
- [ ] Passkey management
- [ ] App PIN / biometric lock
- [ ] Security verification and device-key management
- [ ] Robust E2EE key recovery strategy

### Phase 3 — Advanced Messaging

- [ ] Polls
- [ ] Scheduled messages
- [ ] Reminders
- [ ] Live location
- [ ] Contact sharing
- [ ] Events/calendar messages
- [ ] Advanced media tools

### Phase 4 — Advanced Calls

- [x] Call UI foundation
- [x] Call history foundation
- [ ] Production TURN infrastructure
- [ ] Group calling
- [ ] Screen sharing hardening
- [ ] Call-quality diagnostics

### Phase 5 — AI Workspace

- [ ] Rewrite
- [ ] Translation
- [ ] Smart reply suggestions
- [ ] Conversation summaries
- [ ] AI message search
- [ ] File understanding
- [ ] Voice transcription
- [ ] Smart notification summaries

## 📚 Documentation

- **[Project Wiki](docs/WIKI.md)** — architecture, product behavior, security, deployment, Android, troubleshooting and roadmap
- **[Documentation index](docs/README.md)** — documentation map
- **[Render configuration](render.yaml)** — deployment blueprint
- **[Database schema](apps/server/prisma/schema.prisma)** — Prisma data model
- **[CI/CD workflows](.github/workflows/)** — automation and Android builds

## 🤝 Contribution Principles

When changing the messenger:

1. Preserve authentication and authorization.
2. Preserve realtime delivery and reconnect behavior.
3. Do not silently delete normal message history.
4. Keep disappearing messages explicitly user-controlled.
5. Never render internal encryption/call-signalling payloads as chat messages.
6. Do not introduce third-party dependencies where an existing first-party implementation already works without a clear reason.
7. Run build, verification and smoke checks before release.
8. Update the documentation when product behavior or architecture changes.

## 📄 License

See the repository license and project files for the current licensing terms.

## 🔗 Repository

urlNarsing-s/global-messanger on GitHubhttps://github.com/Narsing-s/global-messanger

---

**Global Messenger** — private conversations, realtime communication, powerful organization, and a roadmap toward a complete modern communication platform.