# 📚 Global Messenger Documentation

Welcome to the **Global Messenger** documentation hub.

Global Messenger is a secure, real-time messaging platform for Web and Android with private chats, groups, media, calls, privacy controls, multi-device sessions, and an expanding set of advanced messenger features.

## 🧭 Start Here

- **[🌍 Project Wiki](./WIKI.md)** — complete product, architecture, security, deployment, troubleshooting and roadmap reference.
- **[🏠 Project README](../README.md)** — public project overview, setup instructions, Android testing and product roadmap.
- **[📱 Android APK Testing Guide](./ANDROID-TESTING.md)** — exact APK installation, backend health, CORS, registration/login, messaging, calls, E2EE and logcat troubleshooting procedure.

## 🧩 Product Centers

The application is organized around these major product areas:

1. **Profile Center** — profile photo, display name, username, bio, status, privacy and profile sharing.
2. **Chat Info** — contact/group information, media, files, links, starred/pinned items and chat controls.
3. **Message Tools** — reply, forward, copy, star/save, pin, message info, retry and multi-select/bulk operations.
4. **Conversation Organization** — favorites, pinned chats, archive, filters, folders and Saved Messages.
5. **Media Center** — images, video, audio, voice messages, documents, galleries and upload/download progress.
6. **Notification Center** — message, mention, group and call notifications with per-chat controls.
7. **Security Center** — active devices, session management, privacy, 2FA/passkeys/biometric roadmap and key management.
8. **Universal Search** — people, chats, messages, files, links and groups.
9. **Command Center** — unread items, calls, groups, saved content, files, security and quick actions.
10. **Settings Center** — account, privacy, security, notifications, appearance, chat, storage, language and about.
11. **Advanced Messaging** — polls, scheduled messages, reminders, location, contacts and events roadmap.
12. **Advanced Calls** — calling, history, group calling, screen sharing and TURN reliability roadmap.
13. **AI Workspace** — rewriting, translation, summaries, smart search, transcription and assistant roadmap.

The feature-center definitions are maintained in `apps/server/src/product-center.ts`.

## 🧪 Release Testing

Use the Android testing guide before accepting an APK as working. A successful Gradle build only proves that the package can be produced; it does not prove backend connectivity, authentication, realtime messaging, media, calls or E2EE work on a real device.

Recommended order:

```text
APK install → app startup → /health → registration → login →
user search → direct chat → realtime message → message operations →
media → groups → calls → sessions/privacy → E2EE
```

The guide also covers the native Capacitor origin `capacitor://localhost`, Android `INTERNET` permission, production API configuration and `adb logcat` diagnostics.

## 🚀 Deployment Documentation

- **Docker frontend:** recommended production frontend/source of truth.
- **Render:** deployment blueprint in `../render.yaml`.
- **Environment:** production secrets must be supplied through the deployment environment.
- **Database:** PostgreSQL with Prisma migrations.
- **Android:** Capacitor-based Android application with native Gradle build support.

## 🛡️ Important Product Rules

- Normal messages must not be silently deleted because they are old.
- Disappearing Messages must remain an explicit user-controlled option.
- Internal encryption/call-signalling payloads must never be rendered as normal chat messages.
- Authentication and authorization must be preserved when changing features.
- Production secrets must never be committed to GitHub.
- Major architecture or product-behavior changes should update the README and wiki.

## 🔗 Repository Areas

- [Web application](../apps/web/)
- [Server application](../apps/server/)
- [Database schema](../apps/server/prisma/schema.prisma)
- [Product-center definitions](../apps/server/src/product-center.ts)
- [Render deployment](../render.yaml)
- [CI/CD workflows](../.github/workflows/)

> Keep the documentation synchronized with actual product behavior, security rules, deployment architecture and supported features.