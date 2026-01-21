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

    // 2. Fetch Customer ID
    // We need the user's Stripe Customer ID if they have one
    // Query public.artists using SERVICE ROLE to get the sensitive ID if necessary, 
    // or just assume the user row has it accessible if RLS allows (likely not for random reads/writes).
    // Better to use service role for this lookup.
    
    const adminSupabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: artist } = await adminSupabase
      .from('artists')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!artist?.stripe_customer_id) {
       return new Response('No subscription found to manage', { status: 400 });
    }

    // 3. Initialize Stripe
    if (!env.STRIPE_SECRET_KEY) {
      return new Response('Stripe not configured', { status: 500 });
    }
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // 4. Create Portal Session
    const origin = new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: artist.stripe_customer_id,
      return_url: `${origin}/pricing`,
    });

    return Response.json({ url: session.url });

  } catch (err: any) {
    console.error('Stripe Portal Error:', err);
    return new Response(err.message || 'Internal Error', { status: 500 });
  }
};
