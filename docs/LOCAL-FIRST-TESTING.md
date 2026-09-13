# Global Messenger — Local-First Release Gate

Android work is intentionally **out of scope** until the local web stack passes this gate.

## 1. Install and verify

```bash
npm ci
npm run doctor
npm run verify:local
```

`verify:local` must finish successfully before functional testing begins.

## 2. Start the local stack

Preferred development mode:

```bash
npm run dev
```

Expected services:

- API: `http://127.0.0.1:4000`
- Web: `http://127.0.0.1:5173`

For the production-like Docker stack, use the repository Docker Compose instructions and open `http://localhost:8080`.

## 3. Run the local E2E gate

With the development stack running in another terminal:

```bash
npm run e2e:local
```

This gate checks:

1. API health
2. API database readiness
3. Web startup
4. Two-user registration
5. Login and invalid-login rejection
6. User search
7. Direct conversation creation
8. Socket.IO connection
9. Realtime message delivery
10. Message acknowledgement
11. Socket reconnect
12. Message edit
13. Reaction add/remove
14. Bookmark add/remove
15. Pin/unpin
16. Message deletion
17. Group creation
18. Group message access

The E2E script creates temporary test users with unique usernames. It does not require Android.

## 4. Manual browser gate

Open two separate browser profiles/incognito windows and use two different accounts.

### Authentication

- Register User A
- Register User B
- Login/logout/login again
- Refresh both sessions
- Verify invalid credentials are rejected

### Realtime chat

- Search User B from User A
- Start a direct chat
- Send A → B
- Send B → A
- Verify messages appear without refresh
- Verify typing/presence behavior
- Verify delivery/read behavior where enabled
- Reply to a message
- Edit a permitted message
- Delete a permitted message
- Add/remove a reaction
- Bookmark/unbookmark
- Pin/unpin

### Reliability

- Disconnect one browser temporarily
- Reconnect it
- Send another message
- Confirm the message is delivered normally
- Refresh the conversation
- Confirm persisted history is correct

### Groups

- Create a group
- Add User B
- Send messages
- Verify membership permissions
- Verify removed/non-members cannot perform unauthorized actions

### Media

Where enabled, test at least one image and one document. Confirm upload, persistence, recipient display and failure/retry behavior.

### Security

- Protected API calls reject missing authentication
- User A cannot access User B's private data
- Destructive operations remain server-authorized
- No secrets appear in browser source/build output
- Encryption/call signalling payloads never appear as normal chat messages

## 5. Pass/fail rule

**PASS:** all automated and manual critical-path tests work locally.

**FAIL:** any registration/login, persistence, direct messaging, realtime/reconnect, authorization, group, or critical media flow is broken.

When the gate fails, fix the local problem first and rerun the complete gate. Do not move the same unresolved problem to Android or production.

## 6. Android decision

Only after the local gate passes:

- If the existing Android build works against the verified backend, leave Android unchanged.
- If Android exposes a real issue that does not exist on web, fix only that Android-specific issue.
- Do not create a release merely because the local gate passed.

The goal is **working software, not unnecessary releases**.
