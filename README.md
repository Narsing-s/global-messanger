# 🌍 Global Messenger

> **Private, realtime messaging for web and Android.**

Global Messenger is a full-stack messaging application built around fast realtime communication, reliable conversation history, profiles, groups, media sharing, notifications, and Android support.

The project is designed as a single product with a shared TypeScript codebase for the web and Android experience.

![License](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO-010101?logo=socket.io&logoColor=white)
![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84?logo=android&logoColor=white)

---

## ✨ Highlights

- 💬 One-to-one and group conversations
- ⚡ Realtime messaging with Socket.IO
- 👤 Profiles, profile photos, online status, and last seen
- ✍️ Typing indicators, replies, reactions, and message editing
- 🗑️ **Delete for me / Delete for everyone**
- 🧹 **Manual Clear Chat** — messages are not automatically cleared
- 📎 Image and file sharing
- 📌 Pinned messages and bookmarks
- 🔕 Notifications and notification sounds
- 🚫 User blocking
- 📞 Voice/video calling foundation with WebRTC
- 🔐 JWT authentication and bcrypt password hashing
- 🔑 Password recovery with email-based reset flow
- 📱 Android application through Capacitor
- 🤖 Optional AI assistance — messaging works without AI

> **Important:** Global Messenger does not automatically delete or clear users' chats. Conversation history remains available unless the user explicitly uses a message or chat deletion/clear action.

---

## 🚀 Live Project

| Service | Link |
|---|---|
| 🌐 Web App | https://global-messanger.onrender.com |
| 🔌 API | https://global-messanger-backend.onrender.com |
| ❤️ API Health | https://global-messanger-backend.onrender.com/health |
| 💻 GitHub | https://github.com/Narsing-s/global-messanger |

---

## 📱 Android

Android builds are produced through the repository's GitHub Actions release workflow.

### Download a release

Open the latest GitHub Release:

**https://github.com/Narsing-s/global-messanger/releases/latest**

Release assets can include:

| Package | Purpose | Install directly? |
|---|---|---|
| `Global-Messenger.apk` | Android installation package | ✅ Yes |
| `Global-Messenger.aab` | Google Play publishing bundle | ❌ No |
| `.zip` | Build/artifact archive | ❌ No |

### Release process

```text
Code pushed to main
        │
        ├── Web build / deployment
        │
        └── Android build / verification

Create a version tag
        │
        ▼
      v1.0.0
        │
        ▼
Android release workflow
        │
        ├── APK
        ├── AAB
        └── GitHub Release
```

Example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

A normal push to `main` is used for development/build verification. A version tag such as `v1.0.0` is used to publish a production Android release.

See [`docs/06-android-play-store.md`](./docs/06-android-play-store.md) and [`docs/ANDROID_APK.md`](./docs/ANDROID_APK.md).

---

## 🏗️ Architecture

```text
                         GLOBAL MESSENGER
                                │
               ┌────────────────┴────────────────┐
               │                                 │
        React + Vite Web                    Fastify API
        TypeScript + CSS                    Node.js + TS
               │                                 │
        Capacitor Android                    Socket.IO
                                                 │
                                                 ▼
                                      Prisma + PostgreSQL

Local development:
  Docker Compose → PostgreSQL
  Mailpit        → local email testing
```

### Application layers

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI | Responsive CSS + Lucide |
| Backend | Node.js + Fastify + TypeScript |
| Realtime | Socket.IO |
| Database | PostgreSQL + Prisma |
| Authentication | JWT + bcrypt |
| Calls | WebRTC foundation |
| Android | Capacitor + Android |
| Local development | Docker Compose + Mailpit |
| Optional AI | Provider-based integration |

---

## 📁 Repository Structure

```text
.
├── apps/
│   ├── web/                 # React web application + Capacitor Android frontend
│   └── server/              # Fastify API, Socket.IO, Prisma and backend services
├── android/                 # Android project files
├── docs/                    # Product, setup, Android and contributor documentation
├── scripts/                 # Development, verification and maintenance scripts
├── support/                 # Supporting project resources
├── .github/                 # GitHub Actions and repository automation
├── docker-compose.yml       # Local PostgreSQL / Mailpit services
├── render.yaml              # Render deployment configuration
├── package.json             # Workspace scripts and dependencies
└── README.md                # Project documentation
```

---

## 🛠️ Prerequisites

Install the following before running the project locally:

- Node.js 22 or newer
- npm
- PostgreSQL, or Docker Desktop
- Git
- Android Studio + Android SDK for native Android builds

For Android development, use a supported JDK version required by the current Android/Gradle project configuration.

---

## ⚙️ Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Narsing-s/global-messanger.git
cd global-messanger
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start local services

