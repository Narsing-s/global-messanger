# Android & Google Play Publishing

## Recommended approach

Keep the existing React/Vite client and package it as an Android application with Capacitor. The Android app becomes the mobile shell while the production Fastify/Socket.IO backend remains shared.

This avoids maintaining a separate Android UI at the beginning while still allowing native Android capabilities later.

## Phase 1 — Prepare the web app

1. Make the production web client fully responsive.
2. Put the API behind HTTPS/WSS.
3. Verify WebRTC calls on real Android devices.
4. Add Android-friendly notification, camera and microphone permission flows.
5. Add account deletion and privacy/data controls.
6. Prepare Privacy Policy and Terms of Service URLs.

## Phase 2 — Add Capacitor

From the web project, install Capacitor and initialize an Android platform. Use the project's current build output directory as the web assets directory.

Typical workflow:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npm install @capacitor/android
npx cap add android
npm run build
npx cap sync android
npx cap open android
```

Do not copy these commands blindly if the repository's Vite output/config differs; verify the generated `dist` directory and Capacitor configuration first.

## Phase 3 — Android requirements

Configure:

- Unique application ID such as `com.globalmessenger.app`
- App name and launcher icon
- Splash screen
- Release version/versionCode
- Internet permission
- Camera permission with a clear user-facing purpose
- Microphone permission with a clear user-facing purpose
- Notification permission where required
- Secure HTTPS/WSS endpoints

## Phase 4 — Build an Android App Bundle

Use Android Studio/Gradle to create a signed release `.aab`. Google Play uses Android App Bundles for modern app distribution. citeturn0search5turn0search4

Keep the upload/signing credentials secure. Never commit keystores or passwords to Git.

## Phase 5 — Current Google Play target requirement

As of **August 31, 2026**, new apps and app updates submitted to Google Play must target **Android 16 / API 36 or higher**. citeturn0search0turn0search1

Before building the release, confirm the installed Android SDK/Gradle/Android Gradle Plugin support the required target API.

## Phase 6 — Play Console

Create a Play Console developer account and complete identity/developer verification. Google requires developer information such as developer name, legal name/address, contact email and phone information for personal accounts. citeturn0search12

Create the app in Play Console and provide:

- App name
- Default language
- App/category information
- Store description
- App icon
- Screenshots
- Feature graphic where requested
- Privacy Policy
- App content declarations
- Data Safety information
- Content rating
- Target audience information
- Ads declaration if applicable

## Phase 7 — Testing

Use Play Console testing tracks before production:

1. **Internal testing** — quick team/device validation.
2. **Closed testing** — controlled external testers.
3. **Open testing** — broader public testing.
4. **Production** — public availability.

Google states that new personal developer accounts created after November 13, 2023 have specific testing requirements before production access. citeturn0search6

## Phase 8 — Production release

In Play Console create a production release, upload the signed `.aab`, review the generated release, complete outstanding declarations and submit for review. Google documents the release flow and testing tracks here. citeturn0search4

## Messaging app privacy checklist

Because Global Messenger handles messages, profiles, files, microphone and camera data, do not publish until the privacy/data declarations accurately describe what the app collects, processes, stores and shares.

The app should also provide a reliable way for users to request account/data deletion where required by the applicable Google Play policies.

## Post-launch

Monitor:

- Crash rate
- ANR rate
- Message delivery failures
- Call connection failures
- Notification failures
- Upload failures
- Login failures
- Server/database health

Release updates with an incremented versionCode and the same application ID/signing configuration. Google requires the version code to increase for updates. citeturn0search8
