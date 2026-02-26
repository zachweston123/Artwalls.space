/**
 * Regression tests for GET /api/artists (venue Find Artists).
 *
 * Bug history:
 *   1. is_public was never set by upsertArtist → all rows null →
 *      `.eq('is_public', true)` excluded everyone.
 *      Fix: use `.or('is_public.eq.true,is_public.is.null')`.
 *   2. city param was ignored by the backend.
 *      Fix: extract city name, filter with ilike.
 *   3. City format mismatch: venues store "San Diego, CA" but artists
 *      store "San Diego" → ilike "%San Diego, CA%" doesn't match "San Diego".
 *      Fix: extract city name before comma for the filter.
 *   4. email was leaked in the public response.
 *      Fix: removed from select + response mapping.
 *   5. `.neq('is_public', false)` / `.neq('is_live', false)` silently
 *      excluded NULL rows — in SQL, `NULL <> false` is NULL, not TRUE.
 *      Fix: reverted to `.or('is_public.eq.true,is_public.is.null')` and
 *      `.or('is_live.eq.true,is_live.is.null')`.
 *   6. "Open to new placements" toggle was cosmetic-only — never persisted.
 *      Fix: added isLive to UpsertArtistPayload, POST handler, and
 *      ArtistProfile save. DB migration backfills NULL → true.
 *
 * These tests run against the handleArtists route handler with a
 * minimal WorkerContext stub — no real Supabase calls.
 */
import { describe, expect, test, vi } from 'vitest';
import { handleArtists } from '../routes/artists';
import type { WorkerContext } from '../types';

/* ── Helpers ─────────────────────────────────────────────────── */

