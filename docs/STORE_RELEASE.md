# Global Messenger — Store Release Plan

Global Messenger is a free, realtime messaging product for Android, iPhone/iPad, Windows and macOS.

## Product promise
- Free for end users.
- Realtime one-to-one and group messaging.
- Online/offline presence and last seen.
- Profile photos.
- File/image sharing.
- Voice/video calling foundation.
- Reactions, replies, editing and deletion.
- Responsive desktop and mobile web UI.

## Android / Google Play
1. Build the web app with `npm run build`.
2. Sync the Capacitor Android project with the current web build.
3. Configure a unique application ID such as `com.globalmessenger.app`.
4. Configure the production API URL and HTTPS backend.
5. Create a release signing key and keep it outside Git.
6. Build an Android App Bundle (`.aab`).
7. Test on physical Android devices before Play submission.
8. Complete Play Console privacy, data-safety, content-rating and store-listing declarations.
9. Upload screenshots for phone and tablet form factors.
10. Submit an internal test before production rollout.

## iPhone / iPad
Use the Capacitor iOS project. A macOS machine with Xcode and an Apple Developer account is required to sign and publish an iOS app. Configure the same application identifier, app icon, launch screen, HTTPS API and privacy declarations.

## Windows
Use the shared web frontend inside a signed desktop wrapper. Test installer, auto-update strategy, deep links, notifications, file uploads, microphone/camera permissions and offline/reconnect behavior.

## macOS
Use the shared web frontend inside a signed/notarized desktop wrapper. Test permissions, notifications, camera/microphone access, file handling and reconnect behavior.

## Production requirements
- HTTPS everywhere.
- A strong production `JWT_SECRET`.
- Production database with backups.
- Persistent upload storage instead of local ephemeral disk.
- Rate limiting and abuse protection.
- Error monitoring and structured logs.
- Automated build/test checks before release.
- Privacy policy and terms before public store launch.
- Never commit secrets, signing keys, tokens or database passwords.

## Store short description
**Free realtime messaging for everyone — chat, share, react and connect without borders.**

## Store long description
**Global Messenger is a free, friendly messaging app built for fast conversations without unnecessary complexity.**

Chat privately or create group conversations, share images and files, see when people are online, and keep conversations moving with realtime delivery. Global Messenger is designed for phones, tablets and desktop users with a responsive experience across platforms.

### Highlights
- Free messaging
- Private one-to-one conversations
- Group chats
- Realtime online/offline presence
- Profile photos
- Image and file sharing
- Replies and reactions
- Message editing and deletion controls
- Voice and video calling foundation
- Responsive Android, iOS, Windows and macOS experience

Global Messenger is intended to remain free for end users.

## Screenshot checklist
Capture real production builds at:
- Login / welcome screen
- New account screen
- Conversation list
- One-to-one chat
- Group chat
- Online profile view
- Offline profile / last seen view
- Profile photo viewer
- File/image sharing
- Voice/video call UI
- Mobile portrait
- Desktop wide layout

Do not use mocked users, fake messages or development URLs in store screenshots.