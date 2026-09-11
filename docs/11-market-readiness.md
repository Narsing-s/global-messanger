# Global Messenger — Market Readiness

This document is the production gate for the Render-first architecture.

## Production topology

```text
Web/PWA      -> Render Web
Android      -> Render API
Help Centre  -> Render API
Render API   -> Render PostgreSQL
```

Oracle and Vercel are not deployment targets for this product.

## Automated gates now in the repository

- `production-ci.yml` — PostgreSQL migration validation, Prisma generation, web/server builds.
- `qa-browser-e2e.yml` — browser checks for the local production build and the live Render web app.
- `help-centre-smoke.yml` — Help Centre/API availability coverage.
- `production-smoke.yml` — scheduled live checks for Web, API `/health`, API `/ready`, Help Centre, PWA assets, support preflight, and protected API behavior.
- `android-build.yml` — release APK/AAB build, checksum generation, artifacts, and GitHub release publishing.
- `security-dependency-sync.yml` — dependency/security maintenance.

## Reliability checklist

### Realtime

- [ ] Socket reconnect after Wi-Fi/mobile-network changes.
- [ ] Session recovery after browser sleep/resume.
- [ ] Offline message queue and retry with idempotency keys.
- [ ] Duplicate-message suppression across reconnects and multiple tabs.
- [ ] Multi-tab conversation state synchronization.

These are behavioral tests and should be verified against the production client/server rather than marked complete from static CI alone.

### Calling

- [ ] Incoming voice call.
- [ ] Accept/reject/end call.
- [ ] Microphone permission denial and retry.
- [ ] Video camera permission denial and retry.
- [ ] Reconnect after network interruption.
- [ ] Call history and missed-call state.
- [ ] Android background/foreground call behavior.
- [ ] TURN/STUN configuration and real-device testing.

### Push notifications

- [ ] Foreground delivery.
- [ ] Background delivery.
- [ ] Tap notification opens the exact conversation.
- [ ] Unread badge behavior.
- [ ] Token refresh/revocation.
- [ ] Invalid-token cleanup.

### Media

- [ ] MIME/content validation.
- [ ] File-size limits.
- [ ] Safe generated filenames.
- [ ] Upload cancellation and retry.
- [ ] Thumbnail generation for supported media.
- [ ] Abandoned-upload cleanup.
- [ ] Production object storage or persistent storage strategy.

The current Render configuration uses `/tmp/global-messenger/uploads`; that location is suitable for transient testing only. Before treating media persistence as production-grade, use durable object storage or a supported persistent disk and add backup/retention monitoring.

### Security

- [ ] Rate-limit registration/login/password-reset/support endpoints.
- [ ] Session/token revocation and “log out all sessions”.
- [ ] Token/session rotation policy.
- [ ] Security headers and HTTPS-only production behavior.
- [ ] Audit logging for security-sensitive operations.
- [ ] Dependency vulnerability checks.
- [ ] No secrets committed to the repository.

### Database

- [ ] Migration validation on every production build.
- [ ] Restore-tested PostgreSQL backups.
- [ ] Connection-pool limits appropriate for Render.
- [ ] Query/index review for message and conversation tables.
- [ ] Retention/cleanup jobs for disposable data.

### Android release

- [ ] Persistent production signing keystore configured in GitHub secrets.
- [ ] Signed APK verified by `apksigner`.
- [ ] AAB uploaded to Play Console.
- [ ] Version code increments on every Play release.
- [ ] SHA-256 recorded with every release.
- [ ] Release notes and rollback version retained.

## Required production configuration

Render should provide:

- `DATABASE_URL`
- `JWT_SECRET`
- `WEB_ORIGIN=https://global-messanger.onrender.com,https://global-messenger-help-centre.onrender.com`
- `PASSWORD_RESET_WEB_ORIGIN=https://global-messanger.onrender.com`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_STARTTLS`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`
- durable media storage configuration once object storage is enabled

Never commit real secrets.

## Incident response

For a production incident:

1. Check `/health` for process liveness.
2. Check `/ready` for database readiness.
3. Check Render deployment logs.
4. Check PostgreSQL availability and migration state.
5. Check Socket.IO reconnect/error metrics.
6. Check notification and upload failures.
7. Preserve the failing deployment/version before rollback.
8. Verify the post-rollback smoke workflow.

## Definition of done

A release is market-ready only when automated CI is green **and** the behavioral checklist above has been exercised on real web and Android clients. A green build alone is not evidence that calling, push delivery, reconnect behavior, media persistence, or database restore procedures work end-to-end.
