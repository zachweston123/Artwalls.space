/**
 * @deprecated Superseded by Cloudflare Worker at worker/index.ts.
 * Stripe billing is handled via raw REST API in the Worker.
 */
export const onRequestPost = async () =>
  new Response('Deprecated — billing handled by Worker', { status: 410 });