If using Docker:

```bash
docker compose up -d
```

This provides the local services required by the development setup, including PostgreSQL and Mailpit where configured.

### 4. Generate Prisma client

```bash
npm run db:generate
```

### 5. Apply database migrations

For local development:

```bash
npm run db:migrate
```

For an existing production database:

```bash
npm run db:deploy
```

### 6. Start the application

Run the web and server development workflow:

```bash
npm run dev
```

Or run them independently:

```bash
npm run dev:server
npm run dev:web
```

Direct development commands are also available:

```bash
npm run dev:server:direct
npm run dev:web:direct
```

---

## 🧪 Verification

Useful project checks include:

```bash
npm run doctor
npm run verify:local
npm run smoke
npm run build
```

The verification workflow is intended to catch configuration, build, API, database, and local runtime problems before deployment.

---

## 🔐 Authentication & Account Recovery

Global Messenger uses:

- JWT-based authentication
- bcrypt password hashing
- Email-based password recovery
- Password reset links
- Account deletion support

Password-reset email delivery is handled by the application's configured mail server. Local development can use Mailpit to capture emails without sending real messages.

**Never commit passwords, SMTP credentials, JWT secrets, database credentials, API tokens, or other private configuration to Git.** Use environment variables or the secret-management facilities of your deployment platform.

---

## 💬 Messaging Behavior

Global Messenger provides user-controlled message management:

- **Delete for me** removes a message from the current user's view.
- **Delete for everyone** removes a message for conversation participants where supported.
- **Clear Chat** is an explicit user action.
- **Automatic chat clearing is not enabled.**
- Realtime reconnect logic is designed to restore the active messaging session after temporary connection loss.

The product intentionally avoids silently clearing user conversations because message history can be important to users.

---

## 📎 Media & Storage

The application supports image/file sharing through the backend media flow.

Production deployments should use persistent storage for uploaded media. Temporary container filesystems should not be treated as permanent message-media storage.

---

## 📞 Calling

Calling functionality provides the application foundation for voice/video communication using WebRTC.

Production WebRTC deployments may require appropriate STUN/TURN infrastructure and production networking configuration.

---

## 🤖 Optional AI

AI assistance is optional. The core messaging experience does **not** depend on an AI provider.

If AI features are enabled, provider credentials should be configured securely through environment variables and should never be committed to the repository.

---

## 🤝 Contributing

Contributions are welcome — bug fixes, testing, accessibility, UI improvements, Android testing, performance work, documentation, security improvements, and new features are all valuable.

Recommended workflow:

```text
Use the application
       ↓
Find a bug / improvement
       ↓
Open an Issue
       ↓
Create a focused branch
       ↓
Implement + test
       ↓
Open a Pull Request
       ↓
Review + CI
       ↓
Merge
```

Good contributions should be focused and should avoid unrelated changes in the same pull request.

Start here:

- [Issues](https://github.com/Narsing-s/global-messanger/issues)
- [Pull Requests](https://github.com/Narsing-s/global-messanger/pulls)
- [`docs/08-contributing.md`](./docs/08-contributing.md)
- [`docs/11-community-and-contributors.md`](./docs/11-community-and-contributors.md)
- [`docs/SECURITY.md`](./docs/SECURITY.md)
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)

---

## 📚 Documentation

Project documentation is maintained under [`docs/`](./docs).

Useful guides include:

- [`docs/08-contributing.md`](./docs/08-contributing.md) — contribution workflow
- [`docs/11-community-and-contributors.md`](./docs/11-community-and-contributors.md) — community guidance
- [`docs/06-android-play-store.md`](./docs/06-android-play-store.md) — Android and Play Store process
- [`docs/ANDROID_APK.md`](./docs/ANDROID_APK.md) — Android APK build/release information
- [`docs/SECURITY.md`](./docs/SECURITY.md) — security policy

---

## 🚀 Deployment

The repository includes deployment configuration for the current hosting setup.

Before deploying:

1. Configure production environment variables.
2. Configure a persistent PostgreSQL database.
3. Configure persistent media storage.
4. Run database migrations with `npm run db:deploy`.
5. Verify the API health endpoint.
6. Verify authentication and password recovery.
7. Verify realtime reconnect and message delivery.
8. Verify media upload/download behavior.
9. Verify the web production build.
10. Build and verify the Android package when releasing Android.

---

## 📄 License

This project is licensed under the **MIT License**. See [`LICENSE`](./LICENSE).

---

## 🌍 Project

**Global Messenger** — one messaging product for web and Android, built with a realtime-first architecture and user-controlled conversation history.

**Repository:** https://github.com/Narsing-s/global-messanger
