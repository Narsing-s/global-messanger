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

## 👥 Community & contributors

Global Messenger is an open-source project and contributions are welcome. You do **not** need to be an expert in the whole codebase. Small improvements are valuable: bug fixes, UI polish, documentation, tests, accessibility, Android testing, performance improvements and new features.

### Try the product first

The easiest way to become a contributor is to use the application and report what you would improve.

1. Open the live web app.
2. Create a test account.
3. Test one-to-one chat, groups, profiles, media, notifications and calling.
4. Report bugs or suggest improvements through GitHub Issues.
5. For code changes, read [`docs/08-contributing.md`](./docs/08-contributing.md).

### How contributors can help

| Contribution | Examples |
|---|---|
| 🐛 Bug fixes | Realtime bugs, UI problems, reconnect issues |
| 🎨 UI/UX | Responsive design, accessibility, mobile polish |
| 📱 Android | Device testing, Capacitor improvements, Play Store readiness |
| 🧪 Testing | Regression tests, two-account testing, edge cases |
| 🔐 Security | Safe validation, authorization and privacy improvements |
| ⚡ Performance | Faster chat loading, uploads, database and Socket.IO improvements |
| 📚 Documentation | Setup guides, troubleshooting, architecture and examples |
| ✨ Features | Reactions, profiles, groups, calls and other roadmap work |

### Contributor workflow

```text
Use Global Messenger
        ↓
Find a problem or improvement
        ↓
Open a GitHub Issue
        ↓
Discuss / get the issue assigned
        ↓
Fork → branch → code → test
        ↓
Open Pull Request
        ↓
Review + CI
        ↓
Merge
```

Good first contributions should be small and focused. Avoid unrelated changes in the same pull request.

**Start here:**

- Issues: https://github.com/Narsing-s/global-messanger/issues
- Pull requests: https://github.com/Narsing-s/global-messanger/pulls
- Contributing guide: [`docs/08-contributing.md`](./docs/08-contributing.md)
- Community guide: [`docs/11-community-and-contributors.md`](./docs/11-community-and-contributors.md)
- Security policy: [`docs/SECURITY.md`](./docs/SECURITY.md)

## 📱 Android releases

Android releases use a **versioned GitHub Release flow**.

### Download the latest Android release

**👉 https://github.com/Narsing-s/global-messanger/releases/latest**

Open the latest release and use the **Assets** section:

```text
Global-Messenger.apk   ← direct Android installation
Global-Messenger.aab   ← Google Play Console upload
```

The APK is a real Android Package (`application/vnd.android.package-archive`) and can be installed directly on an Android device. The AAB is a Play Store publishing bundle and cannot be installed directly like an APK.

### APK vs AAB vs ZIP

| File | Purpose | Directly install on Android? |
|---|---|---|
| `Global-Messenger.apk` | Android application package | ✅ Yes |
| `Global-Messenger.aab` | Google Play publishing bundle | ❌ No |
| `.zip` | Source/archive or GitHub Actions artifact container | ❌ No |

### Release flow

```text
Code change on main
       │
       ├── Web workflow → build/deploy web app
       │
       └── Android workflow → build + verify APK/AAB artifact

Create version tag, for example:
       v1.0.0
       │
       ▼
Android workflow
       │
       ├── signed Global-Messenger.apk
       ├── Global-Messenger.aab
       └── GitHub Release: v1.0.0
```

A normal push to `main` **does not create or replace a production GitHub Release**. It only runs the Android build/verification and uploads the packages as a GitHub Actions artifact. A production Android Release is created when a semantic version tag such as `v1.0.0`, `v1.0.1`, or `v1.1.0` is pushed.

Example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions then builds the signed APK and AAB, verifies the packages, and publishes them to the matching GitHub Release. The release marked **Latest** becomes the destination of the `releases/latest` link.

For the complete Android process, see [`docs/06-android-play-store.md`](./docs/06-android-play-store.md) and [`docs/ANDROID_APK.md`](./docs/ANDROID_APK.md).

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
