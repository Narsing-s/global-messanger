# 🌍 Global Messenger — Global-Market Blueprint

This is the product blueprint for making Global Messenger fast, reliable, private, accessible and globally scalable. It is a target specification; entries marked roadmap are not claims that the feature is already production-complete.

## Benchmark principles

Use proven product patterns without copying proprietary UI or implementation:

- WhatsApp-class everyday reliability, calling, communities and simple communication.
- Signal-class privacy, end-to-end encryption, device verification and phone-number privacy.
- Telegram-class extensibility through bots, mini apps and developer integrations.

## P0 — Core speed and reliability

### Perceived performance targets

| Operation | Target |
|---|---:|
| Open cached chat | <100 ms perceived |
| Open recent conversations | <200 ms perceived |
| Local message bubble | <50 ms perceived |
| Healthy server acknowledgement | <300 ms target |
| Realtime recipient delivery | <500 ms target |
| Search suggestions | <150 ms perceived |
| Offline send | Immediate local queue |
| Network recovery | Automatic |

Measure p50/p95/p99 in production; these are targets, not guarantees.

### Client

- Local conversation/message cache
- Optimistic message rendering
- Durable offline outbox
- Idempotent client message IDs
- Cursor pagination
- Virtualized message lists
- Debounced search
- Lazy media loading
- Thumbnail-first rendering
- Upload/download resume
- Socket listener deduplication
- Background synchronization
- Batched read receipts
- Minimal React rerenders

### API/database/realtime

- Small non-blocking Fastify handlers
- Strict validation
- Minimal response payloads
- Cursor pagination for large collections
- Rate limiting
- Idempotent writes
- Request/event IDs
- Database indexes matching real queries
- No N+1 queries
- Query profiling
- Socket.IO reconnect with backoff
- Ordered event reconciliation
- Duplicate-event suppression
- Shared Socket.IO adapter when horizontally scaled

## P1 — Complete messenger fundamentals

### Profile Center

- Profile photo
- Display name
- Username
- Bio/About
- Online status
- Last seen
- Profile preview
- QR/profile sharing
- Username copy/share
- Account ID

### Chat Info

- Contact profile
- Media/files/links
- Starred and pinned content
- Search in chat
- Notification controls
- Disappearing messages
- Block/report
- Clear/delete chat
- Group description/photo
- Admin controls
- Member permissions
- Invite links
- Leave group

### Message operations

- Reply/quote
- Forward
- Copy
- Star/save
- Pin/unpin
- Message info
- Delivery/read timestamps
- Edit
- Delete for self/everyone
- Undo where safe
- Multi-select
- Bulk delete
- Bulk forward
- Retry failed messages
- Link previews
- Reply previews

### Organization

- Favorites
- Pinned chats
- Archive
- Unread filter
- Groups/personal filters
- Custom folders
- Mute indicators
- Saved Messages
- Sorting
- Recently active

### Security

- Active devices
- Remote session revocation
- Login history
- Password change/reset
- 2FA
- Passkeys/WebAuthn
- App PIN/biometric lock
- Privacy controls
- Blocked users
- Security verification
- Device/key management
- Secure recovery

## P1 — Offline and failure recovery

Required message states:

`queued → sending → sent → delivered → read`

Failure states:

`failed → retrying → sent`

Rules:

1. Generate a client ID before sending.
2. Render the message optimistically.
3. Persist the outbox before network delivery.
4. Retry automatically after reconnect.
5. Server acknowledgement removes the outbox item.
6. Repeated retries must never create duplicate messages.
7. Reconnect must reconcile missed events.
8. A temporary backend/network failure must not silently delete a composed message.

## P2 — Full communication ecosystem

### Stories/Status

- Photo/video/text stories
- Custom audiences
- Replies/reactions
- 24-hour expiry
- Story archive
- Privacy controls

### Communities/Channels

- Communities
- Announcement channels
- Topic groups
- Threads
- Admin announcements
- Member permissions
- Moderation
- Invite links
- Community search

### Advanced messaging

- Polls/quizzes
- Scheduled messages
- Reminders
- Events/calendar
- Live location
- Contact sharing
- Stickers/GIFs
- Voice notes
- Voice transcription
- Advanced media/document players

### Calls

- 1:1 voice/video
- Group calling
- Call links
- Screen sharing
- TURN fallback
- Adaptive bitrate
- Network quality
- Noise suppression/echo cancellation
- Permission recovery
- Background/foreground recovery
- Call history
- Missed calls
- Call-quality telemetry

## P3 — Platform and business

### Developer platform

- Bot accounts
- Permission scopes
- Webhooks
- Commands
- Inline actions
- Mini Apps
- Deep links
- Developer dashboard
- API keys
- Key rotation
- Usage limits
- Audit logs

### Business

- Verified business profiles
- Business hours
- Catalog messages
- Support bots
- Shared inbox
- Agent assignment
- Labels
- Customer notes
- SLA timers
- Templates
- Analytics
- Consent/opt-out controls

## P3 — AI Workspace

- Rewrite
- Translation
- Smart replies
- Conversation summaries
- Unread summaries
- Natural-language message search
- File/document understanding
- Voice transcription
- Meeting/call summaries
- Notification digest

**Privacy boundary:** private E2EE content must not be silently sent to an external AI provider. Clearly show when content leaves the trusted device/E2EE boundary.

## P2 — Trust, safety and accessibility

### Trust and safety

- Spam detection
- Rate limiting
- Message requests
- Block/report
- Moderation queues
- Admin controls
- Invite-link protection
- Anti-bot protections
- Account takeover detection
- Appeals
- Safe MIME validation
- Malware scanning architecture
- Security audit logs

### Accessibility/globalization

- Keyboard navigation
- Focus management
- Screen-reader labels
- Large text
- Reduced motion
- High contrast
- Captions/transcripts
- RTL readiness
- Unicode-safe messages
- English/Telugu/Hindi language packs
- Global localization
- Regional date/time/number formatting

## P4 — Production scale and resilience

- Persistent media/object storage
- Database backups
- Point-in-time recovery
- Tested restore procedure
- Graceful shutdown
- Connection draining
- Queue recovery
- Dead-letter handling where queues are introduced
- Health/readiness endpoints
- Incident runbooks
- Error budgets
- CDN/media acceleration
- Horizontal Socket.IO scaling
- Regional application deployment when justified
- Multi-region disaster recovery
- Regional privacy/compliance controls

## Observability SLOs

Track:

- Login success rate
- Message send success rate
- Message p50/p95/p99 latency
- Realtime connection success
- Reconnect rate
- Failed-message rate
- Search latency
- Media upload/download latency
- Call setup success
- Call drop rate
- API p50/p95/p99
- Database latency
- Web Vitals
- Crash/error rate

Never log message contents, passwords, tokens or cryptographic secrets merely to obtain these metrics.

## Release gate

A release is **NO-GO** if any of these fail:

- Two-user realtime send/receive
- Offline queue and automatic retry
- Duplicate suppression
- Reconnect and missed-event reconciliation
- Message ordering
- Media upload/download
- Authentication/session revocation
- Block/report enforcement
- E2EE key/device recovery path
- Mobile browser operation
- Android operation
- Production health/readiness
- Critical security checks

## Product rule

**Fast + reliable + private + simple beats feature overload.**

Every feature must answer yes to:

1. Does it improve communication?
2. Does it preserve privacy/security?
3. Does it keep the application fast?
4. Does it recover safely from network/backend failure?
