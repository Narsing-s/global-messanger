# Global Messenger — External Production Setup

These items require real provider resources or credentials and therefore are intentionally not faked in source code.

## 1. Durable media storage

Configure an S3-compatible or other durable object-storage provider.

Recommended application contract:

```text
MEDIA_STORAGE_PROVIDER=s3
MEDIA_STORAGE_BUCKET=<bucket>
MEDIA_STORAGE_REGION=<region>
MEDIA_STORAGE_ENDPOINT=<endpoint-if-required>
MEDIA_STORAGE_ACCESS_KEY_ID=<secret>
MEDIA_STORAGE_SECRET_ACCESS_KEY=<secret>
```

Use private objects and application-authorized download URLs. Never expose provider credentials to the browser.

## 2. Push notifications

Configure Firebase Cloud Messaging for Android and store the Firebase Admin credentials as Render secrets.

Required behavior:

- register a device token after sign-in
- update tokens after refresh
- remove invalid/unregistered tokens
- deliver in foreground and background
- open the exact conversation when the notification is tapped
- maintain unread badge state

## 3. WebRTC TURN/STUN

Configure a production TURN provider or self-hosted TURN service.

The client must support:

- STUN discovery
- TURN relay fallback
- microphone/camera permission retry
- ICE restart after network changes
- call cleanup on disconnect
- incoming-call timeout
- Android foreground/background transitions

Never ship fake TURN credentials.

## 4. Android signing

GitHub Actions should receive the release keystore through encrypted repository/environment secrets.

Keep these outside the repository:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Verify every signed APK with `apksigner` and publish the SHA-256 checksum with the release.

## 5. PostgreSQL backups

Enable automated backups with the actual PostgreSQL provider. A backup is not considered operationally proven until a restore drill succeeds.

Record:

- backup timestamp
- restore timestamp
- schema/migration version
- data validation result
- recovery time

## 6. SMTP

Use a production SMTP provider or correctly configured Gmail/Workspace SMTP account.

Required variables are documented in `docs/11-market-readiness.md` and `render.yaml`. Never commit the password.

## 7. Production configuration principle

The repository contains safe defaults, validation, CI and runbooks. Credentials and provider-specific resources must be supplied through Render/GitHub secrets. This separation prevents accidental publication of credentials and prevents a green CI build from pretending that external infrastructure has been configured.
