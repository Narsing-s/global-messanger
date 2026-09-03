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

## 2. Android release downloads

The production Android release is published as a **versioned GitHub Release**.

**Latest release:** https://github.com/Narsing-s/global-messanger/releases/latest

Each production release contains:

```text
Global-Messenger.apk   ← direct Android installation
Global-Messenger.aab   ← Google Play Console upload
```

The APK is an actual Android Package (`application/vnd.android.package-archive`), not an `.aab` or ZIP archive. The AAB is a Play Store publishing bundle and is not directly installable like an APK.

For the step-by-step APK guide, see [`ANDROID_APK.md`](./ANDROID_APK.md).

## 3. Production release flow

The repository now separates normal CI builds from production releases:

```text
Push to main
    ↓
Web CI/deployment
    ↓
Android build + verification
    ↓
GitHub Actions artifact only

Create and push version tag
    v1.0.0 / v1.0.1 / v1.1.0
    ↓
Android build + verification
    ↓
Signed APK + AAB
    ↓
GitHub Release with matching version tag
```

A push to `main` **does not replace the production GitHub Release**. It produces a CI artifact for testing.

A version tag such as `v1.0.0` starts the same Android build and then publishes the signed packages to a new GitHub Release.

Example:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow makes that tag the latest GitHub Release. Therefore this stable link always points to the newest production version:

```text
https://github.com/Narsing-s/global-messanger/releases/latest
```

## 4. What is configured

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

## 5. Local Windows setup

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

## 6. Run on a real Android phone

Enable Developer Options and USB debugging on the phone, connect it to Windows, then run:

```powershell
cd C:\Users\91938\Desktop\global-messanger
npm run android:run
```

Test on a real device because camera, microphone, notifications, WebRTC and network reconnect behavior are important for this application.

## 7. Test the complete Messenger flow

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

## 8. Production backend requirement

Do not point a production Android build at `localhost` or a development machine.

Use production HTTPS/WSS endpoints, for example:

```text
https://api.example.com
wss://api.example.com
```

Configure the production API URL through the application's production configuration before creating the public release.

For WebRTC calls, configure production STUN/TURN infrastructure. TURN is important for users whose networks cannot establish a direct peer-to-peer connection.

## 9. GitHub Actions Android workflow

The Android workflow is:

```text
.github/workflows/android-build.yml
```

It performs:

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
assembleRelease + bundleRelease
      ↓
Verify APK + AAB
      ↓
Upload Actions artifact
      ↓
If tag starts with v → publish versioned GitHub Release
```

### Normal `main` build

A normal push to `main` builds and verifies the Android packages but **does not publish a production Release**. The resulting `global-messenger-android-release` artifact is intended for CI/testing.

### Production version tag

Push a semantic version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow then publishes:

```text
Global-Messenger.apk
Global-Messenger.aab
```

to:

```text
GitHub Releases → v1.0.0
```

The next release can be `v1.0.1`, then `v1.1.0`, and so on.

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

## 11. Build artifacts

There are two different GitHub download mechanisms:

### GitHub Actions artifact

The workflow artifact is for developers/testers and may be downloaded by GitHub as an archive. It contains the generated APK/AAB files.

### GitHub Release assets

Release assets are the user-facing production files. `Global-Messenger.apk` is the actual APK file and can be downloaded directly and installed on Android. `Global-Messenger.aab` is the Play Store bundle.

Do not use **Code → Download ZIP** to install the application. That ZIP is the repository source code.

## 12. Google Play App Bundle

For Google Play:

```text
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
8. Upload the generated `.aab` to Play Console.
9. Test through Play Console internal/closed testing.

Never commit the signing keystore, passwords or private keys.

## 13. Google Play target API

Google Play requirements change over time. Verify the current target API requirement in Play Console and official Android/Google Play documentation before every submission.

For the current project configuration, use Android SDK/API 36 or newer unless the current Play requirement specifies a higher level.

## 14. Play Console setup

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

## 15. Testing tracks

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

## 16. Play Store privacy requirements

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

## 17. Production release checklist

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

## 18. After launch

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

Release every update with the same application ID and a higher Android version code. Use a new semantic Git tag for every production release.
