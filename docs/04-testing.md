# Global Messenger — Testing & QA

A successful frontend build, Gradle build, or container start is **not** proof that Global Messenger works end-to-end. Release testing must validate the real user journey across browser and Android, including backend connectivity, authentication, realtime messaging, media, calls and security behavior.

## 1. Environment smoke test

1. Start the production-like web/container stack.
2. Verify the backend `/health` endpoint.
3. Verify API requests from the web origin.
4. Verify Socket.IO/WebSocket connectivity.
5. Verify `/uploads/*` behavior where uploads are enabled.
6. Verify HTTPS/WSS in production.
7. Verify database connectivity and migrations.

## 2. Authentication

1. Register a new account.
2. Confirm validation for invalid/duplicate input.
3. Login with valid credentials.
4. Confirm invalid credentials return an appropriate authentication error.
5. Refresh/reopen the application and confirm the session behaves correctly.
6. Logout.
7. Login again.
8. Verify session visibility/revocation if enabled.
9. Verify protected API routes reject missing/invalid authentication.

Registration must not appear to fail merely because an optional welcome-email delivery attempt is unavailable.

## 3. Two-user realtime messaging

Use two separate accounts/devices/browser sessions.

1. Search for the second user.
2. Start a direct chat.
3. Send plain text.
4. Send emoji/reactions.
5. Verify realtime receipt.
6. Verify typing indicators.
7. Reply/quote a message.
8. Edit a permitted message.
9. Delete a permitted message.
10. Verify both clients update.
11. Retry a failed send after temporary connectivity loss.
12. Verify reconnect behavior after taking one client offline and back online.

## 4. Advanced message operations

Test each operation independently:

- Reply/quote
- Forward
- Copy
- Star/save
- Pin/unpin
- React/unreact
- Edit
- Delete for me / delete for everyone where permitted
- Message information
- Retry
- Multi-select
- Bulk actions

Verify that unavailable operations are hidden/disabled rather than silently failing.

## 5. Media

Test at least one image, video, audio/voice message and document where supported.

Verify:

- Upload progress
- Successful persistence
- Recipient display
- Preview/playback
- Download/share
- Failed upload behavior
- Retry behavior
- Unsupported MIME/type rejection

## 6. Groups

1. Create a group.
2. Add members.
3. Verify membership authorization.
4. Test admin/member permissions.
5. Send messages.
6. Test group pins/search where enabled.
7. Test invite/leave behavior.
8. Verify removed users cannot perform unauthorized member actions.

## 7. Profile Center

Test:

- Change profile photo
- Change display name
- Change username where supported
- Update bio/about
- Privacy controls
- Profile preview
- QR/profile sharing
- Cancel/close behavior

Verify another account sees only information permitted by the privacy settings.

## 8. Chat Info and organization

Verify:

- Contact/group information
- Shared media/files/links
- Starred messages
- Pinned messages
- Search in conversation
- Notification settings
- Disappearing-message settings
- Archive
- Favorites/pinned chats
- Unread/group/personal filters
- Saved Messages
- Clear/delete chat actions

## 9. Calls

Test between two real devices or browser sessions:

1. Start voice call.
2. Accept/decline/end call.
3. Start video call.
4. Toggle microphone.
5. Toggle camera.
6. Verify call timer/history.
7. Test permission denied and permission restored.
8. Test reconnect behavior.
9. Verify call signalling data never appears as a normal chat message.

Production networks should be tested with TURN enabled before claiming broad call reliability.

## 10. Android / Capacitor

Test the actual APK on a physical Android device:

```text
Install APK
  ↓
Startup
  ↓
Backend health/connectivity
  ↓
Register
  ↓
Login
  ↓
Search user
  ↓
Direct chat
  ↓
Realtime send/receive
  ↓
Advanced message operations
  ↓
Media
  ↓
Groups
  ↓
Calls
  ↓
Profile/privacy/sessions
  ↓
E2EE behavior
```

Native Capacitor requests use `capacitor://localhost`; production CORS must explicitly support the required native origin.

If the Android app reports **Failed to fetch**, check internet connectivity, backend `/health`, production API URL, CORS, Android `INTERNET` permission and WebView/logcat errors before changing application logic.

## 11. E2EE/message rendering

The normal chat experience must show the human-readable message when the device has the required cryptographic identity/key material.

If a device shows:

```text
🔒 Encrypted message (not available on this device)
```

capture logs and investigate device identity/key exchange. Do not expose ciphertext or internal encryption envelopes as the normal user-facing message.

## 12. Browser matrix

Minimum checks:

- Current Chrome/Edge
- Mobile Chrome
- Responsive mobile layout
- Camera permission allowed/denied
- Microphone permission allowed/denied
- Temporary offline/reconnect
- HTTPS/WSS production environment

## 13. Security regression checks

Verify that:

- Protected routes reject unauthenticated requests.
- Users cannot access another user's private chats or sessions.
- Group membership changes are server-authorized.
- Destructive message actions enforce server-side rules.
- Secrets are not present in source/build output.
- Production CORS is restricted to intended origins.
- Internal encryption/call-signalling payloads are not rendered as messages.

## 14. Release gate

Do **not** publish a release if any critical path is broken:

- Registration/login
- Authentication/session handling
- Direct message delivery
- Group authorization
- Media upload/download
- Calling permissions or core call flow
- Privacy/security controls
- Data persistence
- Android production connectivity

Record the tested commit/build number and environment with every release.
