# Vercel frontend + Supabase backend

Global Messenger's current application runtime uses **Vercel for the React/Vite frontend** and **Supabase for authentication, Postgres, private storage, Realtime and Edge Functions**. The Cloudflare Worker is no longer the app's API endpoint. Its D1 database is retained only until legacy data has been exported and reconciled.

## Vercel project settings

- Framework: Vite
- Root directory: `apps/web`
- Build command: `npm run build`
- Output directory: `dist`
- Do not set `VITE_API_URL` to a Cloudflare Worker.
- The browser Supabase URL and publishable key are configured in the app. Never add a Supabase secret/service-role key to Vercel client variables.

## Supabase Auth URL settings

In Supabase Dashboard → Authentication → URL Configuration:

1. Set Site URL to the Vercel production URL.
2. Add the Vercel production URL and preview domain(s) to Redirect URLs.
3. Add `http://localhost:5173/**` for local development.
4. Enable email/password authentication and confirm-email behavior as required.

## AI Edge Function

The authenticated `gm-ai-assist` Edge Function is deployed. To enable AI summaries, document analysis and smart-notification prioritization, add `GROQ_API_KEY` under Supabase Dashboard → Edge Functions → Secrets. Optional: add `GROQ_MODEL`; the default is `llama-3.3-70b-versatile`.

The Groq key must stay in Supabase Edge Function secrets. Do not place it in Vite, Android assets, GitHub files, or browser storage.

## Testing checklist

1. Open a Vercel preview on desktop and mobile.
2. Register two different test accounts; confirm email if enabled.
3. Sign in in two separate browser profiles.
4. Search for the other account, create a direct chat and exchange messages.
5. Test group creation, reactions, edit/delete, bookmarks, pins, mute, read receipts and typing.
6. Upload an image and a document; verify private chat attachment access and public avatar rendering.
7. Test voice/video in a direct chat. Peer-to-peer media requires suitable network conditions; group calling and TURN relay are not configured.
8. Test scheduled messages and confirm the Supabase Cron job dispatches them.
9. Test password recovery, 2FA setup and logout-other-sessions.
10. Test the AI actions after adding the Edge Function secret.

Use test accounts only. Existing Cloudflare D1 records and custom PBKDF2 password hashes have not been imported. Do not delete the old D1 database until the data migration is reconciled.
