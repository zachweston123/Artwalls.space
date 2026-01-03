import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import crypto from 'node:crypto';

import { supabaseAdmin } from './supabaseClient.js';

import {
  upsertArtist,
  getArtist,
  listArtists,
  upsertVenue,
  getVenue,
  listVenues,
  createArtwork,
  listArtworksByArtist,
  getArtwork,
  createOrder,
  updateOrder,
  findOrderById,
  markArtworkSold,
  wasEventProcessed,
  markEventProcessed,
  listWallspacesByVenue,
  createWallspace,
  updateWallspace,
  deleteWallspace,
} from './db.js';

dotenv.config();

const app = express();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('Missing STRIPE_SECRET_KEY in environment.');
  process.exit(1);
}

// Pin API version for repeatability.
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

const PORT = process.env.PORT || 4242;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const SUCCESS_URL = process.env.CHECKOUT_SUCCESS_URL || `${APP_URL}/#/purchase-success`;
const CANCEL_URL = process.env.CHECKOUT_CANCEL_URL || `${APP_URL}/#/purchase-cancel`;

const SUB_SUCCESS_URL = process.env.SUB_SUCCESS_URL || `${APP_URL}/#/artist-dashboard?sub=success`;
const SUB_CANCEL_URL = process.env.SUB_CANCEL_URL || `${APP_URL}/#/artist-dashboard?sub=cancel`;

const CORS_ORIGIN = process.env.CORS_ORIGIN || true;

// -----------------------------
// Webhook (must be before json)
// -----------------------------
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(400).send('Missing STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Webhook signature verification failed', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  // Idempotency: Stripe may retry events
  if (await wasEventProcessed(event.id)) {
    return res.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Payment checkout (marketplace purchase)
      if (session.mode === 'payment') {
        const orderId = session?.metadata?.orderId;
        const artworkId = session?.metadata?.artworkId;

        if (!orderId) throw new Error('Missing orderId in session metadata');

        const order = await findOrderById(orderId);
        if (!order) throw new Error(`Order not found: ${orderId}`);

        // Avoid double-paying
        if (order.status !== 'paid') {
          // Pull the charge so we can create transfers against it
          const piId = session.payment_intent;
          if (!piId) throw new Error('Missing payment_intent on completed session');

          const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
          const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
          if (!chargeId) throw new Error('Missing latest_charge on PaymentIntent');

          // Create transfers (Separate Charges and Transfers) to multiple connected accounts
          // Note: platform retains its fee automatically by transferring less than the gross amount.
          const transfers = [];

          if (order.artistPayoutCents > 0) {
            const artist = await getArtist(order.artistId);
            if (!artist?.stripeAccountId) throw new Error('Artist stripeAccountId missing for payout');
            const t = await stripe.transfers.create({
              amount: order.artistPayoutCents,
              currency: order.currency,
              destination: artist.stripeAccountId,
              source_transaction: chargeId,
              transfer_group: orderId,
              metadata: { orderId, artworkId, recipient: 'artist', recipientId: order.artistId },
            });
            transfers.push({ recipient: 'artist', id: t.id });
          }

          if (order.venuePayoutCents > 0) {
            const venue = await getVenue(order.venueId);
            if (!venue?.stripeAccountId) throw new Error('Venue stripeAccountId missing for payout');
            const t = await stripe.transfers.create({
              amount: order.venuePayoutCents,
              currency: order.currency,
              destination: venue.stripeAccountId,
              source_transaction: chargeId,
              transfer_group: orderId,
              metadata: { orderId, artworkId, recipient: 'venue', recipientId: order.venueId },
            });
            transfers.push({ recipient: 'venue', id: t.id });
          }

          await updateOrder(orderId, {
            status: 'paid',
            stripePaymentIntentId: piId,
            stripeChargeId: chargeId,
            transferIds: transfers,
          });

          if (artworkId) {
            const sold = await markArtworkSold(artworkId);
            // Optional: prevent double-sells by deactivating the Stripe price/product.
            try {
              const priceId = sold?.stripePriceId;
              const productId = sold?.stripeProductId;
              if (priceId) await stripe.prices.update(priceId, { active: false });
              if (productId) await stripe.products.update(productId, { active: false });
            } catch (e) {
              console.warn('Unable to deactivate Stripe price/product', e?.message || e);
            }
          }

          console.log('✅ Marketplace order paid + transfers created', { orderId, transfers });
        }
      }

      // Subscription checkout (artist plan)
      if (session.mode === 'subscription') {
        const artistId = session?.metadata?.artistId;
        const tier = session?.metadata?.tier;
        const subscriptionId = session.subscription;
        const customerId = session.customer;

        if (artistId && subscriptionId && typeof subscriptionId === 'string') {
          // Persist customer ID and then sync tier + (optional) fee bps from the Stripe Price metadata.
          await upsertArtist({
            id: artistId,
            stripeCustomerId: typeof customerId === 'string' ? customerId : null,
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: tier || 'free',
            subscriptionStatus: 'active',
          });

          await syncArtistSubscriptionFromStripe({
            artistId,
            subscriptionId,
            fallbackTier: tier,
          });

          console.log('✅ Artist subscription activated + synced', { artistId, tier, subscriptionId });
        }
      }
    }

    // Keep subscription status/tier accurate (plan changes, cancellations, payment failures, etc.)
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const subscriptionId = sub?.id;
      const artistId = sub?.metadata?.artistId;

      if (artistId && subscriptionId) {
        // If your Billing setup attaches artistId to the subscription metadata, this just works.
        await syncArtistSubscriptionFromStripe({
          artistId,
          subscriptionId,
          fallbackTier: sub?.metadata?.tier,
        });
        console.log('✅ Artist subscription updated', { artistId, subscriptionId, status: sub?.status });
      }
    }

    // TODO (day-one recommended): handle refunds/disputes
    // - charge.refunded: reverse transfers (transfer reversals)
    // - charge.dispute.created: flag order and pause payouts if needed

    await markEventProcessed(event.id, event.type);
    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).send('Webhook handler failed');
  }
});

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

