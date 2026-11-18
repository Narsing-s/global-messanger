# Supabase migration plan

## Current state

The production branch currently runs the Cloudflare Worker against Cloudflare D1 and uses a custom password/JWT flow. The web client points at the Worker URL. This is **not yet a Supabase-backed runtime**. Do not remove the D1 binding or change production API routing until the application adapter has been migrated and tested.

## Target

- Supabase PostgreSQL: durable relational source of truth.
- Supabase Auth: registration, login, password recovery and access tokens.
- Supabase Storage: private chat-media bucket.
- Supabase Realtime: selected message/presence events.
- Cloudflare Worker + Durable Objects: API boundary, validation, rate limits and transient room fan-out.
- Existing React/Capacitor web and Android clients: retained.

## Apply the database foundation

1. Create a Supabase project in the region closest to the majority of users.
2. Install the Supabase CLI and authenticate.
3. From the repository root run `supabase link --project-ref YOUR_PROJECT_REF`.
4. Apply migrations with `supabase db push`.
5. In Supabase Authentication, enable email/password and configure the site URL plus allowed redirect URLs for the web app and Capacitor app.
6. In Database > Replication, enable Realtime for `messages`, `conversation_members`, `message_reactions`, `polls` and `poll_votes` only when the client subscribes to them.
7. Confirm the private `chat-media` bucket exists. The migration creates it with a 50 MiB limit and restrictive MIME allowlist.

## Environment variables

Worker secrets (set with `wrangler secret put`, never commit values):

- `SUPABASE_URL`: project URL.
- `SUPABASE_ANON_KEY`: publishable/anon key used only where an end-user token is required.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only key. Never expose to Vite, Android, logs, or GitHub artifacts.
- `JWT_SECRET`: keep a separate high-entropy secret until custom JWT verification is fully removed.

Web build variables (only after the client auth adapter is migrated):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The service-role key must never use a `VITE_` prefix.

## Existing D1 data and accounts

The schema deliberately keeps UUID primary keys for profiles, conversations and messages so D1 records can retain their identities. Export and import data in this order:

1. profiles (map legacy user IDs to profile IDs; do not import password hashes);
2. conversations;
3. conversation_members;
4. messages;
5. message_reactions, bookmarks and pinned_messages;
6. device tokens and other optional data only after reviewing consent and token validity.

The old PBKDF2 password hashes are not Supabase Auth credentials. Do not copy them into auth tables or claim password migration is complete. Existing users must complete a secure password-reset / account-claim flow. The auth trigger links a newly registered Supabase identity to an unclaimed legacy profile with the same username, preserving its profile ID and chat history. Before enabling public signups, verify username-claim collision handling and add rate limiting / email verification.

## Required application cutover (not performed by this schema migration)

The current Worker uses D1 prepared statements throughout `apps/cloudflare/src/index.ts`. The current browser client stores a custom `gm_token` and calls that Worker. A safe cutover must replace those together:

- Supabase Auth sign-up/sign-in/sign-out and refresh-token lifecycle.
- Worker token validation through Supabase Auth (never trust decoded JWT claims alone).
- A typed Postgres data-access layer replacing every D1 query and batch.
- Authorization/RLS tests for every route and destructive operation.
- Private Storage upload/download flows with signed URLs and resumable upload handling.
- Realtime subscription auth and conversation-scoped event delivery.
- Android Capacitor redirect/deep-link and push-token registration.
- Backfill/import verification, rollback plan and staged cutover.

Do not point production traffic at Supabase until all existing API routes pass integration tests against the new adapter. Keep D1 read-only backup until reconciliation is complete.

## Security checklist

- Keep service-role credentials in Cloudflare Worker secrets only.
- Enable email confirmation and configure password reset redirects.
- Add rate limits for auth, search, message send, uploads and reports.
- Use private media storage and short-lived signed URLs.
- Verify RLS with two test accounts (member and non-member) for every table and Storage path.
- Never log access tokens, password-reset links, private message bodies or storage secrets.
- Turn on automated Supabase backups and periodically test restoration.
