# Legacy Cloudflare backend — archived

Cloudflare Workers + D1 was the original Global Messenger backend. It is **not the current application backend**.

The current app runtime is:

- Vercel: React/Vite frontend hosting
- Supabase Auth: email/password identity, recovery and MFA
- Supabase Postgres: Messenger profiles, conversations, memberships, messages, reactions, bookmarks, pins, preferences, polls, scheduled messages, notifications, reports and support tickets
- Supabase Storage: private chat attachments and profile avatars
- Supabase Realtime: messages, typing, presence and call signaling
- Supabase Edge Functions: authenticated AI assistant gateway

The old Worker and D1 database are intentionally retained temporarily because they may contain existing accounts and chat history. Automatic Cloudflare deployment workflows have been changed to manual-only; normal pushes no longer deploy the old Worker or Cloudflare web client.

## Important

- Do not run `npm run d1:deploy` or manually deploy the legacy Worker as part of normal releases.
- Do not delete the old D1 database until its data has been exported, mapped to the `gm_*` tables, imported and verified.
- Existing PBKDF2 password hashes are not directly portable to Supabase Auth. Existing users need a verified account-claim/password-reset flow.
- Supabase is the production database for new Messenger activity.
