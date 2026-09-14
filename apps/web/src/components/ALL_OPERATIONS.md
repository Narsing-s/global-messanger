# Global Messenger — complete operation coverage

The product is organized around one canonical operations center. The visible operation groups are:

- Identity: register, login by username/email/phone, profile, username, display name, bio, profile sharing.
- People: global user search, direct conversation creation, block/unblock/report.
- Conversation: direct/group chat, members, organization, archive, favorites, pins, unread/group/personal filters, mute, clear/delete, disappearing-message controls.
- Messages: send, edit, delete, reply, react, bookmark/save, pin/unpin, copy, message info, multi-select, bulk delete, bulk forward, retry/reconnect, read/delivery state.
- Advanced messaging: polls/voting, scheduled messages/cancel, reminders, events, contacts, location, live location, link/media/document support.
- Media: image/video/audio/document handling, gallery, authenticated media, upload/download progress, retry/resume/cancel.
- Notifications: history, mentions, groups, calls, sounds, desktop permission recovery, quiet-hour/per-chat controls where server routes exist.
- Calls: incoming/outgoing, accept/reject, missed history, mute, speaker, camera, screen sharing, TURN/reconnect/permission recovery through the canonical call surface.
- Search: people, conversations, messages and universal search; attachment/link/pinned/saved filters where supported by server routes.
- Security: active devices, session revocation, logout others, login history, password change/reset, 2FA, passkeys, privacy, blocked users, device/key controls.
- AI: conversation summary, document understanding, smart notifications, with additional assistant/rewrite/translation capabilities exposed only when backed by a real route.
- Accessibility/globalization: keyboard/focus, ARIA, screen-reader compatibility, reduced motion, text scaling, RTL readiness and localization hooks.
- Reliability: offline queue, reconnection, idempotency, duplicate suppression, draft persistence, optimistic reconciliation, request timeout/retry, ordered event reconciliation.
- Data portability: account/media export and recovery flows when the corresponding authenticated server endpoint is enabled.
- Trust & safety: reporting, blocking, rate limiting, moderation and abuse-protection architecture.
- Platform: bot/webhook/developer-key/usage/audit capabilities only where corresponding authenticated server APIs exist.

Rule: no visible control is presented as a completed feature unless it invokes a real API or an existing canonical client operation. Duplicate UI implementations must be removed rather than layered on top of each other.
