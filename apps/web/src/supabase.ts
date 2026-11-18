// Public browser configuration only. The publishable key is designed for client use;
// authorization is enforced by the gm_* tables' Row Level Security policies.
export const SUPABASE_URL = 'https://wozvcabjepdjkcuasqko.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_cvUQ6H24JbYRZEcLdmjw-w_f-YvDn2_';

const SDK_URL: string = 'https://esm.sh/@supabase/supabase-js@2.57.4';
let clientPromise: Promise<any> | undefined;
export function getSupabase(): Promise<any> {
  if (!clientPromise) {
    clientPromise = import(/* @vite-ignore */ SDK_URL)
      .then(({ createClient }: any) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        realtime: { params: { eventsPerSecond: 10 } }
      }));
  }
  return clientPromise;
}
