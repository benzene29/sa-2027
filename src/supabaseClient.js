import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    'Supabase env vars are missing. Copy .env.example to .env.local (or set them in your Vercel project) and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  );
}

// createClient() throws on a malformed URL, which would otherwise crash the whole
// page white-screen before the console.error above is ever seen. Fall back to a
// syntactically valid placeholder so the app still loads (and fails loudly on the
// first real request) when the env vars haven't been configured yet.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key');

export const TRIP_ID = 'sa-2027';
