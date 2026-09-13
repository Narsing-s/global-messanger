# ⚡ Global Messenger Performance & Reliability Release Gate

This is the **P0 release gate** for making Global Messenger feel instant and dependable. Feature count is not considered a success if core chat is slow or unreliable.

## 1. User-perceived SLO targets

| Journey | Target |
|---|---:|
| Existing chat opens from local cache | <100 ms perceived |
| Recent chat list from local state | <200 ms perceived |
| Message bubble appears after Send | <50 ms perceived |
| Healthy realtime message acknowledgement | <300 ms target |
| Recipient realtime delivery | <500 ms target |
| Search suggestions | <150 ms perceived |
| Reconnect after short network loss | automatic |
| Offline send | queued immediately |

These are engineering targets, not guarantees. Production must report p50/p95/p99.

## 2. Message reliability contract

Every user message must have a stable `clientId` before transmission.

```text
User presses Send
      |
      +--> render optimistic bubble immediately
      |
      +--> persist outbox item locally
      |
      +--> emit message:send(clientId)
                    |
          +---------+---------+
          |                   |
        ACK                 failure/offline
          |                   |
     reconcile            keep outbox item
     remove queue               |
          |                 reconnect
          +-------- retry/reconcile
```

Required states:

- `sending`
- `queued`
- `sent`
- `delivered`
- `read`
- `failed`
- `retrying`

A reconnect must not create duplicate messages. The server must treat the client ID as an idempotency key for the conversation/user scope.

## 3. Realtime rules

- One Socket.IO connection per active browser/app session.
- Never register duplicate `message:new`, typing, presence or call listeners after rerender.
- Rejoin the active conversation after reconnect.
- Request conversation reconciliation after reconnect.
- Ignore duplicate message IDs/client IDs.
- Use exponential reconnect backoff with a bounded initial delay.
- Show connection state without blocking the chat composer.
- Important writes receive an acknowledgement.

## 4. Chat rendering rules

- Never load an entire conversation just to open the latest messages.
- Use cursor pagination for older messages.
- Virtualize large message lists.
- Keep message rows cheap to render.
- Lazy-load images, videos and documents.
- Render thumbnails before full-size media.
- Do not decode large media on the main UI thread when avoidable.
- Avoid global state updates that rerender the entire conversation.

## 5. API/database rules

- Select only columns required by the screen.
- Add indexes for real query patterns.
- Avoid N+1 member/message queries.
- Bound every collection endpoint.
- Prefer cursor pagination over large offsets for growing message history.
- Validate payloads at the API boundary.
- Keep external calls outside critical synchronous message persistence where possible.
- Measure slow Prisma queries in production.

## 6. Mobile/network rules

The app must remain usable on:

- Fast Wi-Fi
- 4G
- Weak 4G
- Intermittent connectivity
- Temporary offline mode
- App background/foreground transitions
- Android process restart
- Server restart

A temporary network failure must not erase a composed message or silently lose a sent message.

## 7. Media reliability

- Validate MIME type and size server-side.
- Show upload progress.
- Allow cancel/retry.
- Prefer resumable uploads for large files.
- Do not depend on container-local production storage.
- Use authenticated media access where required.
- Generate/serve thumbnails efficiently.

## 8. Security/performance balance

Performance optimizations must never:

- expose JWTs or private keys;
- bypass server authorization;
- expose another user's conversation data;
- render encryption envelopes as normal messages;
- disable rate limits;
- trust client-provided ownership fields.

## 9. Release test matrix

Before production deployment, execute the real two-user flow:

1. Login user A and user B.
2. Open the same conversation on two devices/browsers.
3. Send 100+ short messages.
4. Send messages rapidly while the recipient is online.
5. Disable network during Send.
6. Restore network and verify automatic retry.
7. Kill/restart the backend during a pending message.
8. Refresh both clients.
9. Verify no duplicate messages.
10. Verify no missing messages.
11. Verify ordering is stable.
12. Test media upload/download.
13. Test group messaging.
14. Test call interruption and reconnect.
15. Test mobile background/foreground.

## 10. Production observability

Track at minimum:

- login success/failure rate;
- API p50/p95/p99 latency;
- message send success rate;
- message ACK latency;
- recipient delivery latency;
- reconnect rate;
- failed/queued message count;
- duplicate suppression count;
- search latency;
- media upload latency;
- call setup/drop rate;
- database latency;
- frontend crash/error rate;
- Web Vitals.

Do not log message contents, passwords, access tokens or encryption secrets.

## 11. Go/no-go rule

**GO** only when core messaging passes the two-user offline/reconnect test without message loss or duplication and the measured performance is within the product targets for the intended deployment size.

**NO-GO** if any of these occur:

- message disappears after temporary offline mode;
- duplicate message is created after retry;
- encrypted/internal signalling payload appears as a normal chat message;
- chat freezes while sending/uploading;
- reconnect requires a page refresh;
- unauthorized user can read another conversation;
- large conversations cause unacceptable UI jank.

## 12. Product priority

Build in this order:

1. Fast optimistic messaging
2. Durable offline outbox
3. Idempotent retry/reconciliation
4. Cursor pagination
5. Virtualized rendering
6. Media performance
7. Observability and SLO dashboards
8. Advanced features

**The fastest messenger is not the one with the most features. It is the one where the core action—open chat, type, send, receive—feels immediate and remains correct under failure.**
