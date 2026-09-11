# Global Messenger — Production Operations

This runbook is for the Render-first production topology.

## Production endpoints

- Web: `https://global-messanger.onrender.com`
- API: `https://global-messanger-backend.onrender.com`
- API liveness/readiness: `/health`, `/ready`
- Help Centre: `https://global-messenger-help-centre.onrender.com`

## Deployment gate

A production deployment is considered healthy only when all of these pass:

1. `production-ci.yml` is green.
2. Render deployment finishes successfully.
3. API `/health` returns `200` and database status is healthy.
4. API `/ready` returns `200` with `ready: true`.
5. `production-smoke.yml` passes Web, API, Help Centre, PWA, CORS and protected-route checks.
6. Help Centre support requests can complete their browser preflight and POST request.

## Incident triage

### API unavailable

1. Open `/health`.
2. Open `/ready`.
3. Check the latest Render API deployment logs.
4. Check PostgreSQL availability and migration state.
5. Roll back to the last known-good Render deployment if the new version is unhealthy.
6. Re-run production smoke checks after rollback.

### Messages delayed or duplicated

1. Check Socket.IO connection/reconnect errors in browser logs.
2. Confirm the client is not creating multiple authenticated sockets for one session.
3. Verify the offline outbox is draining after reconnect.
4. Check message client IDs/idempotency behavior before retrying manually.
5. Test a second browser/device before declaring a server-wide incident.

### Password reset failures

1. Check SMTP host/port/security configuration.
2. Verify the SMTP credential is valid and not expired/revoked.
3. Confirm `PASSWORD_RESET_WEB_ORIGIN` matches the Render web origin.
4. Check server logs for connection timeout versus authentication failure.
5. Never put SMTP credentials in source control or issue comments.

### Support form failures

1. Open the Help Centre in a clean browser session.
2. Verify the browser OPTIONS request to `/api/support/requests` returns `204` or `200`.
3. Verify the POST receives a successful response.
4. Check `WEB_ORIGIN` contains both the web app and Help Centre origins.

## Media operations

The current fallback upload path is `/tmp/global-messenger/uploads`. Treat it as transient. Production media should use durable object storage or a supported persistent disk before promising permanent attachment availability.

Required controls for durable media:

- MIME and content validation
- maximum file size
- generated safe filenames
- upload cancellation/retry
- cleanup of abandoned uploads
- retention policy
- access authorization for every download
- monitoring for storage and upload failures

## Database operations

- Apply Prisma migrations through the production deployment process.
- Never run destructive migration commands against production.
- Keep automated backups enabled at the PostgreSQL provider.
- Perform a restore drill before a major release and record the result.
- Monitor connection count and slow queries.
- Review indexes for conversations, messages, memberships and notifications as traffic grows.

## Security operations

- Keep `JWT_SECRET`, SMTP credentials, Firebase credentials and signing keys only in provider/GitHub secrets.
- Rotate secrets after suspected exposure.
- Keep authentication and support rate limits enabled.
- Review 429 responses for abuse patterns.
- Review dependency/security workflow results before releases.
- Keep HTTPS-only production URLs.

## Android release operations

For each release:

1. Increment the Android version code.
2. Build signed APK and AAB using GitHub Actions.
3. Verify the APK signature with `apksigner`.
4. Generate and retain SHA-256 checksums.
5. Publish release notes.
6. Keep the previous release available for rollback.
7. Test login, messaging, notifications, media, microphone/camera permissions and reconnect on a real device.

## Required external infrastructure

The repository cannot safely manufacture provider credentials. Before a public launch, configure the real services for:

- durable media object storage
- Firebase/FCM push notifications
- TURN/STUN for reliable WebRTC across restrictive networks
- persistent Android signing secrets
- PostgreSQL backup and restore
- production SMTP

Do not mark these as complete merely because the application builds.
