# Cross-platform push notifications

Global Messenger now has the client-side foundation for push registration on Android and iPhone/iPad through Capacitor Push Notifications. The server stores device registrations in `PushDevice`.

## Platforms

- Android: Firebase Cloud Messaging (FCM)
- iPhone/iPad: Apple Push Notification service through Firebase Cloud Messaging
- Web/Windows PWA: use Firebase Cloud Messaging Web separately; native Capacitor push registration is not used by the browser build

Firebase documents FCM as a cross-platform notification service for Apple, Android and web clients.

## Local setup

From the repository root:

```bash
npm install
npm run db:generate -w apps/server
npm run db:migrate -w apps/server
npm install -w apps/web
npm run build -w apps/web
```

For Android/iOS:

```bash
npm run mobile:sync -w apps/web
```

## Firebase setup

1. Create a Firebase project.
2. Add the Android application with package `com.globalmessenger.app`.
3. Add the iOS application with the same product identity and the iOS bundle identifier chosen in Xcode.
4. Download/configure the Android Firebase configuration.
5. Configure APNs credentials for the Apple application.
6. Configure Firebase Web Push/VAPID credentials for the browser/PWA build.
7. Keep server credentials out of GitHub. Use production environment variables/secrets.

## Important

The client registers the native push token at `/api/devices`. The production server must expose that authenticated endpoint and use Firebase Admin SDK (or the FCM HTTP v1 API) to send notifications to stored device registrations.

Recommended notification payloads:

- New message: `type=message`, `conversationId`, sender display name, message preview
- Incoming audio call: `type=call`, `callType=audio`, `conversationId`, caller
- Incoming video call: `type=call`, `callType=video`, `conversationId`, caller
- Reaction: `type=reaction`, `conversationId`, `messageId`

Never put passwords, JWT secrets, Firebase service-account private keys, or other credentials into the client bundle.

## Android

Android 13+ requires runtime notification permission. Test notification permission, background delivery, notification channels, custom ringtone/sound, and tapping a notification into the correct conversation.

## iOS

iOS requires notification permission and APNs configuration. Test on a physical iPhone/iPad because simulator behavior does not replace production push testing.

## Windows/Web

The browser/PWA build should use Firebase Cloud Messaging Web with HTTPS and a service worker. Web push requires HTTPS and a configured VAPID key.

## Production checklist

- [ ] `/api/devices` authenticated endpoint deployed
- [ ] FCM/APNs credentials configured as server secrets
- [ ] Push token registration tested on Android
- [ ] Push token registration tested on iPhone
- [ ] Background message tested
- [ ] Terminated-app message tested
- [ ] Notification tap opens the correct chat
- [ ] Incoming-call notification tested
- [ ] Invalid/expired tokens removed or disabled
- [ ] Privacy/Data Safety declarations updated
