# Global Messenger — Supabase cutover

## Supabase project

The selected project is **Online-cloth-store** (wozvcabjepdjkcuasqko, region eu-west-1). It is shared with other apps. Messenger objects are isolated under the gm_* table prefix and gm-chat-media / gm-avatars buckets. Do not rename, truncate, or alter existing store / WorldConnect tables, triggers, or policies.

The applied migration is 20261118134618_global_messenger_isolated_schema. The matching SQL file is supabase/migrations/20261118134618_global_messenger_isolated_schema.sql.

## Migrated to Supabase

- **Auth:** email/password signup, login, logout and password reset use Supabase Auth. New signups tag user metadata with app=global-messenger; the profile trigger ignores all other apps.
- **Database:** profiles, conversations, memberships, messages, reactions, bookmarks, pins, devices, preferences, attachments, scheduled messages, polls, blocks and reports use isolated gm_* tables with RLS.
- **Storage:** private conversation files use gm-chat-media; profile avatars use gm-avatars.
- **Realtime:** message inserts/updates/deletes and typing/presence use Supabase Realtime.
- **E2EE key exchange:** device public keys are stored in gm_user_devices and readable only by authenticated users who share a conversation. Private keys remain on the user's device.

The browser uses only the Supabase URL and publishable key. Never place a Supabase secret/service-role key in Vite, a mobile bundle, GitHub Actions artifacts, or local storage.

## Required Supabase Auth settings

In Supabase Dashboard → Authentication → URL Configuration:

1. Set Site URL to the deployed Vercel URL.
2. Add the Vercel production URL and local development URL to Redirect URLs.
3. Keep email/password enabled and email confirmation enabled.
4. The default email sender is rate-limited and best-effort; configure SMTP before relying on high-volume production signups or password resets.

The client currently loads @supabase/supabase-js from the browser ESM CDN at esm.sh to avoid introducing a package-lock mismatch. If you later add it as a local dependency, regenerate and commit the root lockfile in a normal npm environment.

## Current cutover limits

This is a staged migration, not yet a complete replacement of every legacy endpoint.

- The primary React app's account, chat, group, message, upload, presence, typing, E2EE-key, privacy settings, device-session and password-reset flows use Supabase.
- Legacy add-on modules still contain Worker endpoints for support tickets, AI assist, global entities and some call/SFU control APIs. Those routes need their own Supabase tables / Edge Functions before those add-on screens can be considered migrated.
- Supabase is not a media SFU. Live audio/video still needs a separate WebRTC SFU/TURN service; the media transport endpoints cannot be replaced by a Postgres table or Realtime channel.
- Existing Cloudflare D1 records and PBKDF2 password hashes have not been imported. Existing accounts must be claimed or recreated through a verified reset flow before their old chat history can be retained.

Do not delete the Cloudflare Worker/D1 resources until those remaining modules are migrated and a D1 data export/import has been reconciled.

## Test plan

1. Deploy the feature branch to a preview URL.
2. Register a new test account using a unique email and confirm the email if prompted.
3. Log in, search for another test account, create a direct chat and send messages in both directions.
4. Create a group and verify only members can read it.
5. Test reactions, edits, deletes, typing and presence with two separate browser sessions.
6. Upload an image and a PDF; verify chat files are private and avatar URLs render.
7. Test password reset from the deployed domain.
8. Confirm non-members cannot query another conversation's messages or storage objects.

No live user signup or message test has been run yet. The Supabase schema and policies were applied and checked, but the branch still needs a Vercel/GitHub build and two-account browser test before production cutover.
