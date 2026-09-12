# 📱 Global Messenger — Android APK Testing Guide

This document is the release and troubleshooting guide for testing the Android application on a real phone.

## 1. Current Android build

The latest Android workflow on September 12, 2026 is **Android Build #556** for commit `05d38bc2a8199434ebf48caa2cd6140866bee87f`.

The workflow completed successfully and verified the release APK signature. The generated package is:

```text
Global-Messenger.apk
```

The build also contains the production web bundle inside the Capacitor Android application. It is not a localhost development build.

## 2. Install the correct APK

Do not test an old APK from an earlier GitHub Actions run.

Use the latest successful Android build from the repository's Actions/Releases area. The release workflow publishes both:

- `Global-Messenger.apk` — direct Android installation/testing
- `Global-Messenger.aab` — Google Play distribution

After installing a newer build, uninstall the previous Global Messenger application first if Android reports a signing/version conflict or if old application storage may be affecting the test.

## 3. First test: backend health

The production backend exposes an unauthenticated health endpoint:

```text
https://global-messanger-backend.onrender.com/health
```

Expected response:

```json
{
  "ok": true,
  "service": "global-messenger",
  "time": "..."
}
```

You can test from a PC with:

```bash
curl -i https://global-messanger-backend.onrender.com/health
```

A successful `200` response proves that the public backend is reachable. If this fails, the Android application cannot complete login, registration, messaging, or other server operations.

## 4. Android network test

The native application must have internet access.

The Android build workflow explicitly configures:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

The production frontend API client uses:

```text
https://global-messanger-backend.onrender.com
```

It does not intentionally use `localhost` or `127.0.0.1` in a production Android build.

## 5. CORS / Capacitor test

Native Capacitor requests use the origin:

```text
capacitor://localhost
```

The backend explicitly accepts that native origin.

A CORS preflight can be tested with:

```bash
curl -i -X OPTIONS "https://global-messanger-backend.onrender.com/api/auth/login-email" \
  -H "Origin: capacitor://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"
```

Expected important headers:

```text
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: capacitor://localhost
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
Access-Control-Allow-Headers: content-type,authorization
```

This is an important Android-specific check because a browser desktop test can work while a native Capacitor request fails if the native origin is not allowed.

## 6. Registration test

The current registration endpoint is:

```text
POST /api/auth/register-email
```

Required JSON:

```json
{
  "username": "testuser123",
  "displayName": "Test User",
  "email": "testuser123@example.com",
  "phoneNumber": "+919999999999",
  "password": "TestPassword123!"
}
```

Successful registration returns HTTP `201` with:

```json
{
  "token": "...",
  "user": {
    "id": "...",
    "username": "testuser123",
    "displayName": "Test User"
  },
  "welcomeEmailSent": true
}
```

### Important registration fix

Previously, the server created the user first and then returned `503` when the welcome email could not be sent. That made the mobile UI look as if account creation had failed even though the database user had already been created.

The registration flow is now designed so that welcome-email delivery is **non-blocking**:

```text
Create account
    ↓
Create database user
    ↓
Try welcome email
    ├── sent → welcomeEmailSent=true
    └── failed → welcomeEmailSent=false
    ↓
Return token + user
```

Email delivery failure must not prevent a valid user account from being created or logged in.

## 7. Login test

The login endpoint is:

```text
POST /api/auth/login-email
```

Required JSON:

```json
{
  "identifier": "testuser123",
  "password": "TestPassword123!"
}
```

The identifier may be:

- Username
- Email
- Phone number

A successful login returns a JWT token and user information.

## 8. Complete Android smoke test

Test in this exact order:

### A. Application startup

- [ ] APK installs
- [ ] Application opens
- [ ] Application does not immediately close
- [ ] Login/register screen is visible
- [ ] No localhost URL is required

### B. Registration

- [ ] Enter username
- [ ] Enter display name
- [ ] Enter email
- [ ] Enter phone number
- [ ] Enter password
- [ ] Tap Create Account
- [ ] Account is created
- [ ] User enters the authenticated application
- [ ] Welcome-email failure does not block account creation

### C. Login

- [ ] Logout
- [ ] Login with username + password
- [ ] Login with email + password
- [ ] Login with phone + password
- [ ] Invalid password displays a useful error
- [ ] Successful login opens the messenger

### D. Messaging

Use two separate accounts/devices.

- [ ] Search for the second user
- [ ] Start direct chat
- [ ] Send text from Device A
- [ ] Receive text on Device B
- [ ] Reply
- [ ] Edit message
- [ ] Delete message
- [ ] React
- [ ] Verify delivery/read indicators
- [ ] Verify realtime delivery after reconnect

### E. Advanced message operations

- [ ] Copy
- [ ] Forward
- [ ] Star/save
- [ ] Pin
- [ ] Message info
- [ ] Multi-select
- [ ] Bulk delete
- [ ] Bulk forward
- [ ] Retry failed message