// -----------------------------
// Helpers
// -----------------------------
async function getSupabaseUserFromRequest(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

function requireAuthInProduction(req, res) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  if (!isProd) return true;
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
    return false;
  }
  return true;
}

async function requireArtist(req, res) {
  if (!requireAuthInProduction(req, res)) return null;

  const authUser = await getSupabaseUserFromRequest(req);
  const authRole = authUser?.user_metadata?.role;

  // Preferred path: Supabase JWT
  if (authUser) {
    if (authRole !== 'artist') {
      res.status(403).json({ error: 'Forbidden: artist role required' });
      return null;
    }
    const artistId = authUser.id;
    const artist = await getArtist(artistId);
    if (!artist) {
      const email = authUser.email || 'unknown@artist.local';
      const name = authUser.user_metadata?.name || 'Artist';
      return await upsertArtist({ id: artistId, email, name, role: 'artist' });
    }
    return artist;
  }

  // Dev-only fallback: x-artist-id / artistId
  const artistId = req.body?.artistId || req.query?.artistId || req.headers['x-artist-id'];
  if (!artistId || typeof artistId !== 'string') {
    res.status(401).json({ error: 'Missing Authorization bearer token' });
    return null;
  }
  const artist = await getArtist(artistId);
  if (!artist) {
    const email = req.body?.email || 'unknown@artist.local';
    const name = req.body?.name || 'Artist';
    return await upsertArtist({ id: artistId, email, name, role: 'artist' });
  }
  return artist;
}

async function requireVenue(req, res) {
  if (!requireAuthInProduction(req, res)) return null;

  const authUser = await getSupabaseUserFromRequest(req);
  const authRole = authUser?.user_metadata?.role;

  // Preferred path: Supabase JWT
  if (authUser) {
    if (authRole !== 'venue') {
      res.status(403).json({ error: 'Forbidden: venue role required' });
      return null;
    }
    const venueId = authUser.id;
    const venue = await getVenue(venueId);
    if (!venue) {
      const email = authUser.email || 'unknown@venue.local';
      const name = authUser.user_metadata?.name || 'Venue';
      const type = authUser.user_metadata?.type || null;
      const defaultVenueFeeBps = 1000;
      return await upsertVenue({ id: venueId, email, name, type, defaultVenueFeeBps });
    }
    return venue;
  }

  // Dev-only fallback: x-venue-id / venueId
  const venueId = req.body?.venueId || req.query?.venueId || req.headers['x-venue-id'];
  if (!venueId || typeof venueId !== 'string') {
    res.status(401).json({ error: 'Missing Authorization bearer token' });
    return null;
  }
  const venue = await getVenue(venueId);
  if (!venue) {
    const email = req.body?.email || 'unknown@venue.local';
    const name = req.body?.name || 'Venue';
    const defaultVenueFeeBps = Number(req.body?.defaultVenueFeeBps ?? 1000);
    return await upsertVenue({ id: venueId, email, name, defaultVenueFeeBps });
  }
  return venue;
}

