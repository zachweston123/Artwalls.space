import { verifyAndParseStripeEvent } from './stripeWebhook';
import { createClient } from '@supabase/supabase-js';

type Env = {
  STRIPE_WEBHOOK_SECRET: string;
  API_BASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  PAGES_ORIGIN?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const allowOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';

    // Preflight CORS
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      });
    }

    function json(obj: unknown, init?: ResponseInit): Response {
      const headers = new Headers(init?.headers);
      headers.set('Content-Type', 'application/json');
      headers.set('Access-Control-Allow-Origin', allowOrigin);
      headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'authorization, content-type');
      headers.set('Vary', 'Origin');
      const body = JSON.stringify(obj);
      return new Response(body, { status: init?.status ?? 200, headers });
    }

    // Initialize Supabase Admin client (optional endpoints)
    const supabaseAdmin = env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
      : null;

    async function getSupabaseUserFromRequest(req: Request): Promise<any | null> {
      try {
        const auth = req.headers.get('authorization') || '';
        const [scheme, token] = auth.split(' ');
        if (!scheme || scheme.toLowerCase() !== 'bearer' || !token || !supabaseAdmin) return null;
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error) return null;
        return data.user || null;
      } catch {
        return null;
      }
    }

    async function upsertArtist(artist: { id: string; email?: string | null; name?: string | null; role?: string; stripeAccountId?: string | null; stripeCustomerId?: string | null; subscriptionTier?: string | null; subscriptionStatus?: string | null; stripeSubscriptionId?: string | null; platformFeeBps?: number | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const payload = {
        id: artist.id,
        email: artist.email ?? null,
        name: artist.name ?? null,
        role: artist.role ?? 'artist',
        stripe_account_id: artist.stripeAccountId ?? null,
        stripe_customer_id: artist.stripeCustomerId ?? null,
        subscription_tier: artist.subscriptionTier ?? 'free',
        subscription_status: artist.subscriptionStatus ?? 'inactive',
        stripe_subscription_id: artist.stripeSubscriptionId ?? null,
        platform_fee_bps: artist.platformFeeBps ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('artists').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) return json({ error: error.message }, { status: 500 });
      return json(data);
    }

    async function upsertVenue(venue: { id: string; email?: string | null; name?: string | null; type?: string | null; stripeAccountId?: string | null; defaultVenueFeeBps?: number | null; labels?: any; suspended?: boolean | null; }): Promise<Response> {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const payload = {
        id: venue.id,
        email: venue.email ?? null,
        name: venue.name ?? null,
        type: venue.type ?? null,
        stripe_account_id: venue.stripeAccountId ?? null,
        default_venue_fee_bps: typeof venue.defaultVenueFeeBps === 'number' ? venue.defaultVenueFeeBps : null,
        labels: venue.labels ?? undefined,
        suspended: venue.suspended ?? null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabaseAdmin.from('venues').upsert(payload, { onConflict: 'id' }).select('*').single();
      if (error) return json({ error: error.message }, { status: 500 });
      return json(data);
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true });
    }

    // Env check: verify required configuration without leaking secrets
    if (url.pathname === '/api/env/check' && method === 'GET') {
      return json({
        ok: true,
        vars: {
          STRIPE_WEBHOOK_SECRET: Boolean(env.STRIPE_WEBHOOK_SECRET),
          STRIPE_SECRET_KEY: Boolean(env.STRIPE_SECRET_KEY),
          SUPABASE_URL: Boolean(env.SUPABASE_URL),
          SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
          API_BASE_URL: env.API_BASE_URL || null,
          PAGES_ORIGIN: env.PAGES_ORIGIN || 'https://artwalls.space',
        },
      });
    }

    // Demo check: verify seeded data is accessible in Supabase
    if (url.pathname === '/api/demo/check' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artists, error: artistsErr } = await supabaseAdmin
        .from('artists')
        .select('id,name,email')
        .limit(3);
      const { data: venues, error: venuesErr } = await supabaseAdmin
        .from('venues')
        .select('id,name,type')
        .limit(4);
      const { data: artworks, error: artworksErr } = await supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents')
        .limit(4);

      if (artistsErr || venuesErr || artworksErr) {
        return json({
          ok: false,
          errors: {
            artists: artistsErr?.message,
            venues: venuesErr?.message,
            artworks: artworksErr?.message,
          },
        }, { status: 500 });
      }

      return json({
        ok: true,
        counts: {
          artists: artists?.length ?? 0,
          venues: venues?.length ?? 0,
          artworks: artworks?.length ?? 0,
        },
        sample: {
          artists: artists ?? [],
          venues: venues ?? [],
          artworks: artworks ?? [],
        },
      });
    }

    // Profile: provision record in artists or venues based on Supabase user role
    if (url.pathname === '/api/profile/provision' && method === 'POST') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

      const role = (user.user_metadata?.role as string) || 'artist';
      const name = (user.user_metadata?.name as string | undefined) || null;

      if (role === 'venue') {
        const { data: venue } = await supabaseAdmin
          .from('venues')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        const updated = await upsertVenue({
          id: user.id,
          email: user.email ?? null,
          name,
          type: user.user_metadata?.type ?? null,
          defaultVenueFeeBps: 1000,
        });
        return updated;
      }

      const updated = await upsertArtist({
        id: user.id,
        email: user.email ?? null,
        name,
        role: 'artist',
      });
      return updated;
    }

    // Profile: get current user profile (artist or venue)
    if (url.pathname === '/api/profile/me' && method === 'GET') {
      const user = await getSupabaseUserFromRequest(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const role = (user.user_metadata?.role as string) || 'artist';
      if (role === 'venue') {
        const { data, error } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
        if (error) return json({ error: error.message }, { status: 500 });
        return json({ role: 'venue', profile: data });
      }
      const { data, error } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ role: 'artist', profile: data });
    }

    // Public listings: venues
    if (url.pathname === '/api/venues' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data, error } = await supabaseAdmin
        .from('venues')
        .select('id,name,type,labels,default_venue_fee_bps')
        .order('name', { ascending: true })
        .limit(50);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ venues: data });
    }

    // Public listings: artworks
    if (url.pathname === '/api/artworks' && method === 'GET') {
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data, error } = await supabaseAdmin
        .from('artworks')
        .select('id,title,status,price_cents,currency,image_url,artist_name,venue_name')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, { status: 500 });
      return json({ artworks: data });
    }

    // -----------------------------
    // Minimal API endpoints (Stripe Connect) to remove dependency on external API
    // -----------------------------
    const stripeKey = env.STRIPE_SECRET_KEY || '';

    async function stripeFetch(path: string, init: RequestInit = {}): Promise<Response> {
      if (!stripeKey) return json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${stripeKey}`);
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/x-www-form-urlencoded');
      return fetch(`https://api.stripe.com${path}`, { ...init, headers });
    }

    function toForm(obj: Record<string, any>): string {
      return Object.entries(obj)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
    }

    // Helper: require Supabase auth in production-like usage
    async function requireArtist(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user || user.user_metadata?.role !== 'artist') return null;
      return user;
    }

    async function requireVenue(req: Request): Promise<any | null> {
      const user = await getSupabaseUserFromRequest(req);
      if (!user || user.user_metadata?.role !== 'venue') return null;
      return user;
    }

    // Connect: Artist create account
    if (url.pathname === '/api/stripe/connect/artist/create-account' && method === 'POST') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      // Ensure DB record exists
      await upsertArtist({ id: user.id, email: user.email ?? null, name: user.user_metadata?.name ?? null, role: 'artist' });

      // Create Stripe account
      const body = toForm({
        type: 'express',
        email: user.email ?? undefined,
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
        'metadata[artistId]': user.id,
      });
      const resp = await stripeFetch('/v1/accounts', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      // Save accountId
      await upsertArtist({ id: user.id, stripeAccountId: json.id });
      return json({ accountId: json.id, alreadyExists: false });
    }

    // Connect: Artist account link
    if (url.pathname === '/api/stripe/connect/artist/account-link' && method === 'POST') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });

      // Fetch artist record
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artist } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
      if (!artist?.stripe_account_id) return json({ error: 'Artist has no stripeAccountId yet. Call /create-account first.' }, { status: 400 });

      const appUrl = 'https://artwalls.space';
      const refresh_url = `${appUrl}/#/artist-dashboard`;
      const return_url = `${appUrl}/#/artist-dashboard`;
      const body = toForm({ account: artist.stripe_account_id, refresh_url, return_url, type: 'account_onboarding' });
      const resp = await stripeFetch('/v1/account_links', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Artist login link
    if (url.pathname === '/api/stripe/connect/artist/login-link' && method === 'POST') {
      const user = await requireArtist(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (artist required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artist } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
      if (!artist?.stripe_account_id) return json({ error: 'Artist has no stripeAccountId yet.' }, { status: 400 });
      const body = toForm({ account: artist.stripe_account_id });
      const resp = await stripeFetch('/v1/accounts/create_login_link', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Artist status
    if (url.pathname === '/api/stripe/connect/artist/status' && method === 'GET') {
      const artistId = url.searchParams.get('artistId');
      if (!artistId) return json({ error: 'Missing artistId' }, { status: 400 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: artist } = await supabaseAdmin.from('artists').select('*').eq('id', artistId).maybeSingle();
      if (!artist?.stripe_account_id) return json({ hasAccount: false });
      const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}`);
      const acc = await resp.json();
      if (!resp.ok) return json(acc, { status: resp.status });
      return json({
        hasAccount: true,
        accountId: artist.stripe_account_id,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        details_submitted: acc.details_submitted,
        requirements: acc.requirements,
      });
    }

    // Connect: Venue create account
    if (url.pathname === '/api/stripe/connect/venue/create-account' && method === 'POST') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      await upsertVenue({ id: user.id, email: user.email ?? null, name: user.user_metadata?.name ?? null, type: user.user_metadata?.type ?? null, defaultVenueFeeBps: 1000 });
      const body = toForm({
        type: 'express',
        email: user.email ?? undefined,
        'capabilities[card_payments][requested]': 'true',
        'capabilities[transfers][requested]': 'true',
        'metadata[venueId]': user.id,
      });
      const resp = await stripeFetch('/v1/accounts', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      await upsertVenue({ id: user.id, stripeAccountId: json.id });
      return json({ accountId: json.id, alreadyExists: false });
    }

    // Connect: Venue account link
    if (url.pathname === '/api/stripe/connect/venue/account-link' && method === 'POST') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: venue } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (!venue?.stripe_account_id) return json({ error: 'Venue has no stripeAccountId yet. Call /create-account first.' }, { status: 400 });
      const appUrl = 'https://artwalls.space';
      const refresh_url = `${appUrl}/#/venue-dashboard`;
      const return_url = `${appUrl}/#/venue-dashboard`;
      const body = toForm({ account: venue.stripe_account_id, refresh_url, return_url, type: 'account_onboarding' });
      const resp = await stripeFetch('/v1/account_links', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Venue login link
    if (url.pathname === '/api/stripe/connect/venue/login-link' && method === 'POST') {
      const user = await requireVenue(request);
      if (!user) return json({ error: 'Missing or invalid Authorization bearer token (venue required)' }, { status: 401 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: venue } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (!venue?.stripe_account_id) return json({ error: 'Venue has no stripeAccountId yet.' }, { status: 400 });
      const body = toForm({ account: venue.stripe_account_id });
      const resp = await stripeFetch('/v1/accounts/create_login_link', { method: 'POST', body });
      const json = await resp.json();
      if (!resp.ok) return json(json, { status: resp.status });
      return json({ url: json.url });
    }

    // Connect: Venue status
    if (url.pathname === '/api/stripe/connect/venue/status' && method === 'GET') {
      const venueId = url.searchParams.get('venueId');
      if (!venueId) return json({ error: 'Missing venueId' }, { status: 400 });
      if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
      const { data: venue } = await supabaseAdmin.from('venues').select('*').eq('id', venueId).maybeSingle();
      if (!venue?.stripe_account_id) return json({ hasAccount: false });
      const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}`);
      const acc = await resp.json();
      if (!resp.ok) return json(acc, { status: resp.status });
      return json({
        hasAccount: true,
        accountId: venue.stripe_account_id,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
        details_submitted: acc.details_submitted,
        requirements: acc.requirements,
      });
    }

    if (url.pathname === '/api/stripe/webhook') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }

      if (!env.STRIPE_WEBHOOK_SECRET) {
        return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
      }

      try {
        const event = await verifyAndParseStripeEvent(request, env.STRIPE_WEBHOOK_SECRET);

        // Do work async so Stripe gets a fast 200.
        ctx.waitUntil(
          (async () => {
            // Forward the verified event to the backend for processing
            try {
              const base = env.API_BASE_URL || 'https://api.artwalls.space';
              const resp = await fetch(`${base}/api/stripe/webhook/forwarded`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event }),
              });
              if (!resp.ok) {
                const text = await resp.text();
                console.error('Forwarded webhook failed', resp.status, text);
              } else {
                console.log('Forwarded webhook processed', { id: event.id, type: event.type });
              }
            } catch (e) {
              console.error('Error forwarding webhook', e instanceof Error ? e.message : e);
            }
          })(),
        );

        return json({ received: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Webhook error';
        return new Response(message, { status: 400 });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
