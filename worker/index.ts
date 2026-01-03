import { verifyAndParseStripeEvent } from './stripeWebhook';

type Env = {
  STRIPE_WEBHOOK_SECRET: string;
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
            // TODO: implement your real business logic.
            // Keep it idempotent: Stripe retries events.
            console.log('Stripe event received', { id: event.id, type: event.type });
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