function bpsToAmount(amountCents, bps) {
  return Math.round((amountCents * Number(bps)) / 10000);
}

function getPlatformFeeBpsForArtist(artist) {
  // Fee varies by artist subscription tier. Defaults are sensible but override via env.
  const tier = (artist?.subscriptionTier || 'free').toLowerCase();

  // If subscription isn't active, treat as free.
  const isActive = artist?.subscriptionStatus === 'active';
  if (!isActive) return Number(process.env.FEE_BPS_FREE || 2000);

  // If we persisted a fee override (e.g., from Stripe price metadata), prefer that.
  // This lets you match whatever is published on artwalls.space without redeploying.
  if (Number.isFinite(Number(artist?.platformFeeBps)) && Number(artist.platformFeeBps) >= 0) {
    return Number(artist.platformFeeBps);
  }

  const defaults = {
    free: Number(process.env.FEE_BPS_FREE || 2000),
    starter: Number(process.env.FEE_BPS_STARTER || 1500),
    pro: Number(process.env.FEE_BPS_PRO || 1000),
    elite: Number(process.env.FEE_BPS_ELITE || 500),
  };

  return defaults[tier] ?? defaults.free;
}

async function syncArtistSubscriptionFromStripe({ artistId, subscriptionId, fallbackTier }) {
  if (!artistId || !subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  // Single-plan assumption for day-one.
  const item = sub.items?.data?.[0];
  const price = item?.price;

  const tierFromPrice = String(price?.metadata?.tier || fallbackTier || 'free').toLowerCase();

  // Optional: define this on the Stripe Price (Billing) object so you don't hardcode.
  const feeBpsRaw = price?.metadata?.platform_fee_bps || price?.metadata?.fee_bps;
  const feeBps = Number(feeBpsRaw);

  await upsertArtist({
    id: artistId,
    stripeSubscriptionId: subscriptionId,
    subscriptionTier: tierFromPrice,
    subscriptionStatus: sub.status === 'active' ? 'active' : sub.status,
    platformFeeBps: Number.isFinite(feeBps) ? feeBps : undefined,
  });
}

async function assertPayoutReady(accountId, label) {
  const acc = await stripe.accounts.retrieve(accountId);
  if (!acc.payouts_enabled) {
    throw new Error(`${label} payouts not enabled yet (complete Stripe onboarding)`);
  }
}

// -----------------------------
// Connect: Artist onboarding
// -----------------------------
app.post('/api/stripe/connect/artist/create-account', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    if (artist.stripeAccountId) {
      return res.json({ accountId: artist.stripeAccountId, alreadyExists: true });
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: artist.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { artistId: artist.id },
    });

    await upsertArtist({ id: artist.id, email: artist.email, name: artist.name, role: 'artist', stripeAccountId: account.id });
    return res.json({ accountId: account.id, alreadyExists: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe Connect error' });
  }
});

app.post('/api/stripe/connect/artist/account-link', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    if (!artist.stripeAccountId) {
      return res.status(400).json({ error: 'Artist has no stripeAccountId yet. Call /create-account first.' });
    }

    const refresh_url = process.env.CONNECT_REFRESH_URL || `${APP_URL}/#/artist-dashboard`;
    const return_url = process.env.CONNECT_RETURN_URL || `${APP_URL}/#/artist-dashboard`;

    const link = await stripe.accountLinks.create({
      account: artist.stripeAccountId,
      refresh_url,
      return_url,
      type: 'account_onboarding',
    });

    return res.json({ url: link.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe account link error' });
  }
});

app.post('/api/stripe/connect/artist/login-link', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    if (!artist.stripeAccountId) {
      return res.status(400).json({ error: 'Artist has no stripeAccountId yet.' });
    }

    const loginLink = await stripe.accounts.createLoginLink(artist.stripeAccountId);
    return res.json({ url: loginLink.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe login link error' });
  }
});

