# Vercel web preview

Global Messenger can host its Vite/React web client on Vercel while the existing Cloudflare Worker remains the API and realtime backend.

## Project settings

- Framework preset: Vite
- Root directory: `apps/web` (matches the existing Vercel project integration)
- Build command: `npm run build`
- Output directory: `dist`
- Vercel reads `apps/web/vercel.json`; the repository-root config is for root-based deployments
- Production API: `https://global-messenger-api.narsingbeesetti006.workers.dev` (configured in `apps/web/src/api.ts`)
- No service-role key or server secret belongs in Vercel client environment variables.

The Vercel frontend is a preview/deployment target only. It does not host the Cloudflare Worker, D1 database, Durable Objects, or WebSocket service. Do not move or delete those services as part of the frontend deployment.

## Testing checklist

1. Open the Vercel preview URL in a desktop browser and a mobile browser.
2. Register two separate test accounts using different email addresses.
3. Sign in as account A in one browser/profile and account B in another.
4. Search for the other account, open a direct conversation, and exchange messages.
5. Verify realtime delivery, typing, online status, reactions, edit/delete, group creation, and attachment upload.
6. Refresh both browsers and confirm chats/messages still load from the API.
7. Switch light/dark appearance in Settings; refresh and verify the selected theme persists.
8. Check DevTools Network and Console. API requests should target the Cloudflare Worker and return successful CORS responses. WebSocket should connect to the Worker `/ws` endpoint.
9. Repeat at mobile width (360–430 px) and desktop width (1280 px+).

Use test accounts only. This frontend deployment continues to use the existing D1-backed API until the Supabase runtime migration has been completed and verified separately.
