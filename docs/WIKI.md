# 🌍 Global Messenger — Project Wiki

> A secure, real-time, open-source messaging platform for Web and Android, designed to grow into a complete communication workspace rather than a basic chat clone.

**Repository:** `Narsing-s/global-messanger`  
**Android application ID:** `com.globalmessenger.app`  
**Primary production frontend:** Docker/Nginx web service  
**Alternative deployment:** Render blueprint

---

## 📚 Contents

- [Product Vision](#-product-vision)
- [Feature Centers](#-feature-centers)
- [Messaging](#-messaging)
- [Message Operations](#-message-operations)
- [Profile Center](#-profile-center)
- [Chat Info](#-chat-info)
- [Conversation Organization](#-conversation-organization)
- [Media Center](#-media-center)
- [Groups](#-groups)
- [Privacy and Security](#-privacy-and-security)
- [Encryption](#-encryption)
- [Calls](#-calls)
- [Notifications](#-notifications)
- [Accounts and Sessions](#-accounts-and-sessions)
- [Universal Search](#-universal-search)
- [Command Center](#-command-center)
- [Settings Center](#-settings-center)
- [Disappearing Messages](#-disappearing-messages)
- [Chat Retention](#-chat-retention)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Environment Configuration](#-environment-configuration)
- [Local Development](#-local-development)
- [Docker Production Deployment](#-docker-production-deployment)
- [Android Build](#-android-build)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Product Rules](#-product-rules)
- [Contribution Guidelines](#-contribution-guidelines)

---

## 🎯 Product Vision

Global Messenger is being developed around four principles:

1. **Reliable communication** — messages should send, arrive, reconnect and render predictably.
2. **User-controlled privacy** — privacy, sessions, disappearing messages and security controls must be explicit.
3. **Powerful organization** — users should be able to find, save, pin, archive and manage conversations efficiently.
4. **Extensible communication workspace** — calls, media, notifications, AI assistance and advanced collaboration can live inside the same product.

The current product-center definition in `apps/server/src/product-center.ts` organizes the roadmap into Profile, Chat Info, Message Tools, Organization, Media, Notifications, Security, Advanced Messaging, Calls, AI, Search, Command Center and Settings centers.

---

## 🧩 Feature Centers

| Center | Scope | Phase |
|---|---|---:|
| Profile Center | Profile identity, photo, bio, status, sharing | 1 |
| Chat Info | Contact/group details, media, files, links, settings | 1 |
| Message Tools | Forward, copy, star, pin, quote, multi-select, info | 1 |
| Conversation Organization | Favorites, archive, filters, folders, Saved Messages | 1 |
| Media Center | Images, video, audio, documents, progress and sharing | 1 |
| Notification Center | Messages, mentions, groups, calls and notification history | 1 |
| Security Center | Devices, sessions, 2FA, passkeys, biometric/PIN roadmap | 2 |
| Advanced Messaging | Polls, scheduled messages, reminders, location and events | 3 |
| Calls | Calling UI, history, group calls and reliability | 4 |
| AI Workspace | Rewrite, translation, summaries, search and assistance | 5 |
| Universal Search | People, chats, messages, files, links and groups | 1 |
| Command Center | Unread, calls, groups, saved items, files and security | 1 |
| Settings Center | Account, privacy, security, notifications, appearance and storage | 1 |

The table describes the **product scope/foundation**. A feature marked as foundation does not automatically mean every UI state, edge case and platform-specific behavior is complete.

---

## 💬 Messaging

### Core conversation types

- One-to-one conversations
- Group conversations
- Realtime Socket.IO delivery
- Online/offline presence
- Typing indicators
- Delivery/read behavior
- Message replies
- Message editing
- Message deletion
- Reactions
- Search
- Attachments

### Message lifecycle

```text
Compose
  ↓
Client validation
  ↓
Optional E2EE envelope
  ↓
Socket.IO message:send
  ↓
Authenticated server validation
  ↓
Database persistence
  ↓
Realtime recipient delivery
  ↓
Client decryption when applicable
  ↓
Human-readable message bubble
```

The chat UI must not display internal call-signalling records, encryption envelopes or other transport-only payloads as normal user messages.

---

## 🛠️ Message Operations

The advanced message-operation center is designed to provide the controls users expect from a modern messenger, while adding stronger bulk-management capabilities.

### Single-message actions

- Reply / quote
- Forward
- Copy
- Star / save
- Pin / unpin
- React
- Edit where permitted
- Delete where permitted
- Message information
- Retry failed send
- Download attachment
- Share attachment
- Open link preview

### Multi-select actions

- Select multiple messages
- Bulk delete
- Bulk forward
- Bulk share
- Bulk save/star
- Bulk pin where supported
- Selection count and clear-selection controls

### Message information

The message-info surface is intended to expose useful delivery information such as:

- Sent timestamp
- Delivery timestamp when available
- Read timestamp when available
- Sender
- Message type
- Attachment information when applicable

---

## 👤 Profile Center

The Profile Center provides a single place to manage and inspect identity information.

### Profile capabilities

- Profile photo
- Display name
- Username
- About / bio
- Online-status controls
- Last-seen controls
- Profile preview
- QR/profile sharing
- Copy username
- Account ID / identity information

Privacy controls should determine which profile information can be seen by other users.

---

## ℹ️ Chat Info

Chat Info is the control center for an individual conversation or group.

### Direct conversation

- Contact profile
- Shared media
- Shared files
- Shared links
- Starred messages
- Pinned messages
- Search in conversation
- Notification settings
- Disappearing-message settings
- Block
- Report
- Clear chat
- Delete chat

### Group conversation

All direct-chat information plus:

- Group photo
- Group description
- Member list
- Add/remove members
- Admin controls
- Invite link
- Group pins
- Leave group

---

## 🗂️ Conversation Organization

Global Messenger is intended to scale beyond a simple chronological chat list.

Supported/planned organization features include:

- Favorite chats
- Pinned chats
- Archive
- Unread filter
- Groups filter
- Personal/direct-chat filter
- Custom folders
- Mute indicators
- Unread badges
- Sorting
- Recently active conversations
- Saved Messages

The goal is to make a large number of conversations manageable without requiring users to search for everything.

---

## 🖼️ Media Center

The media experience is designed around dedicated views rather than treating every attachment as plain text.

### Supported categories

- JPEG
- PNG
- WebP
- GIF
- MP3
- WAV
- OGG
- MP4
- WebM
- PDF
- Plain text
- ZIP

### Media features

- Image viewer
- Gallery
- Video player
- Audio player
- Voice messages
- Document preview
- Media grid
- Files tab
- Links tab
- Download/share
- Upload progress
- Download progress
- Compression roadmap

Production upload storage must be persistent for deployments where local container storage is ephemeral.

---

## 👥 Groups

Groups support authenticated membership and administrative operations.

Core group behavior includes:

- Create group
- Rename group
- Group photo/description
- Add members
- Remove members
- Member list
- Admin controls
- Invite links
- Group messaging
- Group pins
- Group search
- Leave group

All membership-changing operations must remain server-authorized.

---

## 🔐 Privacy and Security

Security is implemented in layers:

- JWT-based authentication
- Password hashing
- Authenticated API routes
- Security headers
- Rate/request protection
- Restricted production CORS
- Input validation
- MIME-type validation
- Session token hashing
- Session revocation
- Privacy settings
- Optional encrypted message envelopes

### Security Center roadmap

- Active device management
- Logout other devices
- Login history
- Password change
- Two-factor authentication
- Passkeys
- Application PIN
- Android biometric lock
- Screen lock
- Blocked-user management
- Security verification
- Device/key management

Secrets must never be placed in source code.

---

## 🔒 Encryption

The web client maintains a device identity key and can register its public key with the server. Supported message content can be represented as an `gm:e2ee:v1:` envelope.

The intended flow is:

```text
Plain message
    ↓
Device encryption
    ↓
Encrypted envelope
    ↓
Server persistence / transport
    ↓
Recipient device
    ↓
Device decryption
    ↓
Plain message in UI
```

### Important limitation

A device that does not possess the identity/key material required to decrypt an encrypted historical message may not be able to display its contents. Account password recovery and cryptographic identity recovery are different problems.

Future work should provide a secure, explicit recovery mechanism without weakening the encryption model.

---

## 📞 Calls

Voice and video calls use browser/mobile WebRTC capabilities with Socket.IO signalling.

Current/foundation call features include:

- Incoming call UI
- Outgoing call UI
- Call history
- Missed calls
- Mute
- Speaker
- Camera controls
- Call notifications

### Production reliability

STUN can work for many network configurations. A production TURN service is recommended for reliable connectivity across restrictive NAT and firewall environments.

Future call work includes:

- Group calling
- Screen sharing hardening
- TURN infrastructure
- Call-quality diagnostics

---

## 🔔 Notifications

The notification center is intended to consolidate:

- Messages
- Mentions
- Groups
- Calls
- Friend/request events where applicable
- Notification history
- Per-chat notification settings
- Global notification settings
- Sounds
- Desktop controls

Push notification support can use Firebase Cloud Messaging when the required server environment configuration is supplied.

No Firebase private credential should be committed to the repository.

---

## 🖥️ Accounts and Sessions

Authenticated users can inspect active sessions.

Session information may include:

- Device name
- Platform
- User agent
- IP address
- Creation time
- Last activity
- Expiration
- Revocation state

Users can revoke an individual session or revoke other active sessions.

Session tokens are hashed before persistent session tracking.

---

## 🔎 Universal Search

The universal search center is designed to search across:

- People
- Chats
- Messages
- Files
- Photos/media
- Links
- Groups

The current server foundation exposes `/api/search/universal` for authenticated search across accessible users, conversations and messages. Search results can also identify messages containing attachments or links.

Future filters include sender, date, message type and attachment type.

---

## 🧭 Command Center

The Command Center is the product's fast-navigation surface.

It is designed to expose shortcuts for:

- Recent conversations
- Unread messages
- Calls
- Groups
- Saved items
- Files
- AI assistant
- Security status
- Active devices
- Quick actions

The intent is to reduce the number of screens needed for common operations.

---

## ⚙️ Settings Center

Settings are organized by responsibility rather than one long list.

### Categories

- Account
- Privacy
- Security
- Notifications
- Appearance
- Chat
- Storage
- Language
- About

Privacy settings currently include server-backed controls for last-seen and profile-photo visibility.

---

## ⏱️ Disappearing Messages

Disappearing Messages is explicitly user-controlled.

### OFF

- Normal messages do not expire.
- No automatic deletion timer is applied.
- Message history remains available according to normal account/chat actions.

### ON

Newly created messages can receive an expiry timestamp based on the selected timer.

```text
OFF → expiresAt = null → message remains

ON  → expiresAt = createdAt + selected timer
    → eligible for expiry cleanup
```

Manual **Clear Chat** and **Delete Chat** remain separate user actions.

---

## 🗄️ Chat Retention

Normal messages are not automatically deleted simply because they are old.

Current policy:

1. Normal messages have no automatic expiry.
2. Disappearing messages expire only when explicitly enabled.
3. Conversations inactive for 60+ days may be archived from the active chat list.
4. Archiving does not mean deleting the underlying message history.
5. Opening/creating a direct conversation can return an archived conversation to active use.

---

## 🏗️ Architecture

```text
                         Browser / Android
                                │
                                ▼
                   ┌─────────────────────────┐
                   │ Docker Web / Nginx :8080│
                   │ React + Vite build      │
                   └───────────┬─────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
           /api/*       /socket.io/*       /uploads/*
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                   ┌─────────────────────────┐
                   │ Fastify + Socket.IO     │
                   │ API + Auth + Realtime   │
                   │ :4000                   │
                   └───────────┬─────────────┘
                               │
                               ▼
                   ┌─────────────────────────┐
                   │ PostgreSQL + Prisma     │
                   └─────────────────────────┘
```

### Production frontend rule

For predictable production behavior, the Docker frontend is the recommended frontend source of truth. It serves the current Vite build and proxies API/realtime/upload paths to the backend.

---

## 🗂️ Project Structure

```text
Global Messenger/
│
├── apps/
│   ├── web/
│   │   ├── public/
│   │   ├── scripts/
│   │   └── src/
│   │       ├── api.ts
│   │       ├── main.tsx
│   │       ├── features.ts
│   │       ├── e2ee.ts
│   │       ├── e2ee-bootstrap.ts
│   │       ├── push.ts
│   │       └── styles.css
│   │
│   └── server/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       ├── scripts/
│       └── src/
│           ├── index.ts
│           ├── advanced-features.ts
│           ├── product-center.ts
│           └── push-notifications.ts
│
├── docs/
│   ├── README.md
│   └── WIKI.md
│
├── .github/workflows/
├── render.yaml
├── package.json
└── README.md
```

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Web UI | React 19 |
| Build | Vite 6 |
| Language | TypeScript |
| Icons | Lucide React |
| Realtime | Socket.IO |
| Backend | Fastify 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Authentication | JWT + bcrypt |
| Mobile | Capacitor 7 |
| Android | Native Android / Gradle |
| Push | Firebase Cloud Messaging integration |
| Hosting | Docker / Render |

---

## ⚙️ Environment Configuration

Typical server variables include:

```text
DATABASE_URL
JWT_SECRET
WEB_ORIGIN
PASSWORD_RESET_WEB_ORIGIN
UPLOAD_DIR
CRON_SECRET
```

Optional email/push integrations must receive credentials through secure environment configuration.

Never commit:

- Passwords
- JWT secrets
- Gmail passwords
- Firebase private keys
- API tokens
- Production database credentials
- Android signing keys/keystores

---

## 💻 Local Development

Install dependencies:

```bash
npm ci
```

Run the complete environment:

```bash
npm run dev
```

Run server directly:

```bash
npm run dev:server:direct
```

Run web directly:

```bash
npm run dev:web:direct
```

Build:

```bash
npm run build
```

Verification:

```bash
npm run verify:local
npm run smoke
```

Database:

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
```

---

## 🐳 Docker Production Deployment

### Build the web frontend

```bash
docker compose build --no-cache --pull web
docker compose up -d --force-recreate --no-deps web
```

### Rebuild the complete stack

```bash
docker compose down
docker compose build --no-cache --pull
docker compose up -d
```

### Local URL

```text
http://localhost:8080
```

### Verify

```bash
docker compose ps web
docker compose logs --tail=100 web
curl -I http://localhost:8080/
curl -I http://localhost:8080/index.html
```

After deployment, a private/incognito window is useful for confirming that an old browser cache or service worker is not serving an earlier build.

### Render

The repository also contains `render.yaml` for Render-based deployment. When using Render, verify that the deployed frontend is built from the intended current commit and that backend/frontend environment variables match the production domain.

---

## 📱 Android Build

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

The repository also contains Android GitHub Actions automation for release artifacts when the required signing secrets are configured.

Release keys and signing secrets must remain outside the source tree.

---

## 🧪 Troubleshooting

### The recipient sees an encrypted/unavailable message

The receiving device may not have the device identity/key material required to decrypt the message. This is a cryptographic device-key issue, not something that should be solved by displaying the encrypted payload to the user.

The long-term solution is secure multi-device key synchronization/recovery.

### Raw technical messages appear in chat

The UI should filter internal signalling/transport records and render only user-facing messages. Rebuild the current frontend after pulling changes so the latest message-display logic is included.

### Login or registration does not complete

Check:

1. Backend process is running.
2. Database is reachable.
3. `WEB_ORIGIN` matches the frontend origin.
4. Browser network requests point to the correct same-origin API or configured API URL.
5. Authentication responses are not being blocked by CORS or stale frontend assets.

### Messages fail with “Failed to fetch”

Check:

1. The device can reach the production domain.
2. The backend is healthy.
3. `/api` is correctly proxied by the frontend/reverse proxy.
4. `/socket.io` is correctly proxied for realtime features.
5. HTTPS is used consistently in production.
6. The deployed frontend is not using an old localhost or stale API configuration.

### Upload fails

Check:

1. `UPLOAD_DIR`.
2. Persistent production storage.
3. MIME type validation.
4. Upload size limits.
5. Storage permissions.

### Calls connect unreliably

STUN may not be sufficient on restrictive networks. Configure production TURN infrastructure for dependable WebRTC connectivity.

### Password reset email is not received

Check:

1. Gmail SMTP environment variables.
2. SMTP connectivity.
3. Sender/account security settings.
4. Server logs for SMTP errors.
5. Spam/junk folder.

---

## 🗺️ Roadmap

### Phase 1 — Core product completeness

- [x] Profile Center foundation
- [x] Chat Info foundation
- [x] Advanced message-operation foundation
- [x] Conversation organization foundation
- [x] Media Center foundation
- [x] Notification Center foundation
- [x] Universal Search foundation
- [x] Command Center foundation
- [x] Settings Center foundation
- [ ] Finish every UI state for multi-select/bulk operations
- [ ] Finish complete message-info views
- [ ] Finish end-to-end forwarding/share flows across all conversation types

### Phase 2 — Security Center

- [x] Active sessions foundation
- [x] Session revocation
- [x] Privacy controls
- [ ] Two-factor authentication
- [ ] Passkeys
- [ ] App PIN
- [ ] Android biometric lock
- [ ] Security verification
- [ ] Secure device/key management and recovery

### Phase 3 — Advanced Messaging

- [ ] Polls
- [ ] Scheduled messages
- [ ] Reminders
- [ ] Live location
- [ ] Contact sharing
- [ ] Events/calendar
- [ ] Advanced media tools

### Phase 4 — Advanced Calls

- [x] Incoming/outgoing call foundation
- [x] Call history foundation
- [ ] Production TURN
- [ ] Group calls
- [ ] Screen sharing hardening
- [ ] Call-quality diagnostics

### Phase 5 — AI Workspace

- [ ] Rewrite
- [ ] Translation
- [ ] Smart replies
- [ ] Conversation summaries
- [ ] AI message search
- [ ] File understanding
- [ ] Voice transcription
- [ ] Smart notifications

---

## 📌 Product Rules

These rules should be preserved during future development:

1. **Do not automatically delete normal user messages.**
2. **Do not silently introduce automatic clear-chat behavior.**
3. **Disappearing Messages must remain explicitly user-controlled.**
4. **When Disappearing Messages is OFF, normal messages remain persistent.**
5. **Manual Clear Chat/Delete Chat remains a user action.**
6. **Archiving inactive conversations must not silently delete their message history.**
7. **Never display encryption envelopes or call-signalling payloads as human chat messages.**
8. **Never commit secrets or private credentials.**
9. **Preserve authentication, authorization and realtime behavior when changing UI features.**
10. **Prefer existing project capabilities over unnecessary third-party API dependencies.**
11. **Document architecture/product changes when adding major features.**

---

## 🤝 Contribution Guidelines

Before changing a core feature:

1. Read the relevant API, UI and database flow.
2. Preserve authorization checks.
3. Preserve realtime delivery and reconnect behavior.
4. Preserve message history unless deletion is explicitly requested by the user.
5. Keep technical transport data out of the chat UI.
6. Test desktop and mobile-responsive behavior.
7. Run build/verification/smoke checks.
8. Update `README.md` and this wiki when behavior or architecture changes.

---

## 📖 Documentation Map

| Document | Purpose |
|---|---|
| `README.md` | Public project introduction, setup and product roadmap |
| `docs/WIKI.md` | Detailed architecture, product behavior, security and operations |
| `docs/README.md` | Documentation index |
| `render.yaml` | Render deployment blueprint |
| `apps/server/prisma/schema.prisma` | Database model reference |
| `apps/server/src/product-center.ts` | Product-center feature definitions and foundation APIs |
| `.github/workflows/` | CI/CD and Android automation |

---

**Global Messenger** — secure conversations, realtime delivery, powerful organization, and a foundation for an advanced communication workspace.