app.get('/api/stripe/connect/artist/status', async (req, res) => {
  try {
    const artistId = req.query?.artistId;
    if (!artistId || typeof artistId !== 'string') return res.status(400).json({ error: 'Missing artistId' });

    const artist = await getArtist(artistId);
    if (!artist?.stripeAccountId) return res.json({ hasAccount: false });

    const account = await stripe.accounts.retrieve(artist.stripeAccountId);
    return res.json({
      hasAccount: true,
      accountId: artist.stripeAccountId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe status error' });
  }
});

// -----------------------------
// Connect: Venue onboarding
// -----------------------------
app.post('/api/stripe/connect/venue/create-account', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;

    if (venue.stripeAccountId) {
      return res.json({ accountId: venue.stripeAccountId, alreadyExists: true });
    }

    const account = await stripe.accounts.create({
      type: 'express',
      email: venue.email || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      metadata: { venueId: venue.id },
    });

    await upsertVenue({ id: venue.id, email: venue.email, name: venue.name, stripeAccountId: account.id, defaultVenueFeeBps: venue.defaultVenueFeeBps });
    return res.json({ accountId: account.id, alreadyExists: false });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe Connect error' });
  }
});

app.post('/api/stripe/connect/venue/account-link', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;

    if (!venue.stripeAccountId) {
      return res.status(400).json({ error: 'Venue has no stripeAccountId yet. Call /create-account first.' });
    }

    const refresh_url = process.env.CONNECT_REFRESH_URL || `${APP_URL}/#/venue-dashboard`;
    const return_url = process.env.CONNECT_RETURN_URL || `${APP_URL}/#/venue-dashboard`;

    const link = await stripe.accountLinks.create({
      account: venue.stripeAccountId,
      refresh_url,
      return_url,
      type: 'account_onboarding',
    });

    return res.json({ url: link.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe account link error' });
  }
});

app.post('/api/stripe/connect/venue/login-link', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;

    if (!venue.stripeAccountId) {
      return res.status(400).json({ error: 'Venue has no stripeAccountId yet.' });
    }

    const loginLink = await stripe.accounts.createLoginLink(venue.stripeAccountId);
    return res.json({ url: loginLink.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe login link error' });
  }
});

app.get('/api/stripe/connect/venue/status', async (req, res) => {
  try {
    const venueId = req.query?.venueId;
    if (!venueId || typeof venueId !== 'string') return res.status(400).json({ error: 'Missing venueId' });

    const venue = await getVenue(venueId);
    if (!venue?.stripeAccountId) return res.json({ hasAccount: false });

    const account = await stripe.accounts.retrieve(venue.stripeAccountId);
    return res.json({
      hasAccount: true,
      accountId: venue.stripeAccountId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      requirements: account.requirements,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe status error' });
  }
});

// -----------------------------
// Venues (simple listing)
// -----------------------------
app.get('/api/venues', async (_req, res) => {
  return res.json(await listVenues());
});

app.post('/api/venues', async (req, res) => {
  try {
    // In production, require Authorization and derive venueId from Supabase JWT.
    // In dev, allow explicit venueId for convenience.
    const authUser = await getSupabaseUserFromRequest(req);
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      if (!authUser) return res.status(401).json({ error: 'Missing or invalid Authorization bearer token' });
      if (authUser.user_metadata?.role !== 'venue') {
        return res.status(403).json({ error: 'Forbidden: venue role required' });
      }
    }

    const { venueId: bodyVenueId, email, name, defaultVenueFeeBps, type } = req.body || {};
    const venueId = authUser?.id || bodyVenueId;
    if (!venueId || typeof venueId !== 'string') return res.status(400).json({ error: 'Missing venueId' });

    const venue = await upsertVenue({
      id: venueId,
      email: email || authUser?.email || undefined,
      name: name || authUser?.user_metadata?.name || undefined,
      type: type || undefined,
      defaultVenueFeeBps,
    });
    return res.json(venue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Venue upsert error' });
  }
});

// -----------------------------
// Artists (simple listing)
// -----------------------------
app.get('/api/artists', async (_req, res) => {
  return res.json(await listArtists());
});

app.post('/api/artists', async (req, res) => {
  try {
    // In production, require Authorization and derive artistId from Supabase JWT.
    // In dev, allow explicit artistId for convenience.
    const authUser = await getSupabaseUserFromRequest(req);
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      if (!authUser) return res.status(401).json({ error: 'Missing or invalid Authorization bearer token' });
      if (authUser.user_metadata?.role !== 'artist') {
        return res.status(403).json({ error: 'Forbidden: artist role required' });
      }
    }

    const { artistId: bodyArtistId, email, name } = req.body || {};
    const artistId = authUser?.id || bodyArtistId;
    if (!artistId || typeof artistId !== 'string') return res.status(400).json({ error: 'Missing artistId' });

    const artist = await upsertArtist({
      id: artistId,
      email: email || authUser?.email || undefined,
      name: name || authUser?.user_metadata?.name || undefined,
      role: 'artist',
    });
    return res.json(artist);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Artist upsert error' });
  }
});

// -----------------------------
// Wallspaces per venue
// -----------------------------
app.get('/api/venues/:id/wallspaces', async (req, res) => {
  try {
    const venueId = req.params.id;
    if (!venueId) return res.status(400).json({ error: 'Missing venueId' });
    const items = await listWallspacesByVenue(venueId);
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'List wallspaces error' });
  }
});