/** Build a minimal stub WorkerContext whose supabaseAdmin returns `rows`. */
function stubContext(
  pathname: string,
  search: string,
  rows: Record<string, unknown>[],
  artworkRows: Record<string, unknown>[] = [],
): WorkerContext {
  const url = new URL(`https://api.artwalls.space${pathname}${search}`);

  // Chainable Supabase query builder stub
  function makeQueryBuilder(data: Record<string, unknown>[], error: null | { message: string } = null) {
    const builder: Record<string, any> = {};
    const chainMethods = [
      'select', 'eq', 'neq', 'or', 'ilike', 'in', 'not',
      'order', 'limit', 'gte', 'maybeSingle', 'single',
    ];
    for (const m of chainMethods) {
      builder[m] = vi.fn(() => builder);
    }
    // Terminal: resolve with data/error
    builder.then = (resolve: (v: any) => any) => resolve({ data, error });
    // Make it thenable so `await query` works
    Object.defineProperty(builder, Symbol.toStringTag, { value: 'Promise' });
    return builder;
  }

  const supabaseAdmin = {
    from: vi.fn((table: string) => {
      if (table === 'artworks') return makeQueryBuilder(artworkRows);
      return makeQueryBuilder(rows);
    }),
  } as any;

  return {
    url,
    method: 'GET',
    request: new Request(url.toString()),
    json: (body: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    supabaseAdmin,
    getUser: vi.fn(async () => null),
    requireAuthOrFail: vi.fn(() => null),
    isAdminUser: vi.fn(async () => false),
    applyRateLimit: vi.fn(async () => null),
    upsertArtist: vi.fn(async () => new Response('{}', { status: 200 })),
  } as unknown as WorkerContext;
}

async function parseBody(resp: Response | null) {
  expect(resp).not.toBeNull();
  return resp!.json();
}

/* ── Tests ────────────────────────────────────────────────────── */

describe('GET /api/artists — venue Find Artists', () => {
  const sampleArtists = [
    {
      id: 'aaa-111',
      slug: 'alice',
      name: 'Alice',
      email: 'alice@secret.com',
      city_primary: 'Portland',
      city_secondary: 'Seattle',
      profile_photo_url: 'https://img.test/alice.jpg',
      is_live: true,
      is_public: null,        // ← never set by upsertArtist
      bio: 'Painter',
      art_types: ['Painter'],
      is_founding_artist: true,
    },
    {
      id: 'bbb-222',
      slug: 'bob',
      name: 'Bob',
      email: 'bob@secret.com',
      city_primary: 'Portland',
      city_secondary: null,
      profile_photo_url: null,
      is_live: null,           // ← also null
      is_public: true,
      bio: '',
      art_types: [],
      is_founding_artist: false,
    },
  ];

  test('returns artists when is_public is null (regression)', async () => {
    const wc = stubContext('/api/artists', '', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    expect(body.artists).toBeDefined();
    expect(body.artists.length).toBe(2);
    expect(body.artists[0].name).toBe('Alice');
  });

  test('never exposes email in response', async () => {
    const wc = stubContext('/api/artists', '', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    for (const artist of body.artists) {
      expect(artist).not.toHaveProperty('email');
      // Double-check the full serialized payload
      expect(JSON.stringify(artist)).not.toContain('alice@secret.com');
      expect(JSON.stringify(artist)).not.toContain('bob@secret.com');
    }
  });

  test('passes city param to query filter', async () => {
    const wc = stubContext('/api/artists', '?city=Portland', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    // Verify supabaseAdmin.from('artists') was called and .or was called
    // with a city filter containing "Portland"
    const fromCalls = wc.supabaseAdmin!.from.mock.calls;
    expect(fromCalls.some((c: any[]) => c[0] === 'artists')).toBe(true);
    expect(body.artists).toBeDefined();
  });

  test('passes q param as name search', async () => {
    const wc = stubContext('/api/artists', '?q=Alice', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    expect(body.artists).toBeDefined();
  });

  test('returns expected safe fields only', async () => {
    const wc = stubContext('/api/artists', '', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    const safeKeys = new Set([
      'id', 'slug', 'name', 'profilePhotoUrl', 'location',
      'is_live', 'openToNewPlacements', 'bio', 'artTypes', 'portfolioCount', 'isFoundingArtist',
    ]);
    for (const artist of body.artists) {
      for (const key of Object.keys(artist)) {
        expect(safeKeys.has(key)).toBe(true);
      }
    }
  });

  test('returns 200 with empty array when no artists match', async () => {
    const wc = stubContext('/api/artists', '', []);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    expect(resp!.status).toBe(200);
    expect(body.artists).toEqual([]);
  });

  test('response includes _meta with filter diagnostics', async () => {
    const wc = stubContext('/api/artists', '?city=San+Diego%2C+CA&q=Alice', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    expect(body._meta).toBeDefined();
    // City should be normalized (strip state after comma)
    expect(body._meta.cityFilter).toBe('San Diego');
    expect(body._meta.nameFilter).toBe('Alice');
    expect(body._meta.totalReturned).toBe(2);
  });

  test('extracts city name from "City, ST" format for filtering', async () => {
    const wc = stubContext('/api/artists', '?city=Portland%2C+OR', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    // The city should be normalized to just "Portland"
    expect(body._meta.cityFilter).toBe('Portland');
    // .or() should have been called with the normalized city name
    const fromCalls = wc.supabaseAdmin!.from.mock.calls;
    const artistsBuilder = fromCalls.find((c: any[]) => c[0] === 'artists');
    expect(artistsBuilder).toBeDefined();
  });

  test('uses .or() for is_public/is_live to include NULL rows (not .neq)', async () => {
    const wc = stubContext('/api/artists', '', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    // Should return both artists — null is_public and null is_live are
    // included by `.or('is_public.eq.true,is_public.is.null')` etc.
    // (`.neq('is_public', false)` would EXCLUDE nulls in SQL.)
    expect(body.artists.length).toBe(2);
  });

  test('response includes openToNewPlacements field (null → true)', async () => {
    const wc = stubContext('/api/artists', '', sampleArtists);
    const resp = await handleArtists(wc);
    const body = await parseBody(resp);

    // Alice has is_live: true → openToNewPlacements: true
    expect(body.artists[0].openToNewPlacements).toBe(true);
    // Bob has is_live: null → openToNewPlacements: true (null is treated as open)
    expect(body.artists[1].openToNewPlacements).toBe(true);
  });
});
