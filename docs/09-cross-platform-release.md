# Global Messenger — Android, iPhone, Windows and Web

Global Messenger is designed as one product with one shared backend and platform-specific app shells.

## Supported platforms

| Platform | Distribution | Technology |
|---|---|---|
| Android phones/tablets | Google Play | Capacitor + Android |
| iPhone/iPad | Apple App Store | Capacitor + iOS |
| Windows | Microsoft Store + installable web | PWA / optional MSIX |
| Desktop web | HTTPS website | React + Vite |

Capacitor supports iOS and Android from an existing web application, while Windows can use the same responsive web app as a PWA. Microsoft documents PWA packaging as the fastest Store path for web applications.

## One backend

All platforms use the same production services:

```text
Android ─┐
iPhone ──┼── HTTPS/WSS ── Fastify + Socket.IO ── PostgreSQL
Windows ─┤                         │
Web ─────┘                         ├── Media storage
                                   └── WebRTC/STUN/TURN
```

This means a user can sign in on Android and continue the same account/conversations on iPhone, Windows or the web.

## Android

From `apps/web`:

```bash
npm install
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

Use Android Studio for device testing and the signed release `.aab` for Google Play.

## iPhone/iPad

Apple builds require macOS and Xcode for the native iOS build/signing workflow.

From `apps/web` on a Mac:

```bash
npm install
npm run build
npm run ios:add
npm run ios:sync
npm run ios:open
```

In Xcode configure:

- Bundle Identifier: `com.globalmessenger.app`
- Signing Team
- App icon
- Camera usage description
- Microphone usage description
- Push notification capability
- Production HTTPS/WSS endpoint

Then test on a real iPhone before submitting to App Store Connect.

## Windows

The fastest Windows distribution is the installable PWA. The site must be served over HTTPS and include a valid web manifest and service worker. Microsoft documents PWABuilder as the packaging route for Microsoft Store PWA submissions.

Recommended Windows release stages:

1. Deploy production web app over HTTPS.
2. Add service worker and offline/app-shell behavior.
3. Validate the manifest and icons.
4. Test installation in Edge/Chrome on Windows 10/11.
5. Use PWABuilder to generate the Microsoft Store package.
6. Create a Microsoft Partner Center account.
7. Submit the generated package for Store certification.

If deeper Windows-native APIs are required later, build an MSIX/WinUI or another Windows desktop shell around the same web/backend services.

## Mobile permissions

The mobile apps must clearly explain why camera, microphone and notifications are needed. Test:

- First camera permission request
- First microphone permission request
- Notification permission
- Permission denied
- Permission denied permanently
- Returning from system settings
- Incoming call while app is foreground/background
- Call accept/decline/end
- Message notification while another chat is open

## Cross-platform QA

Test the same account on at least:

- Android phone
- iPhone
- Windows 11
- Desktop browser

Verify:

- Login/logout
- Realtime messages
- Emoji/reactions
- Typing indicator/sound where permitted
- Profile photo
- File upload
- Edit/delete rules
- Group messages
- Voice call
- Video call
- Call logs
- Notifications
- Reconnect after network loss

## Release principle

Do not create separate business logic for each platform. Keep authentication, conversations, message rules and realtime events on the backend. Keep the React client as the shared UI and add only platform-specific integrations where necessary.