app.post('/api/venues/:id/wallspaces', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;

    const venueIdParam = req.params.id;
    if (venueIdParam !== venue.id) {
      return res.status(403).json({ error: 'Forbidden: can only create wallspaces for your venue' });
    }

    const { name, width, height, description, photos } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Missing wallspace name' });

    const item = await createWallspace({
      id: crypto.randomUUID(),
      venueId: venue.id,
      name,
      width,
      height,
      description,
      available: true,
      photos,
    });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Create wallspace error' });
  }
});

app.patch('/api/wallspaces/:id', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;

    const wallspaceId = req.params.id;
    const patch = req.body || {};
    const updated = await updateWallspace(wallspaceId, patch);
    // Optional: ensure the wallspace belongs to the venue (could add check in DB layer)
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Update wallspace error' });
  }
});

app.delete('/api/wallspaces/:id', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;
    const wallspaceId = req.params.id;
    await deleteWallspace(wallspaceId);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Delete wallspace error' });
  }
});

// -----------------------------
// Billing: artist subscription tiers
// -----------------------------
const SUB_PRICE_IDS = {
  starter: process.env.STRIPE_SUB_PRICE_STARTER,
  growth: process.env.STRIPE_SUB_PRICE_GROWTH,
  pro: process.env.STRIPE_SUB_PRICE_PRO,
  elite: process.env.STRIPE_SUB_PRICE_ELITE,
};

app.post('/api/stripe/billing/create-subscription-session', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    const tier = String(req.body?.tier || '').toLowerCase();
    const priceId = SUB_PRICE_IDS[tier];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid tier or missing STRIPE_SUB_PRICE_* env for that tier' });
    }

    let customerId = artist.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: artist.email || undefined,
        name: artist.name || undefined,
        metadata: { artistId: artist.id },
      });
      customerId = customer.id;
      await upsertArtist({ id: artist.id, stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: SUB_SUCCESS_URL,
      cancel_url: SUB_CANCEL_URL,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { artistId: artist.id, tier },
      // Also stamp the Stripe Subscription object so future subscription.* webhooks can locate the artist.
      subscription_data: {
        metadata: { artistId: artist.id, tier },
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Subscription session error' });
  }
});

// -----------------------------
// Artworks: listing + automatic Product/Price
// -----------------------------
app.post('/api/artworks', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    const { title, description, price, currency = 'usd', imageUrl, venueId, venueFeeBps } = req.body || {};

    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Missing title' });
    if (!description || typeof description !== 'string') return res.status(400).json({ error: 'Missing description' });

    const priceNumber = Number(price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) return res.status(400).json({ error: 'Invalid price' });

    if (!venueId || typeof venueId !== 'string') return res.status(400).json({ error: 'Missing venueId' });

    const venue = await getVenue(venueId);
    if (!venue) return res.status(400).json({ error: 'Venue not found. Create/onboard the venue first.' });

    const artworkId = crypto.randomUUID();

    const product = await stripe.products.create({
      name: title,
      description,
      images: imageUrl ? [String(imageUrl)] : undefined,
      metadata: { artworkId, artistId: artist.id, venueId },
    });

    const unit_amount = Math.round(priceNumber * 100);
    const stripePrice = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount,
    });

    const resolvedVenueFeeBps = Number.isFinite(Number(venueFeeBps)) ? Number(venueFeeBps) : venue.defaultVenueFeeBps;

    const record = await createArtwork({
      id: artworkId,
      title,
      description,
      price: priceNumber,
      currency,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800',
      artistId: artist.id,
      artistName: artist.name || 'Artist',
      venueId,
      venueName: venue.name || 'Venue',
      venueFeeBps: resolvedVenueFeeBps,
      status: 'available',
      stripeProductId: product.id,
      stripePriceId: stripePrice.id,
    });

    return res.json(record);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Create artwork error' });
  }
});

