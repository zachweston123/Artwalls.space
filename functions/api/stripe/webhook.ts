import { verifyAndParseStripeEvent } from '../../../worker/stripeWebhook';
import { createClient } from '@supabase/supabase-js';

export const onRequestPost: PagesFunction = async ({ request, env, waitUntil }) => {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });
  }

  let event;
  try {
    event = await verifyAndParseStripeEvent(request, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return new Response(message, { status: 400 });
  }

  // Use Service Role Key to bypass RLS for admin updates (updating user subscription)
  const supabase = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Idempotency: skip events we've already processed
  try {
    const { data: existing } = await supabase
      .from('stripe_webhook_events')
      .select('stripe_event_id')
      .eq('stripe_event_id', event.id)
      .maybeSingle();
    if (existing) {
      return Response.json({ received: true, duplicate: true });
    }
  } catch (err) {
    // If table doesn't exist or query fails, continue processing
    console.warn('Idempotency check failed (non-fatal):', err);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (userId && tier) {
          const { error } = await supabase
            .from('artists')
            .update({
              subscription_tier: tier,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active'
            })
            .eq('id', userId);
            
          if (error) {
            console.error('Failed to update artist subscription:', error);
            throw error;
          }
          console.log(`Updated artist ${userId} to tier ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription.status;
        const subscriptionId = subscription.id;
        
        const { error } = await supabase
            .from('artists')
            .update({ subscription_status: status })
            .eq('stripe_subscription_id', subscriptionId);
            
         if (error) console.error('Error syncing subscription update:', error);
         break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        
        const { error } = await supabase
            .from('artists')
            .update({ 
              subscription_status: 'canceled',
              subscription_tier: 'free'
            })
            .eq('stripe_subscription_id', subscriptionId);
            
        if (error) console.error('Error canceling subscription:', error);
        break;
      }
    }

    // Record this event as processed for idempotency
    try {
      await supabase.from('stripe_webhook_events').insert({
        stripe_event_id: event.id,
        type: event.type,
        note: 'processed by pages function',
        processed_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Failed to record webhook event (non-fatal):', err);
    }

    return Response.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook handler error';
    console.error('Webhook processing error:', err);
    return new Response(message, { status: 500 });
  }
};
