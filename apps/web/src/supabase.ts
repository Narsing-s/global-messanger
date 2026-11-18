// Browser-safe Supabase configuration. Only publishable/anon keys belong here.
const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
export const SUPABASE_URL = (configuredUrl || 'https://wozvcabjepdjkcuasqko.supabase.co').replace(/\\/$/, '');
export const SUPABASE_PUBLISHABLE_KEY = configuredKey || 'sb_publishable_cvUQ6H24JbYRZEcLdmjw-w_f-YvDn2_';

import { createClient } from '@supabase/supabase-js';
let client: ReturnType<typeof createClient> | undefined;
export function getSupabase(): Promise<any> {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new Error('Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }
  return Promise.resolve(client);
}