app.get('/api/artworks', async (req, res) => {
  const artistId = req.query?.artistId;
  if (!artistId || typeof artistId !== 'string') {
    return res.status(400).json({ error: 'Missing artistId' });
  }
  const items = await listArtworksByArtist(artistId);
  return res.json(items);
});

app.get('/api/artworks/:id', async (req, res) => {
  const artwork = await getArtwork(req.params.id);
  if (!artwork) return res.status(404).json({ error: 'Not found' });
  return res.json(artwork);
});

// -----------------------------
// Checkout: Separate Charges + Transfers (artist + venue) + platform fee by tier
// -----------------------------
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  try {
    const { artworkId, buyerEmail } = req.body || {};
    if (!artworkId || typeof artworkId !== 'string') return res.status(400).json({ error: 'Missing artworkId' });

    const artwork = await getArtwork(artworkId);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    if (artwork.status === 'sold') return res.status(409).json({ error: 'Artwork already sold' });

    const artist = await getArtist(artwork.artistId);
    if (!artist?.stripeAccountId) return res.status(400).json({ error: 'Artist payouts not set up yet' });

    const venue = await getVenue(artwork.venueId);
    if (!venue?.stripeAccountId) return res.status(400).json({ error: 'Venue payouts not set up yet' });

    // Ensure both connected accounts are fully onboarded (payouts_enabled)
    await assertPayoutReady(artist.stripeAccountId, 'Artist');
    await assertPayoutReady(venue.stripeAccountId, 'Venue');

    const amountCents = Math.round(Number(artwork.price) * 100);

    const venueFeeBps = Number(artwork.venueFeeBps ?? venue.defaultVenueFeeBps ?? 1000);
    const platformFeeBps = getPlatformFeeBpsForArtist(artist);

    const venuePayoutCents = bpsToAmount(amountCents, venueFeeBps);
    const platformFeeCents = bpsToAmount(amountCents, platformFeeBps);
    const artistPayoutCents = amountCents - venuePayoutCents - platformFeeCents;

    if (artistPayoutCents < 0) {
      return res.status(400).json({
        error: 'Split configuration invalid (artist payout < 0). Check venue and platform fees.',
        details: { amountCents, venueFeeBps, platformFeeBps, venuePayoutCents, platformFeeCents, artistPayoutCents },
      });
    }

    const orderId = crypto.randomUUID();
    await createOrder({
      id: orderId,
      artworkId: artwork.id,
      artistId: artwork.artistId,
      venueId: artwork.venueId,
      amountCents,
      currency: artwork.currency || 'usd',
      buyerEmail: buyerEmail || null,
      status: 'created',
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      stripeChargeId: null,
      // store splits at time of sale for auditability
      platformFeeBps,
      venueFeeBps,
      platformFeeCents,
      venuePayoutCents,
      artistPayoutCents,
      transferIds: [],
    });

    // Important: for Separate Charges + Transfers, DO NOT set transfer_data or application_fee_amount.
    // We charge on the platform, then create multiple Transfers in the webhook.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: SUCCESS_URL,
      cancel_url: CANCEL_URL,
      customer_email: buyerEmail || undefined,
      line_items: [{ price: artwork.stripePriceId, quantity: 1 }],
      metadata: {
        orderId,
        artworkId: artwork.id,
        artistId: artwork.artistId,
        venueId: artwork.venueId,
      },
      payment_intent_data: {
        transfer_group: orderId,
        metadata: {
          orderId,
          artworkId: artwork.id,
          artistId: artwork.artistId,
          venueId: artwork.venueId,
        },
      },
    });

    await updateOrder(orderId, { stripeCheckoutSessionId: session.id });

    return res.json({
      url: session.url,
      splitPreview: {
        amountCents,
        platformFeeCents,
        venuePayoutCents,
        artistPayoutCents,
        platformFeeBps,
        venueFeeBps,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Stripe error' });
  }
});

// --- Health check ---
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Artwalls server running on http://localhost:${PORT}`);
});
