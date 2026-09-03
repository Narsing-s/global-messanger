# Android & Google Play Publishing

Global Messenger uses Capacitor to package the shared React/Vite client as an Android application.

## 1. Android architecture

```text
React + Vite web app
        |
        | Capacitor
        v
Android application
        |
        | HTTPS / WSS
        v
Fastify + Socket.IO API
        |
        v
PostgreSQL / Prisma
```

The Android app uses the same messaging, authentication and calling backend as the web client.

## 2. Current Android APK

A real installable Android APK is currently published in the GitHub Release `android-latest`.

**Download:** https://github.com/Narsing-s/global-messanger/releases/tag/android-latest

Download the file under **Assets**:

```text
global-messenger.apk
```

This is an actual Android Package (`application/vnd.android.package-archive`), not an `.aab` or ZIP archive.

For a step-by-step download/install guide, see [`ANDROID_APK.md`](./ANDROID_APK.md).

## 3. What is configured

The repository contains:

- `apps/web/capacitor.config.ts`
- Capacitor Android dependencies in `apps/web/package.json`
- Android helper commands in `package.json`
- `.github/workflows/android-build.yml`
- Android application ID: `com.globalmessenger.app`
- Android application name: `Global Messenger`
- Web output directory: `dist`
- HTTPS Android scheme
- CI permissions for Internet, camera, microphone and notifications

The Android project can be generated reproducibly by Capacitor during local development and CI.

## 4. Local Windows setup

Install:

- Node.js 22 LTS or newer
- Android Studio
- Android SDK Platform 36 or newer
- Android SDK Build-Tools
- Android SDK Platform-Tools
- A Java JDK supported by the installed Android/Gradle toolchain

Then:

```powershell
cd C:\Users\91938\Desktop\global-messanger
npm install
npm run build -w apps/web
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio should open:

```text
apps/web/android
```

## 5. Run on a real Android phone

Enable Developer Options and USB debugging on the phone, connect it to Windows, then run:

```powershell
cd C:\Users\91938\Desktop\global-messanger
npm run android:run
```

Test on a real device because camera, microphone, notifications, WebRTC and network reconnect behavior are important for this application.

## 6. Test the complete Messenger flow

Use two independent accounts/devices and verify:

- Registration/login
- One-to-one messaging
- Emoji
- Typing indicator
- Typing sound
- Notification sound
- Image/file upload
- Profile photo
- Message editing
- Delete for me
- Delete for everyone
- Group messaging
- Voice call
- Video call
- Camera permission
- Microphone permission
- Accept/decline/end call
- Call ringtone
- Call log in chat
- Reconnect after network loss
- App restart while logged in
- Android back navigation

## 7. Production backend requirement

Do not point a production Android build at `localhost` or a development machine.

Use production HTTPS/WSS endpoints, for example:

```text
https://api.example.com
wss://api.example.com
```

Configure the production API URL through the application's production configuration before creating the public release.

For WebRTC calls, configure production STUN/TURN infrastructure. TURN is important for users whose networks cannot establish a direct peer-to-peer connection.

## 8. Android permissions

Global Messenger uses permissions related to its core features:

- Internet — realtime messaging and media
- Camera — video calls
- Microphone — voice/video calls
- Notifications — messages and incoming calls

Request permissions only when needed and explain their purpose to users.

## 9. GitHub Actions Android APK workflow

The Android workflow is:

```text
.github/workflows/android-build.yml
```

It performs the following sequence:

```text
Build React app
      ↓
Generate Capacitor Android project
      ↓
Sync Android assets
      ↓
Configure permissions
      ↓
Configure CI release signing
      ↓
assembleRelease
      ↓
Verify APK + apksigner
      ↓
Upload Actions artifact
      ↓
Publish GitHub Release asset
```

The current release workflow therefore produces a **real `.apk` file** for direct Android installation. GitHub Actions artifacts can also be downloaded from the workflow run; GitHub documents artifacts as files produced by workflow jobs that can be persisted and shared. citeturn0search3

## 10. Release signing

The CI workflow expects these GitHub Actions secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Never commit the keystore or signing credentials to GitHub.

The workflow verifies the release APK with Android `apksigner` before publishing it.

## 11. Build a release App Bundle for Google Play

The direct-download APK and the Google Play App Bundle are different release artifacts.

For Google Play:

```text
Android source
    ↓
Signed .aab
    ↓
Google Play Console
```

A `.aab` is **not** directly installed on a normal Android device. The `.apk` is the direct-install format.

Before Play submission:

1. Confirm application ID `com.globalmessenger.app`.
2. Confirm app name `Global Messenger`.
3. Set the production API endpoint.
4. Configure launcher icons and splash assets.
5. Set the version name.
6. Increase the version code for each release.
7. Configure secure release signing.
8. Build a signed `.aab`.
9. Test through Play Console internal/closed testing.

Never commit the signing keystore, passwords or private keys.

## 12. Google Play target API

Google Play requirements change over time. Verify the current target API requirement in Play Console and official Android/Google Play documentation before every submission.

For the current project configuration, use Android SDK/API 36 or newer unless the current Play requirement specifies a higher level.

## 13. Play Console setup

Prepare:

- App name: `Global Messenger`
- Package/application ID: `com.globalmessenger.app`
- App icon
- Feature graphic
- Phone screenshots
- Tablet screenshots if supported
- Short description
- Full description
- Privacy Policy URL
- Terms of Service URL
- Data Safety declaration
- Content rating
- Target audience information
- App access instructions if reviewers need an account
- Ads declaration, if applicable

## 14. Testing tracks

Use the Play Console tracks in this order:

```text
Internal testing
      ↓
Closed testing
      ↓
Open testing (optional)
      ↓
Production
```

Keep the app in testing until independent accounts can reliably exchange messages and complete calls on real Android devices.

## 15. Play Store privacy requirements

Publish a real Privacy Policy that accurately explains:

- Account information
- Profile photos
- Messages
- Uploaded files
- Device permissions
- Camera/microphone use
- Notifications
- Call metadata
- Logs and diagnostics
- Database/storage retention
- Account deletion
- Data deletion requests
- Third-party infrastructure, if any

The Play Console Data Safety answers must match the actual implementation.

## 16. Production release checklist

- [ ] Production HTTPS API
- [ ] Production WSS Socket.IO endpoint
- [ ] Production PostgreSQL
- [ ] PostgreSQL backups
- [ ] TURN server
- [ ] File/media object storage
- [ ] Rate limiting
- [ ] Abuse/spam protection
- [ ] Account deletion
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Data Safety declaration
- [ ] Production error monitoring
- [ ] Android API 36+
- [ ] Release signing key secured
- [ ] Signed `.aab`
- [ ] Direct-install `.apk` tested
- [ ] Internal testing passed
- [ ] Closed testing passed
- [ ] Store listing completed
- [ ] Play review submitted

## 17. After launch

Monitor:

- Crash and ANR rate
- Message delivery failures
- Socket reconnect failures
- Call connection failures
- Notification failures
- Upload failures
- Authentication failures
- Database health
- TURN usage and call quality

Release every update with the same application ID and a higher Android version code.
