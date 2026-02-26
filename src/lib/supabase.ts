import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY');
}

/**
 * Singleton Supabase client — created once, imported everywhere.
 *
 * Auth config:
 *   - persistSession: true  — store session in localStorage across refreshes
 *   - detectSessionFromUrl: true — process OAuth callback tokens in the URL
 *     (access_token fragment or PKCE code param) on initial page load
 *   - autoRefreshToken: true — silently refresh the JWT before it expires
 *   - flowType: 'pkce' — Proof Key for Code Exchange (Supabase v2 default,
 *     explicit here for clarity; required for OAuth redirect flows)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionFromUrl: true,
    autoRefreshToken: true,
    flowType: 'pkce',
  },
});
