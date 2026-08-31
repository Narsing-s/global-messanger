# 🌍 Global Messenger

A modern realtime messaging and calling platform built for fast conversations, voice/video calls, media sharing and a clean cross-device experience.

> **Status:** Active development. Web features are being hardened while the Android/Google Play release pipeline is being prepared.

## ✨ Features

- 💬 Realtime one-to-one messaging
- 👥 Group conversations
- 😊 Emoji picker and reactions
- ⌨️ Typing indicators and typing sounds
- 🔔 Notification sounds and incoming call ringtones
- 📎 Image and file sharing
- ↩️ Message replies
- ✏️ Message editing with a one-hour window
- 🗑️ Delete for me / delete for everyone with a one-hour everyone window
- 🧹 Clear chat
- 💾 Conversation backup/export
- 👤 Profile photo support
- 📞 Voice calls
- 📹 Video calls
- 🎙️ Microphone mute/unmute
- 📷 Camera on/off
- 🔐 JWT authentication and bcrypt password hashing
- 📋 Call logs in conversations
- 📱 Responsive desktop/mobile web UI
- 🤖 Android packaging with Capacitor

## 🏗️ Architecture

```text
Global Messenger
├── apps/
│   ├── web/          React + TypeScript + Vite + Capacitor
│   └── server/       Fastify API + Socket.IO
├── prisma/           PostgreSQL/Prisma data layer
├── docs/             Development, deployment and release guides
├── .github/
│   └── workflows/
│       └── android-build.yml
└── package.json
```

## 🧰 Technology stack

- Frontend: React, TypeScript, Vite, Lucide
- Mobile: Capacitor Android
- Backend: Node.js, Fastify, Socket.IO
- Database: PostgreSQL + Prisma
- Authentication: JWT + bcrypt
- Calls: WebRTC
- Deployment: Docker-compatible hosting

## 🚀 Run locally

### Prerequisites

- Node.js 22 recommended
- npm
- PostgreSQL or Docker Desktop
- Git

### Install

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
npm install
npm run db:generate
npm run dev
```

Typical development ports:

- Web: `5173`
- API: `4000`

## 🤖 Build the Android app

The Android application uses Capacitor around the existing React/Vite client. Capacitor supports adding Android to an existing web application and syncing the built web assets into the native project. citeturn1search0turn1search1

### First Android build on Windows

Install Android Studio and Android SDK/API 36+, then:

```powershell
cd C:\Users\91938\Desktop\global-messanger
npm install
npm run build -w apps/web
npm run android:add
npm run android:sync
npm run android:open
```

The generated native project is:

```text
apps/web/android
```

To run on a connected Android phone:

```powershell
npm run android:run
```

### Android application identity

```text
App name:       Global Messenger
Application ID: com.globalmessenger.app
Web directory:  apps/web/dist
```

### CI Android build

`.github/workflows/android-build.yml` automatically creates the Capacitor Android project and produces a debug APK artifact on matching pushes or manual workflow runs.

The CI APK is for testing. A Play Store release must be a properly signed Android App Bundle (`.aab`).

## 🏪 Google Play release

Google's current requirement is that, starting **August 31, 2026**, new apps and updates submitted to Google Play target **Android 16 / API 36 or higher**. citeturn0search0

Recommended release path:

```text
Production backend
      ↓
Android build
      ↓
Real-device QA
      ↓
Signed .aab
      ↓
Play internal testing
      ↓
Closed testing
      ↓
Production review
      ↓
🌍 Global Messenger on Google Play
```

Before public release, complete the Privacy Policy, Terms of Service, Data Safety, account deletion, production HTTPS/WSS, WebRTC TURN and media-storage requirements.

## 🧪 Two-account QA

Always test with separate Account A and Account B:

1. Register/login.
2. Start one-to-one chat.
3. Send text and emoji.
4. Confirm realtime delivery.
5. Test typing indicator and typing sound.
6. Test edit within one hour.
7. Test delete for me.
8. Test delete for everyone within one hour.
9. Confirm older messages cannot be deleted for everyone.
10. Test group chat.
11. Test voice/video call.
12. Test camera/microphone permissions.
13. Test ringtone, accept, decline and end call.
14. Confirm call logs appear in chat.
15. Change/cancel profile photo.
16. Export chat backup.
17. Test Clear Chat.
18. Test network loss and reconnect.

## 📚 Documentation

- [Getting Started](./docs/01-getting-started.md)
- [Architecture](./docs/02-architecture.md)
- [Features](./docs/03-features.md)
- [Testing & QA](./docs/04-testing.md)
- [Production Deployment](./docs/05-production-deployment.md)
- [Android & Play Store](./docs/06-android-play-store.md)
- [Release Checklist](./docs/07-release-checklist.md)
- [Contributing](./docs/08-contributing.md)

## 🛡️ Production requirements

Before public launch:

- HTTPS/WSS everywhere
- Strong JWT secrets
- PostgreSQL backup/restore testing
- Rate limiting and abuse protection
- Safe media storage and validation
- Restricted CORS
- Error monitoring
- Privacy Policy and Terms
- Account/data deletion
- Accurate Play Data Safety declaration
- Android camera/microphone/notification permission handling
- Production STUN/TURN configuration
- Secure environment variables

## 🤝 Contributing

Issues, bug reports, feature ideas and pull requests are welcome. See [Contributing](./docs/08-contributing.md).

## 🌐 Repository

https://github.com/Narsing-s/global-messanger
