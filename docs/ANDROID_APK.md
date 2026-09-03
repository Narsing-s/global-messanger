# Android APK: Download, Install, Build and Release

## Current status

Global Messenger currently has a **real Android APK** published in the GitHub Release named `android-latest`.

**Download page:** https://github.com/Narsing-s/global-messanger/releases/tag/android-latest

The current release asset is:

```text
global-messenger.apk
```

It is an Android Package (`application/vnd.android.package-archive`), so it is an actual installable APK. It is not an AAB, ZIP, or source-code archive.

## APK vs AAB

| File | Meaning | Direct Android installation |
|---|---|---|
| `.apk` | Android Package | ✅ Yes |
| `.aab` | Android App Bundle for Google Play | ❌ No |
| `.zip` | Archive | ❌ No |

Use the **APK** when you want to install and test Global Messenger directly on an Android phone.

Use the **AAB** when preparing a Google Play Store release.

## 1. Download the current APK

1. Open the GitHub Releases page:
   `https://github.com/Narsing-s/global-messanger/releases/tag/android-latest`
2. Find the **Assets** section.
3. Download `global-messenger.apk`.
4. Transfer/open the file on the Android device.
5. Android may ask for permission to install an app from that source.
6. Approve that permission only if you trust the source.
7. Install the application.

## 2. Where the APK comes from

The source workflow is:

```text
.github/workflows/android-build.yml
```

The workflow:

1. Checks out the repository.
2. Installs Node.js and Java.
3. Installs dependencies.
4. Builds the React/Vite client.
5. Adds/synchronizes the Capacitor Android platform.
6. Adds required Android permissions.
7. Configures release signing from GitHub Actions secrets.
8. Runs `assembleRelease`.
9. Finds the generated release APK.
10. Checks that the APK is a valid ZIP/package.
11. Runs Android `apksigner verify`.
12. Uploads the APK as a GitHub Actions artifact.
13. Publishes the APK to the `android-latest` GitHub Release.

This is why the release asset is an actual `.apk` rather than a renamed archive.

## 3. GitHub Actions artifact vs GitHub Release asset

GitHub Actions artifacts are build outputs retained by a workflow run. GitHub documents artifacts as a way to persist and share files produced by workflow jobs. citeturn0search3

For normal users, the **GitHub Release asset** is the simpler option because they can open the release page and download the APK directly.

## 4. Build the APK locally on Windows

From the repository root:

```powershell
npm install
npm run build -w apps/web
npm run android:add
npm run android:sync
```

Then:

```powershell
cd apps/web/android
./gradlew assembleRelease
```

The generated APK will normally be under:

```text
apps/web/android/app/build/outputs/apk/release/
```

The exact filename may vary with the Android/Gradle configuration.

## 5. Build and run a debug APK on a phone

For development/testing:

```powershell
npm run build -w apps/web
npm run android:sync
npm run android:run
```

Use a real Android device for testing camera, microphone, notifications, calls and network reconnect behavior.

## 6. Release signing

A release APK should be signed. The repository workflow expects these GitHub Actions secrets:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Never commit a keystore, signing password, private key or other secret into the repository.

The workflow creates the keystore only inside the CI build environment and verifies the resulting release APK before publishing it.

## 7. Google Play release

The APK used for direct installation is not the final Google Play submission format.

For Google Play:

1. Build a signed Android App Bundle (`.aab`).
2. Increment the Android version code for every release.
3. Confirm the application ID remains:

```text
com.globalmessenger.app
```

4. Test the release through Play Console internal/closed testing.
5. Complete the Play Console privacy, data safety, content rating and store listing requirements.
6. Submit the `.aab` to Google Play.

See [`06-android-play-store.md`](./06-android-play-store.md) for the complete Play Store process.

## 8. Troubleshooting

### I downloaded a ZIP instead of an APK

Make sure you downloaded the file under **Release → Assets** named:

```text
global-messenger.apk
```

Do not use GitHub's **Code → Download ZIP** option. That downloads the source repository, not the Android application.

### The APK does not appear in Assets

Open the `android-latest` release and check whether the release has an asset named `global-messenger.apk`. If the workflow failed, the asset will not be published.

### Android says the app cannot be installed

Check that:

- The download completed successfully.
- The file ends with `.apk`.
- The APK came from the project's GitHub Release.
- The Android version is compatible with the application's minimum SDK.
- A previous conflicting build is not installed.

### The APK installs but cannot connect

The Android application must use the production API endpoint when running outside the local development environment. It must not point at `localhost` on the user's phone.

## 9. Release checklist

- [ ] Web build succeeds
- [ ] Capacitor sync succeeds
- [ ] Release APK builds
- [ ] APK is verified by `apksigner`
- [ ] APK installs on a real Android device
- [ ] Login/registration tested
- [ ] One-to-one messaging tested
- [ ] Group messaging tested
- [ ] Media upload tested
- [ ] Camera/microphone permissions tested
- [ ] Notifications tested
- [ ] Voice/video calling tested
- [ ] Reconnect behavior tested
- [ ] Production API/WSS endpoints confirmed
- [ ] GitHub Release asset uploaded
- [ ] Play Store `.aab` separately prepared when publishing to Google Play
