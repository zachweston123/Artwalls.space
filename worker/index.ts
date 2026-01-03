import { verifyAndParseStripeEvent } from './stripeWebhook';

type Env = {
  STRIPE_WEBHOOK_SECRET: string;
  API_BASE_URL?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
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

        return Response.json({ received: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Webhook error';
        return new Response(message, { status: 400 });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};
