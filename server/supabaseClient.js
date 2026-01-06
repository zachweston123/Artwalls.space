import { createClient } from '@supabase/supabase-js';

// Trim and validate environment variables
const rawUrl = process.env.SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Clean URL: trim whitespace, remove trailing slashes
const url = rawUrl.trim().replace(/\/+$/, '');
const serviceKey = rawKey.trim();

if (!url) {
  throw new Error('Missing SUPABASE_URL in environment');
}
if (!serviceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
}

// Validate URL format
if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
  console.warn('[Supabase] URL may be invalid:', url.substring(0, 30) + '...');
}

// Service role key is required server-side (never expose to browser).
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'artwalls-server',
    },
  },
});
