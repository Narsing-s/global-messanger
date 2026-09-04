# 🌍 Global Messenger — Project Wiki

> A modern, secure, real-time messaging platform for web and Android.

**Repository:** `Narsing-s/global-messanger`  
**Production web app:** `https://global-messanger.onrender.com/`  
**Android application ID:** `com.globalmessenger.app`

---

## 📚 Contents

- [Overview](#-overview)
- [Core Features](#-core-features)
- [Messaging](#-messaging)
- [Privacy & Security](#-privacy--security)
- [Disappearing Messages](#-disappearing-messages)
- [Chat Retention](#-chat-retention)
- [Media & Files](#-media--files)
- [Calls](#-calls)
- [Notifications](#-notifications)
- [Accounts & Sessions](#-accounts--sessions)
- [Groups](#-groups)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Environment Configuration](#-environment-configuration)
- [Local Development](#-local-development)
- [Production Deployment](#-production-deployment)
- [Android Build](#-android-build)
- [Security Principles](#-security-principles)
- [Troubleshooting](#-troubleshooting)
- [Development Roadmap](#-development-roadmap)

---

## 🌟 Overview

Global Messenger is a full-stack real-time messenger designed around a clean chat experience, persistent conversations, privacy controls, media sharing, groups, calling, push notifications, and optional end-to-end encrypted message content.

The application has three main layers:

```text
┌─────────────────────────────────────────────┐
│                 Global Messenger             │
├─────────────────────────────────────────────┤
│  Web / Android Client                        │
│  React + Vite + Capacitor                    │
├─────────────────────────────────────────────┤
│  Real-time Application Server                │
│  Fastify + Socket.IO                         │
├─────────────────────────────────────────────┤
│  Persistent Data                             │
│  PostgreSQL + Prisma                         │
└─────────────────────────────────────────────┘
```

---

## ✨ Core Features

### Messaging

- One-to-one conversations
- Group conversations
- Real-time Socket.IO delivery
- Message editing
- Message deletion
- Replies
- Reactions
- Forwarding
- Read and delivery indicators
- Typing indicators
- Message search
- Pinned messages
- File and media attachments
- Voice messages

### Account

- Email registration
- Username login
- Email login
- Password reset by email
- Profile display name
- Profile photo
- Privacy controls
- Multi-device session management

### Communication

- Voice calls
- Video calls
- Call signalling through the real-time connection
- Push notifications on supported mobile devices

### Groups

- Create groups
- Rename groups
- Add members
- Remove members
- Group information
- Group administration controls

---

## 💬 Messaging

The chat interface is designed to show **human-readable messages only**.

Internal transport payloads, encryption envelopes, and call-signalling messages are not intended to appear as chat messages. The web client filters these internal records before rendering the conversation or chat preview.

### Message lifecycle

```text
User writes message
       ↓
Optional encryption
       ↓
Socket.IO message:send
       ↓
Server validates & persists
       ↓
Real-time delivery
       ↓
Recipient decrypts when applicable
       ↓
Clean message bubble
```

---

## 🔐 Privacy & Security

Global Messenger uses multiple layers of application security:

- JWT-based authentication
- Password hashing
- Authenticated API routes
- Production security headers
- Request/rate protection
- Restricted production CORS origins
- Input validation for important endpoints
- File MIME-type validation
- Token hashing for stored sessions
- Session revocation
- Optional end-to-end encrypted message envelopes

### End-to-end encryption

The web client maintains a device identity key and registers its public key with the server. Message content can be encrypted into an `gm:e2ee:v1:` envelope before transport.

The server stores the encrypted message body rather than relying on the UI to hide raw transport data. The client decrypts supported messages before displaying them.

> **Important:** Losing the browser/device identity key can prevent that device from decrypting historical encrypted messages. Production key recovery should therefore be treated as a separate security feature.

---

## ⏱️ Disappearing Messages

Disappearing Messages is an **explicit user-controlled chat option**.

### Off

When the option is **Off**:

- Normal messages do not expire.
- There is no automatic message deletion timer.
- Messages remain available according to normal account/chat actions.

### On

When enabled for a conversation, newly created messages can receive an expiry time.

Only messages with an explicit expiry timestamp are eligible for expiry cleanup.

```text
Disappearing Messages: OFF
        ↓
expiresAt = null
        ↓
Message remains
```

```text
Disappearing Messages: ON
        ↓
expiresAt = creation time + selected period
        ↓
Message can expire
```

Existing manual **Clear Chat** and **Delete Chat** actions remain user-controlled and are not replaced by an automatic timer.

---

## 🗄️ Chat Retention

Global Messenger does **not** automatically delete normal user messages because they are old.

The current retention policy is:

1. Normal messages have no automatic expiry.
2. Disappearing messages can expire only when explicitly enabled.
3. Conversations inactive for 60+ days may be archived from the active chat list.
4. Archiving is not the same as deleting the message database records.
5. Opening/creating a direct conversation can restore an archived conversation to active use.

```text
Normal message
    │
    ├── Disappearing OFF → keep
    │
    └── Disappearing ON → expire according to selected timer

Inactive conversation > 60 days
    │
    └── Archive from active list
          │
          └── Do not delete message history
```

---

## 📎 Media & Files

The messenger supports file attachments through the server upload endpoint.

Supported upload categories currently include common:

- JPEG images
- PNG images
- WebP images
- GIF images
- MP3 audio
- WAV audio
- OGG audio
- MP4 video
- WebM video
- PDF documents
- Plain text
- ZIP archives

Production uploads use persistent storage configured by the deployment environment.

---

## 📞 Calls

Voice and video calls use browser/mobile WebRTC capabilities with Socket.IO used for signalling.

The current client includes a Google STUN server for ICE discovery. For consistently reliable production calls across restrictive NAT/firewall networks, a production TURN service should be configured as a future reliability enhancement.

---

## 🔔 Notifications

Push notification support is integrated for supported mobile environments.

The server can use Firebase Cloud Messaging when the required Firebase server environment variables are configured.

No Firebase credentials are hard-coded into the repository.

Without Firebase credentials, the push delivery integration safely remains inactive rather than embedding a secret in source code.

---

## 🖥️ Accounts & Sessions

Users can manage authenticated sessions from the application.

Session records include information such as:

- Device name
- Platform
- User agent
- IP address
- Creation time
- Last activity
- Expiration
- Revocation state

A user can revoke an individual session or revoke other active sessions.

Authentication tokens are hashed before being stored for session tracking.

---

## 👥 Groups

Group conversations support:

- Group creation
- Group naming
- Member management
- Group information
- Group administration
- Group messaging
- Group pins
- Group search and message actions

Group membership and administrative operations are handled by authenticated server APIs.

---

## 🗂️ Project Structure

```text
Global Messenger/
│
├── apps/
│   ├── web/
│   │   ├── public/              # Static web assets and UI fixes
│   │   ├── scripts/             # Build-time frontend patches
│   │   └── src/
│   │       ├── api.ts            # API client
│   │       ├── main.tsx          # Main React application
│   │       ├── features.ts       # Messenger features
│   │       ├── e2ee.ts           # Client-side encryption
│   │       ├── e2ee-bootstrap.ts # Encryption integration
│   │       ├── push.ts           # Push notification client
│   │       └── styles.css        # Application styling
│   │
│   └── server/
│       ├── prisma/
│       │   ├── schema.prisma     # Database schema
│       │   └── migrations/       # Database migrations
│       ├── scripts/              # Server build/runtime patches
│       └── src/
│           ├── index.ts           # Fastify/Socket.IO server
│           ├── advanced-features.ts
│           └── push-notifications.ts
│
├── docs/
│   └── WIKI.md                   # This project wiki
│
├── .github/workflows/            # CI/CD and Android build workflows
├── render.yaml                   # Render deployment blueprint
├── package.json                  # Workspace configuration
└── README.md
```

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Web UI | React 19 |
| Build tool | Vite 6 |
| Language | TypeScript |
| Icons | Lucide React |
| Real-time | Socket.IO |
| Backend | Fastify 5 |
| Database ORM | Prisma 6 |
| Database | PostgreSQL |
| Authentication | JWT + bcrypt |
| Mobile | Capacitor 7 |
| Android | Native Android / Gradle |
| Push | Firebase Cloud Messaging integration |
| Hosting | Render |

---

## ⚙️ Environment Configuration

Secrets must be supplied through the deployment environment or local environment configuration.

### Server configuration

Typical production configuration includes:

```text
DATABASE_URL
JWT_SECRET
WEB_ORIGIN
PASSWORD_RESET_WEB_ORIGIN
UPLOAD_DIR
CRON_SECRET
```

### Gmail password reset

Password-reset mail is designed to use Gmail SMTP/Nodemailer configuration rather than requiring a third-party email API provider.

SMTP credentials must never be committed to GitHub.

### Push notifications

If FCM is enabled, configure the Firebase server credentials as environment variables. Do not put private keys directly into source files.

---

## 💻 Local Development

From the repository root:

```bash
npm install
```

Run the complete development environment:

```bash
npm run dev
```

Run the server directly:

```bash
npm run dev:server:direct
```

Run the web client directly:

```bash
npm run dev:web:direct
```

Run the production build:

```bash
npm run build
```

Run local verification:

```bash
npm run verify:local
```

Run smoke tests:

```bash
npm run smoke
```

---

## 🚀 Production Deployment

The production deployment is configured through `render.yaml`.

High-level deployment flow:

```text
GitHub main
    ↓
Render build
    ↓
Frontend build + backend build
    ↓
Prisma migration deployment
    ↓
Fastify server
    ↓
React/Vite web application
```

### Production checklist

Before releasing:

- [ ] Database connection configured
- [ ] JWT secret configured
- [ ] Production CORS origins verified
- [ ] Gmail SMTP configured if password recovery is enabled
- [ ] Persistent upload storage configured
- [ ] Push credentials configured if push notifications are required
- [ ] Database migrations applied
- [ ] Web build succeeds
- [ ] Server build succeeds
- [ ] Login/register tested
- [ ] Password reset tested
- [ ] One-to-one messaging tested
- [ ] Group messaging tested
- [ ] Media upload tested
- [ ] Mobile build tested

---

## 📱 Android Build

The Android app is produced from the Capacitor web application.

Application ID:

```text
com.globalmessenger.app
```

Useful commands:

```bash
npm run android:add
npm run android:sync
npm run android:open
npm run android:run
```

The repository also contains an Android GitHub Actions workflow capable of producing release APK/AAB artifacts when the required signing secrets are configured.

Release signing secrets should remain in GitHub Actions Secrets and must never be committed to the repository.

---

## 🛡️ Security Principles

Global Messenger follows these project rules:

### Never commit

- Passwords
- JWT secrets
- Gmail passwords
- Firebase private keys
- Android keystores
- API tokens
- Production database credentials

### Always validate

- Authentication state
- User permissions
- Group membership
- Uploaded file types
- Request bodies
- Message ownership
- Session ownership

### Privacy defaults

The application exposes privacy controls for last-seen information and profile photos.

---

## 🧪 Troubleshooting

### Messages show raw technical payloads

The web build contains a message-display cleanup layer that removes internal call-signalling records and decrypts supported E2EE envelopes before rendering.

After pulling the latest code, rebuild the web application so the build-time display patch is applied.

### Encrypted message cannot be opened

The message may belong to a device identity that is not available in the current browser/device. E2EE identity recovery is intentionally separate from ordinary account password recovery.

### Password reset does not arrive

Check:

1. Gmail SMTP environment variables.
2. SMTP connectivity from the hosting provider.
3. Sender/account security settings.
4. Application logs for the exact SMTP error.

### Upload fails

Check:

1. `UPLOAD_DIR`.
2. Production persistent disk configuration.
3. File MIME type.
4. Server upload size limits.
5. Storage permissions.

### Calls connect unreliably

STUN can be sufficient for many networks, but restrictive NAT/firewall environments may require TURN infrastructure for dependable production WebRTC connectivity.

---

## 🗺️ Development Roadmap

### Production stability

- [x] Build and environment hardening
- [x] Authentication flows
- [x] Realtime reconnect handling
- [x] Message delivery reliability improvements
- [x] Media upload handling
- [x] Persistent upload configuration
- [x] Production security/rate protection
- [x] Production CORS configuration

### Messenger UX

- [x] Contact/profile APIs
- [x] Chat information
- [x] Group administration
- [x] Message search
- [x] Media/files
- [x] Pinned messages
- [x] Read/delivery indicators
- [x] Mobile-oriented UI improvements

### Advanced messenger

- [ ] Production TURN-based call reliability
- [x] Push notification integration
- [x] Multi-device sessions
- [x] Privacy controls
- [x] Message forwarding
- [x] Optional disappearing messages
- [x] Android/Capacitor integration
- [ ] Final Play Store release validation

---

## 📌 Product Rules

These rules are important to preserve during future development:

1. **Do not automatically delete normal user messages.**
2. **Do not introduce automatic clear-chat behavior.**
3. **Disappearing Messages must remain an explicit user-controlled option.**
4. **Off means normal messages remain persistent.**
5. **Manual Clear Chat/Delete Chat actions remain available to the user.**
6. **A 60-day inactive-chat policy may archive old conversations from the active list, but must not silently delete their message history.**
7. **Never expose internal encryption or call-signalling payloads in the human chat interface.**
8. **Never commit secrets or private credentials to the repository.**
9. **Do not replace working core messenger behavior with third-party API dependencies without a clear product requirement.**

---

## 🤝 Contribution Guidelines

Before changing a core messenger feature:

1. Understand the existing API and database flow.
2. Preserve authentication and authorization checks.
3. Preserve realtime behavior.
4. Preserve message history unless the user explicitly requests deletion.
5. Keep technical transport data out of the chat UI.
6. Run the appropriate build/verification checks.
7. Update this wiki when architecture or product behavior changes.

---

## 📖 Documentation Map

| Document | Purpose |
|---|---|
| `docs/WIKI.md` | Complete project overview and operational reference |
| `README.md` | Quick project introduction and setup |
| `render.yaml` | Production deployment configuration |
| `apps/server/prisma/schema.prisma` | Database model reference |
| `.github/workflows/` | CI/CD and Android automation |

---

**Global Messenger** — built for clean conversations, reliable communication, and user-controlled privacy.
