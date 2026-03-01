/**
 * Artwalls Cloudflare Worker — thin entrypoint & router.
 *
 * All business logic lives in `./routes/*` modules.
 * This file is responsible for:
 *   1. CORS preflight handling
 *   2. Building the shared WorkerContext
 *   3. Dispatching requests through ordered route handlers
 *   4. Top-level error catch with CORS headers
 *
 * Target: < 200 lines (P2 Maintainability).
 */

import { createWorkerContext } from './context';
import type { Env } from './types';
import type { RouteHandler } from './types';
import {
  handleAnalytics,
  handleAuth,
  handleArtists,
  handleAdmin,
  handleStripe,
  handleVenues,
  handleArtworks,
  handlePublic,
  handleVenueInvites,
  handleVenueRequests,
  handleMisc,
} from './routes';

/**
 * Ordered route handlers. The first handler to return a non-null Response wins.
 * Order matters for routes with overlapping path prefixes.
 */
const ROUTE_HANDLERS: RouteHandler[] = [
  handleAnalytics,   // /api/health, /api/track, /api/analytics
  handleAdmin,       // /api/admin/*, /api/debug/*, /api/integration/*
  handleAuth,        // /api/profile/*, /api/me, founding-artist eligibility
  handleStripe,      // /api/stripe/*
  handleArtists,     // /api/artists/dismiss-*, /api/stats/artist, /api/public/artists (listing)
  handleVenues,      // /api/stats/venue, /api/public/venues, /api/venues/*
  handleVenueRequests,// /api/venues/:id/requests, /api/me/requests
  handleArtworks,    // /api/artworks/*, /api/public/artworks
  handlePublic,      // /api/public/artists/:slug (detail), /api/public/sets/*
  handleVenueInvites,// /api/venue-invites/*, /api/referrals/*, /api/announcements, /api/support/*
  handleMisc,        // /, /sitemap.xml
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const method = request.method.toUpperCase();

    // ── Determine CORS origin ──
    const requestOrigin = request.headers.get('origin') || '';
    const pagesOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
    const allowedOrigins = new Set([
      pagesOrigin,
      'https://artwalls.space',
      'https://www.artwalls.space',
      'http://localhost:5173',
      'http://localhost:3000',
    ]);
    const allowOrigin = allowedOrigins.has(requestOrigin) ? requestOrigin : pagesOrigin;

    // ── Preflight CORS ──
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-http-method-override',
          'Access-Control-Max-Age': '86400',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          Vary: 'Origin',
        },
      });
    }

    // ── Build shared context ──
    const wc = createWorkerContext(request, env, ctx);

    try {
      // ── Dispatch through ordered route handlers ──
      for (const handler of ROUTE_HANDLERS) {
        const response = await handler(wc);
        if (response) return response;
      }

      // ── 404 fallback ──
      return wc.json({ error: 'Not found' }, { status: 404 });
    } catch (fatalErr: unknown) {
      // Top-level catch: return a proper CORS-headered JSON response
      // so the browser doesn't interpret the error as a CORS block.
      console.error('[FATAL] Unhandled Worker error:', fatalErr instanceof Error ? fatalErr.message : fatalErr);
      const errHeaders = new Headers({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey, x-http-method-override',
        Vary: 'Origin',
      });
      return new Response(
        JSON.stringify({ error: 'Internal server error', code: 'WORKER_UNHANDLED_EXCEPTION' }),
        { status: 500, headers: errHeaders },
      );
    }
  },
};
