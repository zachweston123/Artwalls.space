/**
 * Smoke tests for the modularised Worker structure.
 *
 * These verify that the barrel export, context factory, and
 * thin entrypoint all wire up correctly at the module level.
 * They do NOT hit a real Supabase/Stripe backend.
 */
import { describe, expect, test } from 'vitest';

describe('Worker modular structure', () => {
  test('barrel export includes all 10 route handlers', async () => {
    const routes = await import('../routes/index');
    const expected = [
      'handleAnalytics',
      'handleAuth',
      'handleArtists',
      'handleAdmin',
      'handleStripe',
      'handleVenues',
      'handleArtworks',
      'handlePublic',
      'handleVenueInvites',
      'handleMisc',
    ];
    for (const name of expected) {
      expect(routes).toHaveProperty(name);
      expect(typeof (routes as Record<string, unknown>)[name]).toBe('function');
    }
  });

  test('context module exports createWorkerContext factory', async () => {
    const mod = await import('../context');
    expect(typeof mod.createWorkerContext).toBe('function');
  });

  test('types module exports cleanly (no runtime crash)', async () => {
    // Importing the types module should not throw
    const types = await import('../types');
    expect(types).toBeDefined();
  });

  test('thin entrypoint exports default with fetch handler', async () => {
    const entry = await import('../index');
    expect(entry.default).toBeDefined();
    expect(typeof entry.default.fetch).toBe('function');
  });

  test('route handler count matches expected total', async () => {
    const routes = await import('../routes/index');
    const handlerKeys = Object.keys(routes).filter(k => k.startsWith('handle'));
    expect(handlerKeys).toHaveLength(10);
  });
});
