/**
 * @deprecated Superseded by Cloudflare Worker at worker/index.ts.
 * Stripe subscriptions are handled via raw REST API in the Worker.
 */
export const onRequestPost = async () =>
  new Response('Deprecated — subscriptions handled by Worker', { status: 410 });
