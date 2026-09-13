# Feature architecture

New product capabilities should live under feature-owned modules instead of expanding `main.tsx`.

Recommended ownership:

- `auth/` — authentication, sessions, recovery
- `profile/` — profile center and privacy preview
- `chats/` — conversation list, archive, pin, folders
- `messages/` — composer, message actions, selection, receipts
- `groups/` — group administration and permissions
- `media/` — upload/download, gallery, players, voice notes
- `calls/` — call state, WebRTC UI, history
- `notifications/` — notification center and preferences
- `privacy/` — privacy controls and blocked users
- `security/` — devices, 2FA, passkeys, app lock, verification
- `search/` — universal and conversation search
- `settings/` — account, privacy, security, notifications, appearance, chat, storage, language, about
- `folders/` — custom chat folders
- `saved/` — Saved Messages / starred content
- `ai/` — rewrite, translation, summaries, suggestions, semantic search

Shared transport remains in `services/` (`api.ts`, socket lifecycle, notifications, encryption). Existing API and Socket.IO contracts must remain backward compatible while features are extracted.

Do not create placeholder buttons that claim to work. Every feature must move from `planned` → `partial` → `implemented` in `featureRegistry.ts` only after UI + backend + failure-path tests exist.
