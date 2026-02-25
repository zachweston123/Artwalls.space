import type { WorkerContext } from '../types';
import { verifyAndParseStripeEvent } from '../stripeWebhook';
import { mergeTransferRecords } from '../orderSettlement';
import {
  calculatePricingBreakdown,
  calculateApplicationFeeCents,
  calculatePlatformFeeBps,
  calculateVenueFeeBps,
  normalizeArtistTier,
} from '../../src/lib/pricingCalculations';
import { getArtworkLimit, TIER_LIMITS } from '../../src/lib/entitlements';
import {
  enforceBodySize,
  stripeIdempotencyKey,
  getClientIp,
  userIdFromJwt,
} from '../rateLimit';
import { isUUID, clampStr, isValidUrl, getErrorMessage } from '../helpers';

export async function handleStripe(wc: WorkerContext): Promise<Response | null> {
  const {
    url,
    method,
    request,
    json,
    text,
    supabaseAdmin,
    env,
    pagesOrigin,
    allowOrigin,
    stripeFetch,
    toForm,
    getUser,
    requireAuthOrFail,
    isAdminUser,
    requireArtist,
    requireVenue,
    applyRateLimit,
    upsertArtist,
    upsertVenue,
    sendSms,
    artworkPurchaseUrl,
    generateQrSvg,
    resolveTierFromPriceId,
    TIER_PLATFORM_FEE_BPS,
    applySecurityHeaders,
    logAdminAction,
    ctx,
  } = wc;

  // ══════════════════════════════════════════════════════════════════
  // Stripe Webhook
  // ══════════════════════════════════════════════════════════════════

  if (url.pathname === '/api/stripe/webhook' && method === 'POST') {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET is not configured — all webhooks will fail');
      return json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    try {
      const body = await request.text();
      const sig = request.headers.get('stripe-signature') || '';
      const event = await verifyAndParseStripeEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
      console.log(`[webhook] Event received: ${event.type} (${event.id})`);

      // ── Idempotency: skip events we've already processed ──
      if (supabaseAdmin) {
        const { data: existing } = await supabaseAdmin
          .from('stripe_webhook_events')
          .select('stripe_event_id')
          .eq('stripe_event_id', event.id)
          .maybeSingle();
        if (existing) {
          console.log(`[webhook] Duplicate event ${event.id} (${event.type}) — skipping`);
          return json({ received: true, duplicate: true });
        }
      }

      // ── Handle event types ──

      if (event.type === 'checkout.session.completed') {
        const session = event.data?.object;

        // Subscription checkout completed
        if (session?.mode === 'subscription') {
          const artistId = session?.metadata?.artistId;
          const subscriptionId = session.subscription;
          const customerId = session.customer;
          console.log('[webhook] Subscription checkout completed', { artistId, subscriptionId: subscriptionId ?? null, customerId: customerId ?? null });

          // Resolve tier from the subscription's price ID (authoritative)
          let priceId: string | null = null;
          if (subscriptionId && typeof subscriptionId === 'string') {
            try {
              const subResp = await stripeFetch(`/v1/subscriptions/${subscriptionId}`, { method: 'GET' });
              const sub = await subResp.json() as any;
              priceId = sub?.items?.data?.[0]?.price?.id || null;
            } catch (e) {
              console.warn('[webhook] Unable to fetch subscription price ID:', getErrorMessage(e));
            }
          }
          const tier = resolveTierFromPriceId(priceId, session?.metadata?.tier);
          console.log('[webhook] Tier resolved', { priceId, metadataTier: session?.metadata?.tier, resolvedTier: tier });

          if (artistId && subscriptionId && typeof subscriptionId === 'string') {
            console.log('[webhook] Upserting artist subscription', { artistId, tier, subscriptionId });
            const result = await upsertArtist({
              id: artistId,
              stripeCustomerId: typeof customerId === 'string' ? customerId : null,
              stripeSubscriptionId: subscriptionId,
              subscriptionTier: tier,
              subscriptionStatus: 'active',
              platformFeeBps: TIER_PLATFORM_FEE_BPS[tier] ?? null,
            });
            if (result.status >= 400) {
              const errBody = await result.clone().text().catch(() => 'unknown');
              console.error('[webhook] checkout.session.completed upsert FAILED', { status: result.status, body: errBody });
              return json({ error: 'DB update failed' }, { status: 500 });
            }

            // ── Founding Artist redemption finalization ──
            const isFoundingSub = session?.metadata?.foundingArtist === 'true';
            if (isFoundingSub && supabaseAdmin) {
              const nowIso = new Date().toISOString();
              const discountEnds = new Date(Date.now() + 365.25 * 24 * 60 * 60 * 1000).toISOString(); // +12 months
              const couponId = env.STRIPE_FOUNDING_ARTIST_COUPON_ID || 'founding_artist_50';
              const { error: fErr } = await supabaseAdmin
                .from('artists')
                .update({
                  founding_offer_redeemed_at: nowIso,
                  founding_discount_ends_at: discountEnds,
                  founding_coupon_id: couponId,
                  is_founding_artist: true,
                  had_paid_subscription: true,
                  updated_at: nowIso,
                })
                .eq('id', artistId);
              if (fErr) {
                console.error('[webhook] Founding artist update failed:', fErr.message);
              } else {
                console.log('✅ Founding Artist redeemed', { artistId, discountEnds });
              }
            } else if (tier !== 'free' && supabaseAdmin) {
              // Mark had_paid_subscription for non-founding paid subscriptions
              await supabaseAdmin
                .from('artists')
                .update({ had_paid_subscription: true, updated_at: new Date().toISOString() })
                .eq('id', artistId);
            }

            console.log('✅ Artist subscription activated', { artistId, tier, subscriptionId });
          }
        }

        // Marketplace payment checkout completed
        if (session?.mode === 'payment') {
          const orderId = session?.metadata?.orderId;
          const artworkId = session?.metadata?.artworkId;
          if (orderId && supabaseAdmin) {
            const { data: order } = await supabaseAdmin
              .from('orders')
              .select('*')
              .eq('id', orderId)
              .maybeSingle();
            if (order && order.status !== 'paid') {
              // Retrieve the PaymentIntent + latest charge for source_transaction
              const piId = session.payment_intent;
              let chargeId: string | null = null;
              if (piId) {
                try {
                  const piResp = await stripeFetch(`/v1/payment_intents/${piId}?expand[]=latest_charge`, { method: 'GET' });
                  const pi = await piResp.json() as any;
                  chargeId = typeof pi.latest_charge === 'string'
                    ? pi.latest_charge
                    : pi.latest_charge?.id || null;
                } catch (e) {
                  console.warn('Unable to retrieve PaymentIntent charge', e);
                }
              }

              // Create transfers to artist and venue Connect accounts
              const transfers: Array<{ recipient: string; id: string }> = [];
              let payoutStatus = 'pending_connect';
              let payoutError: string | null = null;

              const artistPayoutCents = order.artist_amount_cents || 0;
              const venuePayoutCents = order.venue_amount_cents || order.venue_commission_cents || 0;
              const orderCurrency = (order.currency || 'usd').toLowerCase();

              if (artistPayoutCents > 0 && chargeId) {
                const { data: artist } = await supabaseAdmin
                  .from('artists')
                  .select('stripe_account_id,stripe_payouts_enabled')
                  .eq('id', order.artist_id)
                  .maybeSingle();
                // SECURITY: Only transfer to verified accounts with payouts enabled
                if (artist?.stripe_account_id && artist?.stripe_payouts_enabled) {
                  try {
                    const tResp = await stripeFetch('/v1/transfers', {
                      method: 'POST',
                      body: toForm({
                        amount: String(artistPayoutCents),
                        currency: orderCurrency,
                        destination: artist.stripe_account_id,
                        source_transaction: chargeId,
                        transfer_group: orderId,
                        'metadata[orderId]': orderId,
                        'metadata[artworkId]': artworkId || '',
                        'metadata[recipient]': 'artist',
                        'metadata[recipientId]': order.artist_id,
                      }),
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    });
                    const t = await tResp.json() as any;
                    if (tResp.ok) {
                      transfers.push({ recipient: 'artist', id: t.id });
                    } else {
                      console.error('Artist transfer failed', t?.error?.message);
                      payoutError = `Artist transfer failed: ${t?.error?.message || 'unknown'}`;
                    }
                  } catch (e: unknown) {
                    payoutError = `Artist transfer error: ${getErrorMessage(e)}`;
                  }
                } else if (!artist?.stripe_account_id) {
                  payoutError = 'Artist stripe_account_id missing';
                } else if (!artist?.stripe_payouts_enabled) {
                  const msg = 'Artist payouts disabled or onboarding incomplete';
                  payoutError = msg;
                  payoutStatus = 'blocked_pending_onboarding';
                }
              }

              if (venuePayoutCents > 0 && order.venue_id && chargeId) {
                const { data: venue } = await supabaseAdmin
                  .from('venues')
                  .select('stripe_account_id,stripe_payouts_enabled')
                  .eq('id', order.venue_id)
                  .maybeSingle();
                if (venue?.stripe_account_id && venue?.stripe_payouts_enabled) {
                  try {
                    const tResp = await stripeFetch('/v1/transfers', {
                      method: 'POST',
                      body: toForm({
                        amount: String(venuePayoutCents),
                        currency: orderCurrency,
                        destination: venue.stripe_account_id,
                        source_transaction: chargeId,
                        transfer_group: orderId,
                        'metadata[orderId]': orderId,
                        'metadata[artworkId]': artworkId || '',
                        'metadata[recipient]': 'venue',
                        'metadata[recipientId]': order.venue_id,
                      }),
                      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    });
                    const t = await tResp.json() as any;
                    if (tResp.ok) {
                      transfers.push({ recipient: 'venue', id: t.id });
                    } else {
                      console.error('Venue transfer failed', t?.error?.message);
                      payoutError = payoutError
                        ? `${payoutError}; Venue transfer failed: ${t?.error?.message || 'unknown'}`
                        : `Venue transfer failed: ${t?.error?.message || 'unknown'}`;
                    }
                  } catch (e: unknown) {
                    const msg = `Venue transfer error: ${getErrorMessage(e)}`;
                    payoutError = payoutError ? `${payoutError}; ${msg}` : msg;
                  }
                } else if (!venue?.stripe_account_id || !venue?.stripe_payouts_enabled) {
                  const msg = 'Venue payouts disabled or onboarding incomplete';
                  payoutError = payoutError ? `${payoutError}; ${msg}` : msg;
                  payoutStatus = 'blocked_pending_onboarding';
                }
              }

              if (!payoutError) payoutStatus = 'paid';

              // Update order with payment + transfer data
              await supabaseAdmin
                .from('orders')
                .update({
                  status: 'paid',
                  stripe_payment_intent_id: piId || null,
                  stripe_charge_id: chargeId || null,
                  transfer_ids: transfers.length > 0 ? transfers : null,
                  payout_status: payoutStatus,
                  payout_error: payoutError,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

              if (artworkId) {
                await supabaseAdmin
                  .from('artworks')
                  .update({ status: 'sold', updated_at: new Date().toISOString() })
                  .eq('id', artworkId);
              }
              console.log('✅ Marketplace order paid + transfers created', { orderId, transfers, payoutStatus });
            }
          }
        }
      }

      if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
        const sub = event.data?.object;
        const artistId = sub?.metadata?.artistId;
        console.log(`[webhook] ${event.type}`, { artistId: artistId ?? null, subId: sub?.id ?? null });

        // Resolve tier from the subscription's current price ID (authoritative)
        // This correctly handles plan changes made through the Stripe Customer Portal.
        const priceId = sub?.items?.data?.[0]?.price?.id || null;
        const tier = event.type === 'customer.subscription.deleted'
          ? 'free'
          : resolveTierFromPriceId(priceId, sub?.metadata?.tier);
        const status = event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : (sub?.status === 'active' ? 'active' : (sub?.status || 'inactive'));
        console.log(`[webhook] ${event.type} resolved`, { artistId, tier, status, priceId });

        if (artistId) {
          const result = await upsertArtist({
            id: artistId,
            stripeSubscriptionId: sub?.id || null,
            subscriptionTier: tier,
            subscriptionStatus: status,
            platformFeeBps: TIER_PLATFORM_FEE_BPS[tier] ?? null,
          });
          if (result.status >= 400) {
            const errBody = await result.clone().text().catch(() => 'unknown');
            console.error(`[webhook] ${event.type} upsert FAILED`, { status: result.status, body: errBody });
            return json({ error: 'DB update failed' }, { status: 500 });
          }
          console.log('✅ Artist subscription updated', { artistId, tier, status });
        }
      }

      if (event.type === 'account.updated') {
        const account = event.data?.object;
        if (account?.id && supabaseAdmin) {
          const nowIso = new Date().toISOString();
          const updates = {
            stripe_charges_enabled: !!account.charges_enabled,
            stripe_payouts_enabled: !!account.payouts_enabled,
            stripe_details_submitted: !!account.details_submitted,
            updated_at: nowIso,
          };
          await supabaseAdmin.from('artists').update(updates).eq('stripe_account_id', account.id);
          await supabaseAdmin.from('venues').update(updates).eq('stripe_account_id', account.id);
          console.log('✅ Connect account updated', account.id);
        }
      }

      // ── Record for idempotency ──
      // If this insert fails, return 500 so Stripe retries (we may have
      // processed the event above but can't guarantee dedup on the next attempt).
      if (supabaseAdmin) {
        const { error: idempError } = await supabaseAdmin.from('stripe_webhook_events').insert({
          stripe_event_id: event.id,
          type: event.type,
          note: 'processed by worker',
          processed_at: new Date().toISOString(),
        });
        if (idempError) {
          // Unique-violation (23505) means a concurrent handler already recorded it — that's fine.
          if (idempError.code !== '23505') {
            console.error('[webhook] Failed to record idempotency:', idempError.message);
            return json({ error: 'Idempotency record failed' }, { status: 500 });
          }
        }
      }

      return json({ received: true });
    } catch (err: unknown) {
      console.error('[webhook] Unhandled error:', getErrorMessage(err));
      // Return 500 for unexpected errors so Stripe retries.
      // 400 is reserved for signature verification failures.
      const msg = getErrorMessage(err);
      const isSignatureError = msg.includes('signature') || msg.includes('Webhook');
      return json({ error: msg }, { status: isSignatureError ? 400 : 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Stripe Connect: Artist
  // ══════════════════════════════════════════════════════════════════

  // Create Connect Express account for artist
  if (url.pathname === '/api/stripe/connect/artist/create-account' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    // Venues are explicitly excluded; all other roles (artist, undefined, null) are treated as artist
    if (user!.user_metadata?.role === 'venue') return json({ error: 'Artist role required (venue accounts cannot use this endpoint)' }, { status: 403 });
    const rlCreate = await applyRateLimit('stripe-connect-artist-create', request);
    if (rlCreate) return rlCreate;

    // Check if already has account
    const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id,email,name').eq('id', user!.id).maybeSingle();
    if (artist?.stripe_account_id) return json({ accountId: artist.stripe_account_id, alreadyExists: true });

    try {
      const resp = await stripeFetch('/v1/accounts', {
        method: 'POST',
        body: toForm({
          type: 'express',
          email: artist?.email || user!.email || undefined,
          'capabilities[card_payments][requested]': 'true',
          'capabilities[transfers][requested]': 'true',
          'metadata[artistId]': user!.id,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const account = await resp.json();
      if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');

      await upsertArtist({ id: user!.id, email: artist?.email, name: artist?.name, role: 'artist', stripeAccountId: account.id });
      return json({ accountId: account.id, alreadyExists: false });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Create account link for artist onboarding
  if (url.pathname === '/api/stripe/connect/artist/account-link' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    if (user!.user_metadata?.role === 'venue') return json({ error: 'Artist role required (venue accounts cannot use this endpoint)' }, { status: 403 });
    const rlLink = await applyRateLimit('stripe-connect-artist-link', request);
    if (rlLink) return rlLink;

    const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', user!.id).maybeSingle();
    if (!artist?.stripe_account_id) return json({ error: 'No Stripe account. Call /create-account first.' }, { status: 400 });

    try {
      const resp = await stripeFetch('/v1/account_links', {
        method: 'POST',
        body: toForm({
          account: artist.stripe_account_id,
          refresh_url: `${pagesOrigin}/#/artist-dashboard`,
          return_url: `${pagesOrigin}/#/artist-dashboard`,
          type: 'account_onboarding',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const link = await resp.json();
      if (!resp.ok) throw new Error(link?.error?.message || 'Account link failed');
      return json({ url: link.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Login link for artist Connect dashboard
  if (url.pathname === '/api/stripe/connect/artist/login-link' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlLogin = await applyRateLimit('stripe-connect-artist-login', request);
    if (rlLogin) return rlLogin;

    const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', user!.id).maybeSingle();
    if (!artist?.stripe_account_id) return json({ error: 'No Stripe account yet' }, { status: 400 });

    try {
      const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}/login_links`, {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const link = await resp.json();
      if (!resp.ok) throw new Error(link?.error?.message || 'Login link failed');
      return json({ url: link.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Artist Connect status
  if (url.pathname === '/api/stripe/connect/artist/status' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Server misconfiguration: Supabase admin client not initialised', code: 'SUPABASE_ADMIN_MISCONFIG' }, { status: 500 });
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Server misconfiguration: STRIPE_SECRET_KEY not set', code: 'STRIPE_KEY_MISSING' }, { status: 500 });
    const artistId = url.searchParams.get('artistId') || url.searchParams.get('userId');
    if (!artistId) return json({ error: 'Missing artistId or userId' }, { status: 400 });

    const { data: artist } = await supabaseAdmin.from('artists').select('stripe_account_id').eq('id', artistId).maybeSingle();
    if (!artist?.stripe_account_id) return json({ hasAccount: false, onboardingStatus: 'not_started' });

    try {
      const resp = await stripeFetch(`/v1/accounts/${artist.stripe_account_id}`, { method: 'GET' });
      const account = await resp.json() as any;
      if (!resp.ok) throw new Error(account?.error?.message || 'Status fetch failed');

      const onboardingStatus = account.payouts_enabled && account.charges_enabled
        ? 'complete'
        : account.requirements?.currently_due?.length > 0
          ? 'restricted'
          : account.details_submitted
            ? 'pending'
            : 'not_started';

      return json({
        hasAccount: true,
        accountId: artist.stripe_account_id,
        onboardingStatus,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
      });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Stripe Connect: Venue
  // ══════════════════════════════════════════════════════════════════

  // Combined onboard endpoint: create account if needed + create account link
  // This is what VenuePayoutsCard calls (single round-trip).
  if (url.pathname === '/api/stripe/connect/venue/onboard' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    if (user!.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
    const rlOnboard = await applyRateLimit('stripe-connect-venue-onboard', request);
    if (rlOnboard) return rlOnboard;

    const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id,email,name,default_venue_fee_bps').eq('id', user!.id).maybeSingle();
    let accountId = venue?.stripe_account_id;

    // Step 1: Create Stripe Express account if one doesn't exist
    if (!accountId) {
      try {
        const resp = await stripeFetch('/v1/accounts', {
          method: 'POST',
          body: toForm({
            type: 'express',
            email: venue?.email || user!.email || undefined,
            'capabilities[card_payments][requested]': 'true',
            'capabilities[transfers][requested]': 'true',
            'metadata[venueId]': user!.id,
            'metadata[role]': 'venue',
          }),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const account = await resp.json() as any;
        if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');
        accountId = account.id;
        await upsertVenue({ id: user!.id, stripeAccountId: accountId });
        console.log('[venue-onboard] Created Stripe account', { venueId: user!.id, accountId });
      } catch (err: unknown) {
        return json({ error: getErrorMessage(err) }, { status: 500 });
      }
    }

    // Step 2: Create account link for onboarding
    try {
      const resp = await stripeFetch('/v1/account_links', {
        method: 'POST',
        body: toForm({
          account: accountId,
          refresh_url: `${pagesOrigin}/#/venue-dashboard?stripe=refresh`,
          return_url: `${pagesOrigin}/#/venue-dashboard?stripe=return`,
          type: 'account_onboarding',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const link = await resp.json() as any;
      if (!resp.ok) throw new Error(link?.error?.message || 'Account link failed');
      console.log('[venue-onboard] Created account link', { venueId: user!.id, accountId });
      return json({ url: link.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Login alias — VenuePayoutsCard calls /login, worker has /login-link
  if (url.pathname === '/api/stripe/connect/venue/login' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlVLogin2 = await applyRateLimit('stripe-connect-venue-login', request);
    if (rlVLogin2) return rlVLogin2;

    const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user!.id).maybeSingle();
    if (!venue?.stripe_account_id) return json({ error: 'No Stripe account yet' }, { status: 400 });

    try {
      const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}/login_links`, {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const link = await resp.json() as any;
      if (!resp.ok) throw new Error(link?.error?.message || 'Login link failed');
      return json({ url: link.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Create Connect Express account for venue
  if (url.pathname === '/api/stripe/connect/venue/create-account' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    if (user!.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
    const rlVCreate = await applyRateLimit('stripe-connect-venue-create', request);
    if (rlVCreate) return rlVCreate;

    const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id,email,name,default_venue_fee_bps').eq('id', user!.id).maybeSingle();
    if (venue?.stripe_account_id) return json({ accountId: venue.stripe_account_id, alreadyExists: true });

    try {
      const resp = await stripeFetch('/v1/accounts', {
        method: 'POST',
        body: toForm({
          type: 'express',
          email: venue?.email || user!.email || undefined,
          'capabilities[card_payments][requested]': 'true',
          'capabilities[transfers][requested]': 'true',
          'metadata[venueId]': user!.id,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const account = await resp.json();
      if (!resp.ok) throw new Error(account?.error?.message || 'Account creation failed');

      await upsertVenue({ id: user!.id, email: venue?.email, name: venue?.name, stripeAccountId: account.id, defaultVenueFeeBps: venue?.default_venue_fee_bps ?? 1000 });
      return json({ accountId: account.id, alreadyExists: false });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Create account link for venue onboarding
  if (url.pathname === '/api/stripe/connect/venue/account-link' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    if (user!.user_metadata?.role !== 'venue') return json({ error: 'Venue role required' }, { status: 403 });
    const rlVLink = await applyRateLimit('stripe-connect-venue-link', request);
    if (rlVLink) return rlVLink;

    const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user!.id).maybeSingle();
    if (!venue?.stripe_account_id) return json({ error: 'No Stripe account. Call /create-account first.' }, { status: 400 });

    try {
      const resp = await stripeFetch('/v1/account_links', {
        method: 'POST',
        body: toForm({
          account: venue.stripe_account_id,
          refresh_url: `${pagesOrigin}/#/venue-dashboard`,
          return_url: `${pagesOrigin}/#/venue-dashboard`,
          type: 'account_onboarding',
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const link = await resp.json();
      if (!resp.ok) throw new Error(link?.error?.message || 'Account link failed');
      return json({ url: link.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Login link for venue Connect dashboard
  if (url.pathname === '/api/stripe/connect/venue/login-link' && method === 'POST') {
    const user = await getUser(request);
    const authErr = requireAuthOrFail(request, user);
    if (authErr) return authErr;
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlVLogin = await applyRateLimit('stripe-connect-venue-login', request);
    if (rlVLogin) return rlVLogin;

    const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', user!.id).maybeSingle();
    if (!venue?.stripe_account_id) return json({ error: 'No Stripe account yet' }, { status: 400 });

    try {
      const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}/login_links`, {
        method: 'POST',
        body: '',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const link = await resp.json();
      if (!resp.ok) throw new Error(link?.error?.message || 'Login link failed');
      return json({ url: link.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Venue Connect status
  if (url.pathname === '/api/stripe/connect/venue/status' && method === 'GET') {
    if (!supabaseAdmin) return json({ error: 'Server misconfiguration: Supabase admin client not initialised', code: 'SUPABASE_ADMIN_MISCONFIG' }, { status: 500 });
    if (!env.STRIPE_SECRET_KEY) return json({ error: 'Server misconfiguration: STRIPE_SECRET_KEY not set', code: 'STRIPE_KEY_MISSING' }, { status: 500 });
    const venueId = url.searchParams.get('venueId') || url.searchParams.get('userId');
    if (!venueId) return json({ error: 'Missing venueId or userId' }, { status: 400 });

    const { data: venue } = await supabaseAdmin.from('venues').select('stripe_account_id').eq('id', venueId).maybeSingle();
    if (!venue?.stripe_account_id) return json({ hasAccount: false, onboardingStatus: 'not_started' });

    try {
      const resp = await stripeFetch(`/v1/accounts/${venue.stripe_account_id}`, { method: 'GET' });
      const account = await resp.json() as any;
      if (!resp.ok) throw new Error(account?.error?.message || 'Status fetch failed');

      // Derive onboardingStatus for the frontend badge
      const onboardingStatus = account.payouts_enabled && account.charges_enabled
        ? 'complete'
        : account.requirements?.currently_due?.length > 0
          ? 'restricted'
          : account.details_submitted
            ? 'pending'
            : 'not_started';

      return json({
        hasAccount: true,
        accountId: venue.stripe_account_id,
        onboardingStatus,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
      });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Stripe Marketplace Checkout
  // ══════════════════════════════════════════════════════════════════

  // Create marketplace checkout session for artwork purchase
  if (url.pathname === '/api/stripe/create-checkout-session' && method === 'POST') {
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });

    // Enforce body size before parsing
    const bodySizeErr = await enforceBodySize(request, 32_768);
    if (bodySizeErr) return json({ error: bodySizeErr.error }, { status: bodySizeErr.status });

    const body = await request.json().catch(() => ({}));
    const artworkId = body?.artworkId;
    if (!artworkId || !isUUID(artworkId)) return json({ error: 'Invalid artworkId' }, { status: 400 });

    // Per-route rate limit with artworkId dimension
    const rlCheckout = await applyRateLimit('stripe-checkout', request, artworkId);
    if (rlCheckout) return rlCheckout;

    // Look up artwork
    const { data: artwork, error: artErr } = await supabaseAdmin
      .from('artworks')
      .select('id,title,price,currency,status,artist_id,venue_id,image_url')
      .eq('id', artworkId)
      .maybeSingle();
    if (artErr || !artwork) return json({ error: 'Artwork not found' }, { status: 404 });
    if (artwork.status === 'sold') return json({ error: 'Artwork is no longer available' }, { status: 410 });

    const listPriceDollars = Number(artwork.price);
    if (!Number.isFinite(listPriceDollars) || listPriceDollars <= 0) {
      return json({ error: 'Artwork has no valid price' }, { status: 400 });
    }

    // Look up artist tier for economics
    const { data: artist } = await supabaseAdmin
      .from('artists')
      .select('id,subscription_tier,stripe_account_id')
      .eq('id', artwork.artist_id)
      .maybeSingle();

    const artistTier = normalizeArtistTier(artist?.subscription_tier || 'free', 'free');
    const breakdown = calculatePricingBreakdown(listPriceDollars, artistTier);

    // Generate order ID
    const orderId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    // Insert order with economics snapshot
    const { error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        id: orderId,
        artwork_id: artworkId,
        artist_id: artwork.artist_id,
        venue_id: artwork.venue_id || null,
        status: 'pending',
        currency: (artwork.currency || 'usd').toLowerCase(),
        list_price_cents: breakdown.listPriceCents,
        buyer_fee_cents: breakdown.buyerFeeCents,
        buyer_total_cents: breakdown.customerPaysCents,
        venue_amount_cents: breakdown.venueCents,
        venue_commission_cents: breakdown.venueCents,
        artist_amount_cents: breakdown.artistCents,
        platform_gross_before_stripe_cents: breakdown.platformRemainderCents,
        artist_plan_id_at_purchase: artistTier,
        created_at: nowIso,
        updated_at: nowIso,
      });

    if (orderErr) {
      console.error('Order insert failed', orderErr.message);
      return json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Create Stripe Checkout Session
    const formData: Record<string, any> = {
      mode: 'payment',
      success_url: `${artworkPurchaseUrl(artworkId)}?status=success`,
      cancel_url: `${artworkPurchaseUrl(artworkId)}?status=cancel`,
      'line_items[0][price_data][currency]': (artwork.currency || 'usd').toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(breakdown.customerPaysCents),
      'line_items[0][price_data][product_data][name]': clampStr(artwork.title || 'Artwork', 200),
      'line_items[0][quantity]': '1',
      'metadata[orderId]': orderId,
      'metadata[artworkId]': artworkId,
      'payment_intent_data[transfer_group]': orderId,
    };

    // If artist has a connected account, we'll add them in metadata for the webhook
    if (artist?.stripe_account_id) {
      formData['metadata[artistStripeAccountId]'] = artist.stripe_account_id;
    }

    // Add image if available
    if (artwork.image_url && isValidUrl(artwork.image_url)) {
      formData['line_items[0][price_data][product_data][images][0]'] = artwork.image_url;
    }

    try {
      // Deterministic idempotency key prevents duplicate sessions on retries
      const identity = userIdFromJwt(request) || getClientIp(request);
      const idempotencyKey = await stripeIdempotencyKey(artworkId, identity);
      const sessResp = await stripeFetch('/v1/checkout/sessions', {
        method: 'POST',
        body: toForm(formData),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Idempotency-Key': idempotencyKey,
        },
      });
      const sess = await sessResp.json() as any;
      if (!sessResp.ok) {
        console.error('Stripe session creation failed', sess?.error?.message);
        // Clean up the pending order
        await supabaseAdmin.from('orders').delete().eq('id', orderId);
        return json({ error: sess?.error?.message || 'Checkout session failed' }, { status: 500 });
      }

      // Update order with Stripe session ID
      await supabaseAdmin
        .from('orders')
        .update({ stripe_checkout_session_id: sess.id, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      return json({ url: sess.url });
    } catch (err: unknown) {
      // Clean up the pending order
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Stripe Billing
  // ══════════════════════════════════════════════════════════════════

  // Create subscription checkout session
  if (url.pathname === '/api/stripe/billing/create-subscription-session' && method === 'POST') {
    console.log('[subscription] Session creation request received');
    const user = await getUser(request);
    if (!user) {
      console.warn('[subscription] Auth failed — no valid user from token');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.user_metadata?.role === 'venue') return json({ error: 'Only artists can subscribe' }, { status: 403 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlSub = await applyRateLimit('stripe-subscription', request);
    if (rlSub) return rlSub;

    const body = await request.json().catch(() => ({}));
    const tier = String(body?.tier || '').toLowerCase();
    console.log('[subscription] Resolved', { artistId: user.id, tierRequested: tier });
    if (!['starter', 'growth', 'pro'].includes(tier)) {
      console.warn('[subscription] Invalid tier rejected:', tier);
      return json({ error: 'Invalid tier' }, { status: 400 });
    }

    const priceMap: Record<string, string | undefined> = {
      starter: env.STRIPE_PRICE_ID_STARTER || env.STRIPE_SUB_PRICE_STARTER,
      growth: env.STRIPE_PRICE_ID_GROWTH || env.STRIPE_SUB_PRICE_GROWTH,
      pro: env.STRIPE_PRICE_ID_PRO || env.STRIPE_SUB_PRICE_PRO,
    };
    const priceId = priceMap[tier];
    if (!priceId) {
      console.error('[subscription] Missing env var — STRIPE_PRICE_ID_' + tier.toUpperCase() + ' / STRIPE_SUB_PRICE_' + tier.toUpperCase() + ' not set');
      return json({ error: `Price ID not configured for ${tier}. Check STRIPE_PRICE_ID_${tier.toUpperCase()} env var.` }, { status: 500 });
    }
    console.log('[subscription] Price resolved', { tier, priceId });

    // Ensure Stripe customer
    const { data: artist } = await supabaseAdmin.from('artists').select('stripe_customer_id,email,name,subscription_status,subscription_tier,founding_offer_redeemed_at,is_founding_artist,had_paid_subscription').eq('id', user.id).maybeSingle();

    // ── Block duplicate subscriptions ──
    // If the artist already has an active subscription, redirect to the
    // billing portal instead of creating a new checkout session.
    if (artist?.subscription_status === 'active' && artist?.subscription_tier && artist.subscription_tier !== 'free') {
      if (artist.stripe_customer_id) {
        const portalOrigin = env.PAGES_ORIGIN || 'https://artwalls.space';
        try {
          const portalResp = await stripeFetch('/v1/billing_portal/sessions', {
            method: 'POST',
            body: toForm({
              customer: artist.stripe_customer_id,
              return_url: `${portalOrigin}/#/artist-dashboard`,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          });
          const portal = await portalResp.json() as any;
          if (portalResp.ok && portal.url) {
            console.log('[subscription] Active sub exists — redirecting to portal', { artistId: user.id, currentTier: artist.subscription_tier });
            return json({ url: portal.url, redirectedToPortal: true });
          }
        } catch (e) {
          console.warn('[subscription] Portal redirect failed, falling through:', getErrorMessage(e));
        }
      }
      // If portal creation fails, return a clear error rather than creating a duplicate
      return json({ error: 'You already have an active subscription. Use Manage Subscription to change plans.' }, { status: 409 });
    }
    let customerId = artist?.stripe_customer_id;
    if (!customerId) {
      const custResp = await stripeFetch('/v1/customers', {
        method: 'POST',
        body: toForm({
          email: artist?.email || user.email || undefined,
          name: artist?.name || undefined,
          'metadata[artistId]': user.id,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const cust = await custResp.json();
      if (!custResp.ok) return json({ error: cust?.error?.message || 'Customer creation failed' }, { status: 500 });
      customerId = cust.id;
      await upsertArtist({ id: user.id, stripeCustomerId: customerId });
    }

    try {
      // ── Founding Artist coupon eligibility (server-side only) ──
      let applyFoundingCoupon = false;
      const foundingCouponId = env.STRIPE_FOUNDING_ARTIST_COUPON_ID;
      if (foundingCouponId && !artist?.is_founding_artist && !artist?.founding_offer_redeemed_at && !artist?.had_paid_subscription) {
        // Check global settings
        const { data: settingsRows } = await supabaseAdmin
          .from('app_settings')
          .select('key,value')
          .in('key', ['founding_artist_offer_enabled', 'founding_artist_offer_max_redemptions', 'founding_artist_offer_cutoff']);
        const settingsMap: Record<string, any> = {};
        for (const r of settingsRows || []) settingsMap[r.key] = r.value;

        const offerOn = settingsMap.founding_artist_offer_enabled === true || settingsMap.founding_artist_offer_enabled === 'true';
        const maxSlots = Number(env.FOUNDING_ARTIST_MAX_REDEMPTIONS || settingsMap.founding_artist_offer_max_redemptions || 50);
        const cutoffStr = String(env.FOUNDING_ARTIST_CUTOFF || settingsMap.founding_artist_offer_cutoff || '2026-12-31T23:59:59Z').replace(/^"|"$/g, '');

        if (offerOn && new Date() < new Date(cutoffStr)) {
          const { count } = await supabaseAdmin.from('artists').select('id', { count: 'exact', head: true }).eq('is_founding_artist', true);
          if ((count ?? 0) < maxSlots) {
            applyFoundingCoupon = true;
            console.log('[subscription] Founding Artist coupon eligible', { artistId: user.id });
          }
        }
      }

      const checkoutParams: Record<string, string> = {
        mode: 'subscription',
        success_url: `${pagesOrigin}/#/artist-dashboard?sub=success`,
        cancel_url: `${pagesOrigin}/#/artist-dashboard?sub=cancel`,
        customer: customerId as string,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'metadata[artistId]': user.id,
        'metadata[tier]': tier,
        'subscription_data[metadata][artistId]': user.id,
        'subscription_data[metadata][tier]': tier,
        // Prevent user-entered promo codes when founding coupon is applied
        allow_promotion_codes: applyFoundingCoupon ? 'false' : 'true',
      };

      if (applyFoundingCoupon) {
        checkoutParams['discounts[0][coupon]'] = foundingCouponId as string;
        checkoutParams['metadata[foundingArtist]'] = 'true';
        checkoutParams['subscription_data[metadata][foundingArtist]'] = 'true';
      }

      const sessResp = await stripeFetch('/v1/checkout/sessions', {
        method: 'POST',
        body: toForm(checkoutParams),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const sess = await sessResp.json();
      if (!sessResp.ok) throw new Error(sess?.error?.message || 'Checkout session failed');
      console.log('[subscription] ✅ Checkout session created', { sessionId: sess.id, artistId: user.id, tier });
      return json({ url: sess.url });
    } catch (err: unknown) {
      console.error('[subscription] Checkout session creation failed:', getErrorMessage(err));
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  // Create billing portal session
  if (url.pathname === '/api/stripe/billing/create-portal-session' && method === 'POST') {
    const user = await getUser(request);
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
    if (!supabaseAdmin) return json({ error: 'Supabase not configured' }, { status: 500 });
    const rlPortal = await applyRateLimit('stripe-portal', request);
    if (rlPortal) return rlPortal;

    const { data: artist } = await supabaseAdmin.from('artists').select('stripe_customer_id,email,name').eq('id', user.id).maybeSingle();
    let customerId = artist?.stripe_customer_id;
    if (!customerId) {
      const custResp = await stripeFetch('/v1/customers', {
        method: 'POST',
        body: toForm({
          email: artist?.email || user.email || undefined,
          name: artist?.name || undefined,
          'metadata[artistId]': user.id,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const cust = await custResp.json();
      if (!custResp.ok) return json({ error: cust?.error?.message || 'Customer creation failed' }, { status: 500 });
      customerId = cust.id;
      await upsertArtist({ id: user.id, stripeCustomerId: customerId });
    }

    try {
      const portalResp = await stripeFetch('/v1/billing_portal/sessions', {
        method: 'POST',
        body: toForm({
          customer: customerId,
          return_url: `${pagesOrigin}/#/artist-dashboard`,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const portal = await portalResp.json();
      if (!portalResp.ok) throw new Error(portal?.error?.message || 'Billing portal error');
      return json({ url: portal.url });
    } catch (err: unknown) {
      return json({ error: getErrorMessage(err) }, { status: 500 });
    }
  }

  return null;
}