### F. Media

- [ ] Send image
- [ ] Send video
- [ ] Send audio/voice message
- [ ] Send document
- [ ] Open media viewer
- [ ] Download/share attachment

### G. Groups

- [ ] Create group
- [ ] Add member
- [ ] Remove member
- [ ] Rename group
- [ ] Open group information
- [ ] Send group message
- [ ] Pin group message
- [ ] Leave group

### H. Calls

- [ ] Start voice call
- [ ] Receive voice call
- [ ] Start video call
- [ ] Toggle microphone
- [ ] Toggle camera
- [ ] Speaker control
- [ ] End call
- [ ] Verify call history

### I. Account/security

- [ ] Open Profile Center
- [ ] Update profile
- [ ] Open Chat Info
- [ ] Change privacy settings
- [ ] View active sessions
- [ ] Revoke another session
- [ ] Logout
- [ ] Login again

## 9. E2EE message test

Use two devices that each have a valid device identity.

Test:

```text
Device A
   ↓
Send encrypted message
   ↓
Server stores encrypted envelope
   ↓
Device B
   ↓
Decrypt
   ↓
Display normal human-readable message
```

The chat UI must never display internal encryption envelopes or call-signalling payloads as normal messages.

If the UI displays:

```text
🔒 Encrypted message (not available on this device)
```

collect the Android log and determine whether the recipient device lacks the required identity key or whether the E2EE key exchange/decryption flow failed. Do not solve this by simply displaying the encrypted ciphertext to users.

## 10. Android logs

If the APK opens but a button does nothing, use Android logs rather than guessing.

With a connected phone and ADB installed:

```bash
adb devices
adb logcat -c
adb logcat | grep -i -E "GlobalMessenger|Capacitor|chromium|Console|Exception|Error|FATAL"
```

For Windows PowerShell:

```powershell
adb devices
adb logcat -c
adb logcat | Select-String "GlobalMessenger|Capacitor|chromium|Console|Exception|Error|FATAL"
```

Reproduce the failing action immediately after starting logcat.

Useful evidence includes:

- HTTP status code
- Request URL
- JavaScript exception
- Capacitor exception
- WebView console error
- Socket.IO connection error
- Android permission error
- timeout/network error

## 11. Common symptoms

### App opens but login/register says "Failed to fetch"

Check, in order:

1. Internet connection on the phone.
2. `GET /health` from the same network.
3. API base URL in the production build.
4. Capacitor CORS preflight for `capacitor://localhost`.
5. Android `INTERNET` permission.
6. Android logcat for WebView/network errors.

### Create Account appears to fail

Check whether the account was actually created in the database. A previous implementation could return `503` when the welcome email failed after the database insert. The current code makes welcome-email delivery non-blocking.

### Login opens the wrong screen

Clear the application data or uninstall/reinstall the latest APK, then test with a newly created account. Old JWT/localStorage state can otherwise make an authentication bug appear to be a navigation bug.

### Messages are not realtime

Check:

1. REST API request succeeds.
2. Socket.IO connection succeeds.
3. Authentication token is present.
4. Conversation membership is valid.
5. Android network remains connected.

### Calls connect on some networks but not others

The application has STUN/WebRTC support, but production-grade calling across restrictive NAT/firewall networks requires TURN infrastructure.

## 12. Release acceptance rule

An APK should not be considered production-ready just because Gradle successfully produced an APK.

A release is accepted only when:

```text
Build
  ↓
Install
  ↓
Startup
  ↓
Backend health
  ↓
Registration
  ↓
Login
  ↓
Realtime chat
  ↓
Media
  ↓
Groups
  ↓
Calls
  ↓
Security/session tests
  ↓
E2EE tests
  ↓
PASS
```

## 13. Current known infrastructure facts

- Android workflow uses Node 22 and Java 21.
- Capacitor Android build is generated during CI.
- The workflow configures INTERNET, CAMERA, RECORD_AUDIO, MODIFY_AUDIO_SETTINGS and POST_NOTIFICATIONS permissions.
- The latest successful build was Android Build #556.
- The release APK was successfully signed and verified with APK Signature Scheme v1 and v2.
- The production frontend API client falls back to `https://global-messanger-backend.onrender.com` when no non-loopback production API configuration is supplied.
- The backend explicitly permits `capacitor://localhost` as a native application origin.

## 14. Reporting a failing test

When reporting an Android failure, provide:

```text
APK build:
Android version:
Phone model:
Network: Wi-Fi / mobile data
Screen/action that failed:
Exact error shown:
Expected behavior:
Actual behavior:
ADB/logcat error:
```

This makes it possible to identify whether the problem is in the Android shell, WebView, API, authentication, database, Socket.IO, media storage, or calling layer.
