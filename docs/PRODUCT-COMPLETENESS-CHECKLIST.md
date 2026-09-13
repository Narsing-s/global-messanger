# Global Messenger — Product Completeness & Release Checklist

This checklist is intentionally broader than a WhatsApp feature clone. It covers product behavior, security, reliability, accessibility, mobile, operations and recovery.

## P0 — must pass before feature-complete

### Identity / account
- [ ] Register and login: success, validation, duplicate account, wrong password, expired session
- [ ] Logout current device and revoke other devices
- [ ] Password change and password reset
- [ ] 2FA enrollment/challenge/recovery codes
- [ ] Passkey enrollment/login/removal
- [ ] Profile photo/name/username/bio editing
- [ ] Privacy controls: last seen, online, profile photo, read receipts, typing
- [ ] Account deletion and data export

### Direct messaging
- [ ] Create/open/restore direct chat without duplicates
- [ ] Send/receive text with realtime delivery
- [ ] Delivery/read receipts and timestamps
- [ ] Reply/quote preview
- [ ] Edit with edited indicator
- [ ] Delete for me / delete for everyone with authorization checks
- [ ] Forward
- [ ] Copy/share
- [ ] Star/bookmark/save
- [ ] Pin/unpin
- [ ] Reactions add/remove
- [ ] Message info
- [ ] Multi-select + bulk delete/forward/save
- [ ] Failed-message retry
- [ ] Draft preservation
- [ ] Duplicate-send protection using client IDs

### Groups
- [ ] Create/rename/leave
- [ ] Add/remove members
- [ ] Promote/demote admins
- [ ] Group permissions
- [ ] Group photo/description
- [ ] Invite link and revoke link
- [ ] Group notifications/mentions/read receipts
- [ ] Authorization tests for every admin action

### Chat organization
- [ ] Pinned chats
- [ ] Archived chats
- [ ] Favorites
- [ ] Saved Messages
- [ ] Custom folders
- [ ] Unread / personal / groups filters
- [ ] Sorting by recent activity
- [ ] Mute state and unread badges

### Media
- [ ] Images, video, audio, voice notes, documents
- [ ] Full-screen viewer and gallery
- [ ] Audio/video controls
- [ ] Document preview
- [ ] Media/files/links tabs
- [ ] Upload progress
- [ ] Download progress
- [ ] Cancel/retry/resume
- [ ] Large-file limits
- [ ] MIME/content validation
- [ ] Authenticated downloads
- [ ] Cleanup of abandoned uploads

### Search
- [ ] Universal search: people, chats, messages, groups, files, photos, links
- [ ] Conversation search
- [ ] Sender/date/type/attachment/link filters
- [ ] Pagination and indexed queries

### Calls
- [ ] Incoming/outgoing screens
- [ ] Accept/reject/end
- [ ] Missed calls/history
- [ ] Mute/speaker/camera
- [ ] Permission denial handling
- [ ] Network interruption/reconnect
- [ ] TURN relay in real deployment
- [ ] Background/foreground behavior on Android
- [ ] Audio routing
- [ ] Screen sharing
- [ ] Group calls

### E2EE
- [ ] Device identity creation
- [ ] Multi-device identity/key management
- [ ] Encrypted key backup/recovery
- [ ] New browser/device can decrypt historical messages after authorized recovery
- [ ] Device revocation invalidates that device
- [ ] No ciphertext-only "not available on this device" dead end
- [ ] Security verification/fingerprint or equivalent device trust UI

## P1 — advanced product differentiation

- [ ] Polls
- [ ] Scheduled messages
- [ ] Disappearing messages / auto-delete
- [ ] Message reminders
- [ ] Location and live location
- [ ] Contact sharing
- [ ] Calendar/events
- [ ] Safe link previews
- [ ] Translation
- [ ] AI reply suggestions
- [ ] AI rewrite
- [ ] AI conversation summary
- [ ] AI semantic search
- [ ] AI document understanding
- [ ] Voice transcription
- [ ] Notification center/history
- [ ] Per-chat/global notification settings
- [ ] Sound selection
- [ ] Desktop/browser notifications
- [ ] Command Center dashboard

## P1 — security / abuse / privacy

- [ ] Per-IP/account/device rate limiting
- [ ] Brute-force protection
- [ ] Upload size/MIME/content validation
- [ ] CORS allowlist
- [ ] CSP and security headers
- [ ] Authorization on every resource mutation
- [ ] Block/report flows
- [ ] Abuse/moderation audit trail
- [ ] Session/device management
- [ ] Login history
- [ ] Secrets only through deployment configuration
- [ ] No tokens/passwords in logs

## P1 — reliability / offline

- [ ] Offline message queue
- [ ] Reconnect and ordered replay
- [ ] Idempotency / duplicate suppression
- [ ] Draft persistence
- [ ] Optimistic UI reconciliation
- [ ] Socket reconnect without duplicate listeners
- [ ] API timeout and retry policy
- [ ] Upload retry/resume
- [ ] App refresh during send/upload
- [ ] Browser close/reopen recovery
- [ ] Backend restart with connected clients
- [ ] Database restart/unavailable behavior

## P1 — performance

- [ ] Virtualized long message lists
- [ ] Pagination instead of loading thousands of messages
- [ ] Debounced universal search
- [ ] Conversation caching
- [ ] Minimal round trips for chat opening
- [ ] Database indexes and query plans
- [ ] Socket listener lifecycle audit
- [ ] Media lazy loading/thumbnails
- [ ] Measured realtime latency budget

## P2 — UX quality

- [ ] Keyboard navigation and focus management
- [ ] Screen-reader labels/ARIA
- [ ] Reduced motion
- [ ] Text scaling
- [ ] Contrast checks
- [ ] Empty/loading/error states for every screen
- [ ] Undo for destructive actions where safe
- [ ] Localization: English/Telugu/Hindi
- [ ] RTL readiness
- [ ] Theme, accent, wallpaper, font/density controls
- [ ] Storage usage/cache management

## Release validation matrix

Every release should exercise at least:

1. Fresh Docker start
2. Database migration from empty database
3. Register user A/B
4. Login A/B
5. Search B
6. Create direct chat
7. Send A → B and B → A
8. Edit/reply/react/pin/bookmark/forward/delete
9. Reconnect socket and resend
10. Group create/admin/member operations
11. Upload/download image + document
12. Search messages
13. Profile update
14. Session/device operation
15. Voice/video call
16. Offline → reconnect
17. API restart
18. DB restart
19. Expired JWT
20. Android install/launch/login/chat/media/call/notification
21. Wi-Fi ↔ mobile-data transition
22. Production TURN configuration
23. E2EE recovery on a second authorized device

A release is **not** feature-complete merely because the UI button exists. Each item requires working backend behavior and a tested failure path.
