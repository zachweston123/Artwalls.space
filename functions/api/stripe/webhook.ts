import { verifyAndParseStripeEvent } from '../../../worker/stripeWebhook';

export const onRequestPost: PagesFunction = async ({ request, env, waitUntil }) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
  }

  try {
    const event = await verifyAndParseStripeEvent(request, env.STRIPE_WEBHOOK_SECRET);

    waitUntil(
      (async () => {
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
          }
        } catch (e) {
          console.error('Error forwarding webhook', e instanceof Error ? e.message : e);
        }
      })(),
    );

    return Response.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook error';
    return new Response(message, { status: 400 });
  }
};
