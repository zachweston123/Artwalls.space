/**
 * Vitest test setup
 * Runs before each test file to configure the test environment.
 */

// Mock import.meta.env for Vite environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    VITE_API_BASE_URL: 'http://localhost:8787',
    MODE: 'test',
    DEV: true,
    PROD: false,
  },
  writable: true,
});
