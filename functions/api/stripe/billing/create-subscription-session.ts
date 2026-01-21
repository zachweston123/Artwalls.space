import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return new Response('Unauthorized', { status: 401 });

    // 2. Parse Body
    const body = await request.json() as { tier: string };
    const { tier } = body;

    if (!tier || !['starter', 'growth', 'pro'].includes(tier)) {
      return new Response('Invalid tier', { status: 400 });
    }

    // 3. Initialize Stripe
    if (!env.STRIPE_SECRET_KEY) {
      return new Response('Stripe not configured', { status: 500 });
    }
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16', // Use a pinned version or latest
    });

    // 4. Map Tier to Price ID
    const priceMap: Record<string, string> = {
      starter: env.STRIPE_PRICE_ID_STARTER,
      growth: env.STRIPE_PRICE_ID_GROWTH,
      pro: env.STRIPE_PRICE_ID_PRO,
    };

    const priceId = priceMap[tier];
    if (!priceId) {
      return new Response(`Price ID not configured for ${tier}`, { status: 500 });
    }

    // 5. Create Checkout Session
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email,
      metadata: {
        userId: user.id,
        tier: tier,
      },
      success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?payment=cancelled`,
      // Optional: If you have existing customers, look them up or store customer ID in Supabase
    });

    return Response.json({ url: session.url });

  } catch (err: any) {
    console.error('Stripe Session Error:', err);
    return new Response(err.message || 'Internal Error', { status: 500 });
  }
};
