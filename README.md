# 🌍 Global Messenger

> A secure, real-time, self-hostable messaging platform for Web and Android — built to go beyond a basic WhatsApp-style chat experience.

[![Open Source](https://img.shields.io/badge/open--source-yes-success)](https://github.com/Narsing-s/global-messanger)
[![Web](https://img.shields.io/badge/web-React%20%2B%20Vite-blue)](https://github.com/Narsing-s/global-messanger)
[![Backend](https://img.shields.io/badge/backend-Fastify%20%2B%20Socket.IO-orange)](https://github.com/Narsing-s/global-messanger)
[![Database](https://img.shields.io/badge/database-PostgreSQL-informational)](https://github.com/Narsing-s/global-messanger)
[![Mobile](https://img.shields.io/badge/mobile-Capacitor%20%2B%20Android-brightgreen)](https://github.com/Narsing-s/global-messanger)

## 🚀 What is Global Messenger?

Global Messenger is a full-stack messaging platform for private conversations, groups, realtime communication, media sharing, calls, sessions, privacy controls and multi-device use.

The product is intentionally being developed as a **communication workspace**, not only a chat screen. Its major product centers include Profile, Chat Info, Message Tools, Conversation Organization, Media, Groups, Notifications, Security, Universal Search, Command Center, Settings, Advanced Messaging, Advanced Calls and an AI Workspace roadmap.

> **Feature-status rule:** a feature described as a *foundation* or *roadmap* item does not mean every UI state, edge case, platform-specific behavior or production integration is complete. The [Feature Matrix](docs/03-features.md) is the source of truth for feature scope.

## ✨ Product Highlights

### 💬 Messaging

- One-to-one and group conversations
- Realtime Socket.IO messaging
- Presence and typing indicators
- Delivery/read states where supported
- Replies and quoted replies
- Editing and deletion with server-side authorization
- Reactions
- Forwarding, copy, star/save and pin foundations
- Message information
- Multi-select and bulk-action foundation
- Message search
- Retry failed messages
- Image, audio/video and document attachments

### 👤 Profile Center

- Profile photo
- Display name
- Username
- About/bio
- Online-status and last-seen privacy controls
- Profile preview
- QR/profile sharing foundation
- Account identity information

### 🗂️ Chat & Conversation Management

- Chat Info for direct chats and groups
- Shared media, files and links
- Starred and pinned messages
- Search inside conversations
- Per-chat notifications
- Disappearing-message controls
- Block/report controls
- Favorites, pinned chats and archive
- Unread/group/personal filters
- Saved Messages

### 📎 Media & Groups

- Image/gallery experience
- Video and audio playback
- Voice-message foundation
- Document previews
- Upload/download progress
- Group creation and management
- Member/admin controls
- Invite links
- Group messaging, pins and search foundation

### 🔐 Privacy & Security

- JWT authentication
- Password hashing
- Authenticated API routes
- Security headers and request protection
- Production CORS controls
- Input/MIME validation
- Session visibility and revocation
- Privacy controls
- Optional encrypted message envelopes
- Passkey, 2FA, PIN/biometric and advanced E2EE key-management roadmap

### 📞 Calls & Notifications

- Voice/video call UI foundation
- Socket.IO signalling foundation
- Incoming/outgoing call states
- Mute, speaker and camera controls
- Call history/missed calls
- Notification controls and push-notification integration hooks
- Production TURN and group-calling roadmap

### 🔎 Power Features

- Universal search across people, chats, messages, files, links and groups
- Command Center for fast access to unread chats, calls, groups, saved content and security
- Settings Center
- Multi-device sessions
- Responsive web application
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

The Docker web service is the recommended production frontend/source of truth because it serves the current Vite build and proxies API, Socket.IO and upload routes to the backend.

## 🔒 Message Security & Rendering

The normal chat UI must display a human-readable message when the recipient device has the required cryptographic identity/key material.

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

If a device shows `🔒 Encrypted message (not available on this device)`, investigate device identity/key exchange rather than displaying ciphertext or internal transport records as the normal message. Account password recovery and cryptographic identity recovery are separate security concerns.

## 🐳 Docker Production Frontend

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

## 🧪 End-to-End Testing

Do not treat a successful Vite/Gradle build as proof that the application works. Test the real user journey.

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

### Production backend smoke test

The configured production backend exposes a health endpoint:

```text
https://global-messanger-backend.onrender.com/health
```

Run:

```bash
curl -i https://global-messanger-backend.onrender.com/health
```

Expected: HTTP `200` with an `ok: true` health response.

### Android / Capacitor CORS

Native Android requests use the Capacitor origin `capacitor://localhost`. Verify production CORS before debugging application features:

```bash
curl -i -X OPTIONS "https://global-messanger-backend.onrender.com/api/auth/login-email" \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

### Android diagnostics

If the APK reports **Failed to fetch**, check internet access, `/health`, the production API URL, CORS, Android `INTERNET` permission and WebView/logcat output.

```bash
adb devices
adb logcat -c
adb logcat | grep -i -E "GlobalMessenger|Capacitor|chromium|Console|Exception|Error|FATAL"
```

Windows PowerShell:

```powershell
adb devices
adb logcat -c
adb logcat | Select-String "GlobalMessenger|Capacitor|chromium|Console|Exception|Error|FATAL"
```

### Registration behavior

Welcome-email delivery is an optional integration and must not make account creation appear to fail after the database account has been created. Registration should return authentication/user data even when the optional welcome email cannot be delivered.

For the complete QA matrix, see **[docs/04-testing.md](docs/04-testing.md)**.

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

Run development:

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

Build and verify:

```bash
npm run build
npm run verify:local
npm run smoke
```

## 🗄️ Database

The server uses PostgreSQL through Prisma.

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
```

Never commit production database credentials.

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

Optional email/push integrations use environment-provided credentials.

**Never commit passwords, JWT secrets, Firebase private keys, API tokens, production database URLs or Android signing keys.**

## 🗺️ Product Roadmap

### Phase 1 — Core product completeness

- [x] Product-center foundation
- [x] Profile Center foundation
- [x] Chat Info foundation
- [x] Message Tools foundation
- [x] Conversation Organization foundation
- [x] Media foundation
- [x] Universal Search foundation
- [x] Command Center foundation
- [x] Settings Center foundation
- [ ] Complete every UI state and edge case for multi-select/bulk actions
- [ ] Complete message-info details across all message types
- [ ] Complete forward/share flows across all conversation types
- [ ] Harden media transfer/retry/offline behavior

### Phase 2 — Security Center

- [x] Session visibility/revocation foundation
- [x] Privacy controls
- [ ] Two-factor authentication
- [ ] Passkey management
- [ ] App PIN / biometric lock
- [ ] Device/key verification
- [ ] Robust E2EE key recovery

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

- **[Documentation index](docs/README.md)** — documentation map and product-center overview.
- **[Project Wiki](docs/WIKI.md)** — detailed product behavior, architecture, security, retention and operations.
- **[Feature Matrix](docs/03-features.md)** — current/foundation/roadmap feature status.
- **[Testing & QA](docs/04-testing.md)** — complete browser, Android, messaging, media, groups, calls and security test matrix.
- **[Getting Started](docs/01-getting-started.md)** — local setup.
- **[Architecture](docs/02-architecture.md)** — service boundaries and data flow.
- **[Production Deployment](docs/05-production-deployment.md)** — deployment guidance.
- **[Android / Play Store](docs/06-android-play-store.md)** — Android release preparation.
- **[Release Checklist](docs/07-release-checklist.md)** — release gate.
- **[Contributing](docs/08-contributing.md)** — contribution rules.
- **[Production Operations](docs/12-production-operations.md)** — operational guidance.

## 🤝 Contribution Principles

1. Preserve authentication and authorization.
2. Preserve realtime delivery and reconnect behavior.
3. Do not silently delete normal message history.
4. Keep disappearing messages explicitly user-controlled.
5. Never render internal encryption/call-signalling payloads as chat messages.
6. Preserve server-side authorization for destructive operations.
7. Run build, verification and end-to-end smoke checks before release.
8. Update documentation whenever product behavior, security rules or architecture changes.
9. Never commit secrets or production credentials.

## 📄 License

See the repository license and project files for the current licensing terms.

## 🔗 Repository

[**Narsing-s/global-messanger on GitHub**](https://github.com/Narsing-s/global-messanger)

---

**Global Messenger** — private conversations, realtime communication, powerful organization, and a roadmap toward a complete modern communication platform.
