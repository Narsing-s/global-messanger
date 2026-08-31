# 🌍 Global Messenger

A modern, realtime messaging platform built for people who want fast conversations, voice/video calling, media sharing and a clean cross-device experience.

> **Status:** Active development — web application is available for development/testing. Android/Google Play packaging and production hardening are the next release phase.

## ✨ Features

- 💬 Realtime one-to-one messaging
- 👥 Group conversations
- 😊 Emoji picker and reactions
- ⌨️ Typing indicators and notification/typing sounds
- 📎 Image and file sharing
- ↩️ Message replies
- ✏️ Message editing with a one-hour editing window
- 🗑️ Delete for me / delete for everyone with a one-hour everyone window
- 🧹 Clear chat from the local view
- 💾 Conversation backup/export
- 👤 Profile photo support
- 📞 Voice calls
- 📹 Video calls
- 🔔 Incoming call ringtones
- 🎙️ Microphone mute/unmute
- 📷 Camera on/off during video calls
- ⏱️ Call duration and call logs
- 🔐 JWT authentication and bcrypt password hashing
- 📱 Responsive UI for desktop and mobile browsers

## 🏗️ Architecture

```text
Global Messenger
├── apps/
│   ├── web/          React + Vite client
│   └── server/       Fastify API + Socket.IO server
├── prisma/           PostgreSQL/Prisma data layer
├── docs/             Product, development and release documentation
├── docker-compose.yml
└── package.json
```

### Technology stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Fastify
- **Realtime:** Socket.IO
- **Database:** PostgreSQL + Prisma
- **Authentication:** JWT + bcrypt
- **Media/calls:** WebRTC
- **Deployment:** Docker-compatible hosting

## 🚀 Run locally

### Prerequisites

- Node.js 20+ recommended
- npm
- PostgreSQL, or Docker Desktop
- Git

### 1. Clone

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
```

### 2. Install

```bash
npm install
```

### 3. Configure the server

```bash
cp apps/server/.env.example apps/server/.env
```

On Windows PowerShell you can copy the file manually if `cp` is unavailable.

Configure the database URL, JWT secret, CORS/origin and any media/upload settings in the server environment.

### 4. Prepare Prisma

```bash
npm run db:generate
```

Run the project's database migration command when migrations are available for your environment.

### 5. Start development

```bash
npm run dev
```

Typical development ports:

- Web: `5173`
- API: `4000`

## 🧪 Recommended testing checklist

Before every release, test with at least two separate accounts:

1. Register/login with Account A and Account B.
2. Start a one-to-one chat.
3. Send text, emoji, image and file messages.
4. Confirm the receiver gets realtime messages.
5. Confirm typing indicator and typing sound.
6. Edit a message within one hour.
7. Verify editing is rejected after one hour.
8. Delete a message for yourself.
9. Delete a recent message for everyone.
10. Confirm an older message can no longer be deleted for everyone.
11. Create and test a group chat.
12. Test voice and video calling.
13. Test microphone/camera permission flows.
14. Test mute, camera toggle, accept, decline and end call.
15. Confirm call logs appear in chat history.
16. Upload/change/cancel a profile photo.
17. Export a conversation backup.
18. Test Clear Chat.
19. Test mobile layout in Chrome/Android.
20. Check browser console and server logs for errors.

## 📚 Documentation

See the [`docs/`](./docs) folder for step-by-step documentation:

- [Getting Started](./docs/01-getting-started.md)
- [Architecture](./docs/02-architecture.md)
- [Features](./docs/03-features.md)
- [Testing & QA](./docs/04-testing.md)
- [Production Deployment](./docs/05-production-deployment.md)
- [Android & Play Store](./docs/06-android-play-store.md)
- [Release Checklist](./docs/07-release-checklist.md)
- [Contributing](./docs/08-contributing.md)

## 📱 Android / Google Play roadmap

The recommended path is to package the existing responsive web client as a real Android application using **Capacitor** (or another maintained Android WebView bridge), while keeping the Fastify/Socket.IO backend as the shared production service.

The Android release must be tested specifically for camera/microphone permissions, notifications, background behavior, WebRTC calls, file uploads, deep links, secure storage and network reconnects.

As of **August 31, 2026**, new Google Play apps and app updates must target **Android 16 / API 36 or higher**. citeturn0search0turn0search1

Google Play uses Android App Bundles (`.aab`) for modern distribution and supports internal, closed, open and production testing/release tracks. citeturn0search4turn0search5

## 🛡️ Production requirements

Before public launch, configure:

- HTTPS/WSS for all production traffic
- Strong production JWT secrets
- PostgreSQL backups and restore testing
- Rate limiting and abuse protection
- File type/size validation and safe media storage
- CORS restricted to production domains
- Error logging and monitoring
- Privacy Policy and Terms of Service
- Account/data deletion workflow
- Google Play Data Safety declarations
- Notification permission handling on Android
- Camera/microphone permission disclosures
- Production WebRTC/STUN/TURN configuration
- Secure environment variables; never commit secrets

## 🤝 Contributing

Issues, bug reports, feature ideas and pull requests are welcome. Please read [CONTRIBUTING.md](./docs/08-contributing.md) before submitting a change.

For feature requests, describe the user problem, expected behavior and how you tested the change.

## 🗺️ Roadmap

### Phase 1 — Core messaging

- Realtime messaging
- Authentication
- Groups
- Emoji/reactions
- File sharing

### Phase 2 — Communication

- Voice/video calling
- Call history
- Permission handling
- Notification sounds

### Phase 3 — Account & data

- Persistent profile photos
- Reliable cloud backup/restore
- Account settings
- Privacy controls
- Account deletion

### Phase 4 — Mobile launch

- Android app shell
- Push notifications
- Background call/message handling
- Android permission flows
- Play internal testing
- Closed/open testing
- Production release

### Phase 5 — Scale

- Horizontal Socket.IO scaling
- Redis adapter
- CDN/object storage for media
- Observability and alerting
- Abuse/spam prevention
- Automated CI/CD

## 📄 License

Add the project's chosen open-source or proprietary license before public distribution.

## 🌐 Repository

https://github.com/Narsing-s/global-messanger
