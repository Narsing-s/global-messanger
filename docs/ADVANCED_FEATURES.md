# Global Messenger — Advanced Features

Global Messenger now includes a production-oriented advanced feature layer on top of the existing realtime messenger.

## Advanced message features

- Global authenticated message search
- Saved/bookmarked messages
- Pinned messages per conversation
- Forward messages between conversations
- Conversation mute controls
- User blocking and blocked-user listing
- Attachment forwarding
- Additional message indexes for faster conversation queries

## Advanced UI

The web client includes an **Advanced Command Center** loaded from `apps/web/src/advanced-ui.ts`.

Open it with **Ctrl+K** (or **Cmd+K** on macOS).

It provides:

- Search messages
- Saved messages
- Pinned messages
- Mute current conversation
- Block current contact
- Online/offline connection status

## API endpoints

All endpoints below require the existing Bearer JWT authentication.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/messages/search?q=...` | Search accessible messages |
| `POST /api/messages/:id/bookmark` | Save a message |
| `DELETE /api/messages/:id/bookmark` | Remove a saved message |
| `GET /api/bookmarks` | List saved messages |
| `POST /api/messages/:id/pin` | Pin a message |
| `DELETE /api/messages/:id/pin` | Unpin a message |
| `GET /api/conversations/:id/pins` | List pinned messages |
| `POST /api/messages/:id/forward` | Forward a message |
| `POST /api/conversations/:id/mute` | Mute/unmute a conversation |
| `POST /api/users/:id/block` | Block a user |
| `DELETE /api/users/:id/block` | Unblock a user |
| `GET /api/users/blocked` | List blocked users |

## Database migration

The advanced schema is in:

`apps/server/prisma/migrations/20260831_advanced_messenger/migration.sql`

Deploy it with:

```bash
npm run db:deploy
```

Then build the project:

```bash
npm install
npm run db:generate
npm run build
```

## Next production milestones

The next major upgrades should be Redis-backed Socket.IO scaling, refresh-token sessions, object storage/CDN for media, TURN infrastructure for WebRTC, offline message queues, and end-to-end encryption. These are intentionally separate from the current feature layer so the existing messenger remains easier to operate and debug.
