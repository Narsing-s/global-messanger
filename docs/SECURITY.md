# 🔐 Global Messenger Security Guide

This document records the security baseline for Global Messenger and the checks to perform before public releases.

## 1. Security principles

Global Messenger should:

- keep secrets outside source control;
- authenticate protected API requests with short-lived/appropriately managed credentials;
- hash user passwords with bcrypt rather than storing plaintext passwords;
- validate and authorize access to conversations and user-owned data;
- restrict production CORS to trusted application origins;
- use HTTPS and secure WebSocket connections in production;
- limit abusive or automated requests;
- avoid logging passwords, tokens or private message content;
- provide a clear account/data deletion path;
- keep dependencies and deployment images maintained.

## 2. Secrets

Never commit:

- `.env` files containing real values;
- JWT secrets;
- database passwords or connection credentials;
- SMTP credentials;
- cloud storage credentials;
- API keys;
- private signing keys;
- mobile signing material.

Use the hosting platform's secret/environment-variable mechanism for production values.

## 3. Authentication

Protected endpoints use JWT authentication. Clients should send:

```text
Authorization: Bearer <token>
```

Passwords must remain bcrypt-hashed. Do not expose authentication tokens in URLs, screenshots, issue reports or application logs.

## 4. Authorization

Authentication alone is not sufficient. Every protected resource must verify that the authenticated user is allowed to access or modify the requested conversation, message, file, profile or account data.

When adding an endpoint, review both:

1. **Authentication:** Is the caller logged in?
2. **Authorization:** Is this caller allowed to perform this exact operation on this exact resource?

## 5. User-uploaded files

Uploads should be treated as untrusted input.

Production deployments should use:

- size limits;
- MIME/type validation;
- safe generated filenames;
- non-executable storage;
- persistent object storage rather than ephemeral application disks where appropriate;
- access controls for private files;
- malware/content scanning when the deployment risk requires it.

Do not expose local development upload directories as a trusted public storage system.

## 6. WebSockets and realtime events

Realtime connections should:

- run over TLS in production;
- authenticate users before private events are accepted;
- validate event payloads server-side;
- authorize conversation membership before broadcasting private data;
- handle reconnects without duplicating messages or presence state.

## 7. Database

Production PostgreSQL should have:

- strong credentials;
- restricted network access;
- encrypted connections where supported;
- automated backups;
- tested restoration procedures;
- least-privilege database access.

Schema migrations must be reviewed before production execution.

## 8. API abuse protection

Before a broad public launch, add or verify:

- rate limiting for authentication and recovery endpoints;
- request body and upload limits;
- abuse monitoring;
- sensible timeout limits;
- brute-force protection;
- safe error messages that do not reveal secrets or internal implementation details.

## 9. Privacy

The application should have a clear Privacy Policy before public consumer distribution. Document what user information is collected, why it is processed, retention expectations, deletion behavior, analytics, notifications, uploads and any optional AI-provider data flow.

Do not claim end-to-end encryption unless the complete cryptographic design, implementation and key-management model actually provide it.

## 10. Optional AI

AI assistance is optional. When enabled, review the configured provider's data-processing terms and ensure users are not unknowingly sending private content to an external model provider.

Provider API keys must remain server-side and must never be shipped in the browser bundle.

## 11. Production checklist

Before release:

- [ ] Production secrets are unique and stored outside Git.
- [ ] HTTPS is enabled.
- [ ] Production CORS is restricted.
- [ ] Database backups exist and restoration has been tested.
- [ ] Authentication/recovery rate limits are active.
- [ ] Upload limits and validation are active.
- [ ] Private resources enforce authorization.
- [ ] Logs contain no credentials or private message bodies.
- [ ] Error responses do not expose secrets or stack traces.
- [ ] Dependency vulnerabilities have been reviewed.
- [ ] Privacy Policy and Terms are available where required.
- [ ] Account deletion behavior has been tested.
- [ ] WebRTC/STUN/TURN infrastructure is secured if calling is enabled publicly.

## 12. Responsible disclosure

If you discover a security issue, please avoid publicly posting credentials, exploit details or private user data. Report the issue privately to the project maintainer through an appropriate private contact channel and include a concise description, affected component, reproduction steps and impact.

Do not use a security report to access, modify or delete another user's data.

## 13. Scope note

This document is an engineering security baseline, not a guarantee that the application is vulnerability-free and not legal advice. Security requirements should be re-evaluated as the application, infrastructure and user base grow.
