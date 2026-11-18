# Global Messenger — Supabase cutover

## Selected project

The selected Supabase project is **Online-cloth-store** (`wozvcabjepdjkcuasqko`, region `eu-west-1`). It is shared with other apps. Messenger objects are isolated under the `gm_*` table prefix and `gm-chat-media` / `gm-avatars` buckets. Do not rename, truncate or alter existing store / WorldConnect tables, triggers or policies.

The database schema is applied. The canonical SQL is `supabase/migrations/20261118134618_global_messenger_isolated_schema.sql`. It includes Messenger-only RLS, profile visibility, block enforcement, session devices, notifications, scheduled-message dispatch and call-signal retention.

## Current Supabase runtime

- **Auth:** email/password signup, login, logout, password reset and optional TOTP MFA use Supabase Auth.
- **Database:** profiles, conversations, memberships, messages, reactions, bookmarks, pins, devices, session registry, preferences, attachments, scheduled messages, polls, votes, blocks, reports, support tickets, global entities and notifications use isolated `gm_*` tables.
- **Storage:** private conversation files use `gm-chat-media`; profile avatars use `gm-avatars`.
- **Realtime:** chat messages, typing, presence and dedicated WebRTC call signaling use Supabase Realtime. Call offers/answers/ICE are stored in a short-lived table and pruned hourly.
- **Calls:** one-to-one WebRTC calls are peer-to-peer; Supabase carries signaling, not audio/video media. Group calling and managed TURN relay are not configured.
- **Notifications:** database-triggered in-app notifications are stored in `gm_notifications`. Native push delivery is not configured yet.
- **Scheduled messages:** a Supabase Cron job runs every minute and dispatches due scheduled messages.
- **AI:** authenticated `gm-ai-assist` Edge Function is deployed. It supports conversation summaries, freeform assistance, document analysis and smart-notification prioritization through Groq. Add `GROQ_API_KEY` in Supabase Dashboard → Edge Functions → Secrets before invoking AI.
- **Security:** column-level profile access, RLS, private storage policies, block checks, profile/online/last-seen/read-receipt/typing privacy controls and session tracking are configured.

The browser uses only the Supabase URL and publishable key. Never put a Supabase secret/service-role key in Vite, Android assets, GitHub Actions artifacts or local storage.

## Required Supabase Auth settings

In Supabase Dashboard → Authentication → URL Configuration:

1. Set Site URL to the deployed Vercel URL.
2. Add the Vercel production URL and preview domains to Redirect URLs.
3. Add `http://localhost:5173/**` for local development.
4. Enable email/password authentication and choose whether email confirmation is required.
5. Configure SMTP before relying on high-volume production signup/password-recovery emails.

## Remaining cutover work

- Existing Cloudflare D1 records and custom PBKDF2 password hashes have not been imported. Existing accounts need a verified claim/reset flow; old passwords cannot be copied directly into Supabase Auth.
- Cloudflare Worker/D1 resources remain temporarily for data export and reconciliation. Automatic deploy workflows are now manual-only and normal app requests no longer target the Worker.
- The app build and real two-account browser test still need to pass before production cutover.
- Vercel deployment was rate-limited during this work, so no new production deployment is claimed.
- TURN relay is not configured; peer-to-peer calls may fail on restrictive NAT/firewall networks. Group calling requires a separate SFU and is not provided by Supabase.

## Test plan

1. Set Supabase Auth Site URL and Redirect URLs.
2. Add `GROQ_API_KEY` as an Edge Function secret if AI features are needed.
3. Deploy a Vercel preview from the migration branch.
4. Register two test accounts, confirm email if enabled, and sign in from separate browser profiles.
5. Create a direct chat and group; exchange messages both ways.
6. Test reactions, edit/delete, bookmarks, pins, typing, presence, privacy controls and notifications.
7. Upload an image and PDF; verify non-members cannot read private objects.
8. Schedule a message for 2–3 minutes in the future and confirm it is sent by Cron.
9. Test voice/video on a direct chat from two devices.
10. Test password reset, 2FA and sign-out-other-sessions.
11. Run the Supabase security/performance advisors and review only Messenger-prefixed findings separately from other apps in the shared project.

No live user signup or two-account message test has been run yet.
