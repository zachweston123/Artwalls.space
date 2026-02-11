/**
 * @deprecated This Pages Function webhook is superseded by the Cloudflare Worker
 * at worker/index.ts which handles /api/stripe/webhook inline.
 * Safe to delete when file deletion is available.
 */
export const onRequestPost = async () =>
  new Response('Deprecated — webhook handled by Worker', { status: 410 });
