# Global Messenger — Feature Matrix

Global Messenger is being developed as a full communication workspace rather than a basic chat clone. This document separates **current/foundation capabilities** from roadmap items so the documentation does not imply that every planned UI state is production-complete.

## Product centers

| Center | Current scope | Status |
|---|---|---|
| Profile Center | Profile photo, display name, username, bio, status/privacy foundation, profile sharing | Foundation |
| Chat Info | Contact/group information, media/files/links, starred/pinned items, chat controls | Foundation |
| Message Tools | Reply, react, edit/delete, forward, copy, star/save, pin, message info, retry, multi-select | Foundation / expanding |
| Conversation Organization | Favorites, pinned chats, archive, unread/group/personal filters, Saved Messages | Foundation |
| Media Center | Images, video, audio, voice messages, documents, galleries and transfer progress | Foundation |
| Groups | Create/manage groups, members, admins, invite links, group messaging | Foundation |
| Notification Center | Message, mention, group and call notification controls | Foundation |
| Security Center | Authentication, sessions, revocation and privacy controls | Current + roadmap |
| Universal Search | People, chats, messages, files, links and groups | Foundation |
| Command Center | Fast access to unread items, calls, groups, saved content and security | Foundation |
| Settings Center | Account, privacy, security, notifications, appearance, chat and storage settings | Foundation |
| Advanced Messaging | Polls, scheduling, reminders, location, contacts and events | Roadmap |
| Advanced Calls | Voice/video foundation, history, signalling, reliability | Foundation + roadmap |
| AI Workspace | Rewrite, translation, summaries, smart search, transcription and assistance | Roadmap |

## Messaging

- Direct conversations
- Group conversations
- Realtime Socket.IO delivery
- Presence and typing indicators
- Delivery/read states where supported
- Emoji and reactions
- Replies/quoted replies
- Message edit and delete rules enforced by the server
- Forward, copy, star/save and pin foundations
- Message information foundation
- Multi-select and bulk-action foundation
- Text, image, audio/video and document attachments
- Retry failed messages
- Message search

### Product rule

The server remains the source of truth for authorization and destructive message operations. Client timers are only a usability layer and must not be treated as security controls.

## Profile Center

- Profile photo
- Display name
- Username
- About/bio
- Online-status and last-seen privacy controls
- Profile preview
- QR/profile sharing foundation
- Account identity information

## Chat Info

### Direct chats

- Contact profile
- Shared media
- Shared files
- Shared links
- Starred messages
- Pinned messages
- Search in conversation
- Notification controls
- Disappearing-message controls
- Block/report controls
- Clear/delete chat actions

### Groups

The group Chat Info surface additionally includes group profile/description, members, admin controls, invite links and leave-group actions.

## Media

Supported media/document categories depend on the current server validation and deployment configuration. The UI is designed for image, video, audio/voice and document workflows with upload/download progress.

Production deployments must use persistent storage for uploaded files when container-local storage is ephemeral.

## Calling

- Voice calls
- Video calls
- Incoming/outgoing call UI
- Mute/unmute
- Camera toggle
- Speaker controls where supported
- Call timer/history
- Socket.IO signalling foundation

Production reliability still requires appropriate TURN infrastructure for restrictive NAT/firewall environments. Group calling and hardened screen sharing remain roadmap work.

## Account & security

- Account registration/login
- JWT authentication
- Password hashing
- Authenticated API routes
- Session visibility and revocation
- Privacy controls
- Security headers and request protection
- Input/MIME validation
- Optional encrypted message envelopes
- Passkey, 2FA, biometric/PIN and advanced key-management roadmap

## Conversation utilities

- Search
- Favorites/pins
- Archive
- Unread/group/personal filters
- Saved Messages
- Chat export/backup where supported
- Clear chat view

## Important security/product rules

1. Never render internal encryption envelopes or call-signalling payloads as normal chat messages.
2. Do not silently delete normal message history because it is old.
3. Disappearing Messages must remain explicitly user-controlled.
4. Authentication and authorization must be preserved for every new operation.
5. Never commit production secrets, private keys or signing credentials.
6. A feature marked **foundation** is not a claim that every edge case, accessibility state, mobile behavior and failure mode is complete.

## Roadmap

### Core completeness

- Complete every Profile Center state and privacy edge case
- Complete Chat Info for direct and group chats
- Complete forward/share flows across all conversation types
- Complete message-info details for all message types
- Complete multi-select and bulk operations
- Harden media transfer/retry/offline behavior

### Security

- Two-factor authentication
- Passkey management
- App PIN/biometric lock
- Device verification
- Secure E2EE key recovery

### Advanced messaging

- Polls
- Scheduled messages
- Reminders
- Live location
- Contact sharing
- Events/calendar messages

### Calls

- Production TURN
- Group calling
- Screen sharing hardening
- Call-quality diagnostics

### AI Workspace

- Rewrite
- Translation
- Smart replies
- Conversation summaries
- AI search
- File understanding
- Voice transcription
- Notification summaries
