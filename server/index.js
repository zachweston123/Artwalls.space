import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import QRCode from 'qrcode';

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
  updateArtistStatus,
  updateVenueSuspended,
  getSettings,
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

// Purchase page URL for QR codes
function purchaseUrlForArtwork(artworkId) {
  return `${APP_URL}/#/purchase-${artworkId}`;
}

// Plan limits per tier (refer to Pricing page)
function getPlanLimitsForArtist(artist) {
  const tier = String(artist?.subscriptionTier || 'free').toLowerCase();
  const isActive = String(artist?.subscriptionStatus || '').toLowerCase() === 'active';
  const limits = {
    free: { artworks: 1, activeDisplays: 1 },
    starter: { artworks: 10, activeDisplays: 4 },
    growth: { artworks: 30, activeDisplays: 10 },
    pro: { artworks: Number.POSITIVE_INFINITY, activeDisplays: Number.POSITIVE_INFINITY },
  };
  const l = limits[tier] || limits.free;
  // If subscription not active, treat as free tier limits
  return isActive ? l : limits.free;
}

// Count "active displays": artworks by this artist assigned to a venue and not sold
async function countActiveDisplaysForArtist(artistId) {
  const list = await listArtworksByArtist(artistId);
  return (list || []).filter(a => a.venueId && a.status !== 'sold').length;
}

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
    await handleStripeWebhookEvent(event);
    await markEventProcessed(event.id, event.type);
    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).send('Webhook handler failed');
  }
});

// Billing Portal: manage subscription and payment methods
app.post('/api/stripe/billing/create-portal-session', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

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

    // Prefer settings.app_url if present, else APP_URL
    let returnUrl = APP_URL;
    try {
      const s = await getSettings();
      if (s?.appUrl) returnUrl = s.appUrl;
    } catch {}

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return res.json({ url: session.url });
  } catch (err) {
    console.error('billing portal error', err);
    return res.status(500).json({ error: err?.message || 'Billing portal error' });
  }
});
// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

// -----------------------------
// Health + Debug (no secrets)
// -----------------------------
app.get('/api/health', (_req, res) => {
  return res.json({ ok: true });
});

app.get('/api/debug/env', (_req, res) => {
  try {
    return res.json({
      ok: true,
      env: {
        nodeEnv: process.env.NODE_ENV || null,
        appUrl: APP_URL || null,
        corsOrigin: CORS_ORIGIN,
        stripe: {
          secretKey: !!process.env.STRIPE_SECRET_KEY,
          webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        },
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'debug error' });
  }
});
// -----------------------------
// QR Codes + Purchase URLs
// -----------------------------
app.get('/api/artworks/:id/purchase-url', async (req, res) => {
  const id = req.params.id;
  try {
    const art = await getArtwork(id);
    if (!art) return res.status(404).json({ error: 'Artwork not found' });
    return res.json({ url: purchaseUrlForArtwork(id) });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Unable to generate URL' });
  }
});

app.get('/api/artworks/:id/qrcode.svg', async (req, res) => {
  const id = req.params.id;
  try {
    const art = await getArtwork(id);
    if (!art) return res.status(404).send('Artwork not found');
    const url = purchaseUrlForArtwork(id);
    const width = Number(req.query.w) && Number(req.query.w) > 0 ? Number(req.query.w) : 512;
    const margin = Number(req.query.margin) && Number(req.query.margin) >= 0 ? Number(req.query.margin) : 1;
    const svgString = await QRCode.toString(url, { type: 'svg', margin, width });
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svgString);
  } catch (e) {
    console.error('QR code generation failed', e);
    return res.status(500).send('QR code generation failed');
  }
});

app.get('/api/artworks/:id/qrcode.png', async (req, res) => {
  const id = req.params.id;
  try {
    const art = await getArtwork(id);
    if (!art) return res.status(404).send('Artwork not found');
    const url = purchaseUrlForArtwork(id);
    const width = Number(req.query.w) && Number(req.query.w) > 0 ? Number(req.query.w) : 1024;
    const margin = Number(req.query.margin) && Number(req.query.margin) >= 0 ? Number(req.query.margin) : 1;
    const buf = await QRCode.toBuffer(url, { type: 'png', margin, width });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="artwork-'+id+'-qr.png"');
    return res.send(buf);
  } catch (e) {
    console.error('QR code PNG generation failed', e);
    return res.status(500).send('QR code PNG generation failed');
  }
});

app.get('/api/artworks/:id/qr-poster', async (req, res) => {
  const id = req.params.id;
  try {
    const art = await getArtwork(id);
    if (!art) return res.status(404).send('Artwork not found');
    const url = purchaseUrlForArtwork(id);
    const dataUrl = await QRCode.toDataURL(url, { type: 'image/png', margin: 1, width: 1024 });
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Artwork QR Poster</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { color-scheme: light; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 0; }
    .page { width: 8.5in; min-height: 11in; margin: 0 auto; padding: 0.75in; box-sizing: border-box; }
    .title { font-size: 36px; font-weight: 700; margin: 0 0 12px; }
    .subtitle { font-size: 18px; margin: 6px 0 18px; color: #555; }
    .qr { width: 6in; height: auto; display: block; margin: 16px auto; }
    .row { display: flex; gap: 24px; align-items: center; }
    .art { width: 2.5in; height: 2.5in; object-fit: cover; border: 2px solid #eee; border-radius: 12px; }
    .info { flex: 1; }
    .price { font-size: 28px; margin: 8px 0; }
    .btn { display:inline-block; margin-top: 16px; font-size: 16px; color: #007acc; text-decoration: none; }
    @media print {
      .btn { display: none; }
      .page { padding: 0.5in; }
    }
  </style>
  <script>function printPage(){window.print();}</script>
</head>
<body>
  <div class="page">
    <div class="row">
      <img class="art" src="${art.imageUrl || ''}" alt="Artwork image" />
      <div class="info">
        <div class="title">${art.title || 'Artwork'}</div>
        <div class="subtitle">by ${art.artistName || 'Artist'}${art.venueName ? ' • at '+art.venueName : ''}</div>
        <div class="price">${art.price != null ? '$'+art.price.toFixed(2) : ''}</div>
        <div class="subtitle">Scan to buy instantly</div>
      </div>
    </div>
    <img class="qr" src="${dataUrl}" alt="QR code to purchase" />
    <div class="subtitle" style="text-align:center">Or visit: ${url}</div>
    <p style="text-align:center"><a class="btn" href="#" onclick="printPage();return false;">Print</a></p>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e) {
    console.error('QR poster generation failed', e);
    return res.status(500).send('QR poster generation failed');
  }
});


// Webhook: forwarded from Cloudflare Worker (already signature-verified)
app.post('/api/stripe/webhook/forwarded', async (req, res) => {
  const event = req.body?.event;
  if (!event || !event.id || !event.type) return res.status(400).json({ error: 'Invalid forwarded event' });
  // Idempotency: Stripe may retry events
  if (await wasEventProcessed(event.id)) {
    return res.json({ received: true, duplicate: true });
  }
  try {
    await handleStripeWebhookEvent(event);
    await markEventProcessed(event.id, event.type);
    return res.json({ received: true });
  } catch (err) {
    console.error('Forwarded webhook handler error', err);
    return res.status(500).json({ error: 'Forwarded webhook handler failed' });
  }
});

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

// Sync Supabase Auth users into local artists/venues tables so discovery lists are up-to-date.
// This runs on-demand before listing endpoints and can also be called by admin.
async function syncUsersFromSupabaseAuth() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    const results = { artists: 0, venues: 0 };
    for (const u of users) {
      const role = (u.user_metadata?.role || '').toLowerCase();
      const name = u.user_metadata?.name || null;
      if (role === 'artist') {
        await upsertArtist({ id: u.id, email: u.email || null, name, role: 'artist' });
        results.artists += 1;
      } else if (role === 'venue') {
        await upsertVenue({ id: u.id, email: u.email || null, name, type: null, defaultVenueFeeBps: 1000 });
        results.venues += 1;
      } else {
        // Default backfill: treat unknown role as artist so they appear in discovery/admin
        await upsertArtist({ id: u.id, email: u.email || null, name, role: 'artist' });
        results.artists += 1;
      }
    }
    return results;
  } catch (err) {
    console.warn('syncUsersFromSupabaseAuth failed', err?.message || err);
    return { artists: 0, venues: 0, error: err?.message || String(err) };
  }
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

// Centralized handler so Cloudflare Worker can forward verified events
async function handleStripeWebhookEvent(event) {
  if (!event || !event.type) return;

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    if (session.mode === 'payment') {
      const orderId = session?.metadata?.orderId;
      const artworkId = session?.metadata?.artworkId;
      if (!orderId) throw new Error('Missing orderId in session metadata');

      const order = await findOrderById(orderId);
      if (!order) throw new Error(`Order not found: ${orderId}`);

      if (order.status !== 'paid') {
        const piId = session.payment_intent;
        if (!piId) throw new Error('Missing payment_intent on completed session');
        const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
        const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
        if (!chargeId) throw new Error('Missing latest_charge on PaymentIntent');

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

    if (session.mode === 'subscription') {
      const artistId = session?.metadata?.artistId;
      const tier = session?.metadata?.tier;
      const subscriptionId = session.subscription;
      const customerId = session.customer;

      if (artistId && subscriptionId && typeof subscriptionId === 'string') {
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

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const subscriptionId = sub?.id;
    const artistId = sub?.metadata?.artistId;
    if (artistId && subscriptionId) {
      await syncArtistSubscriptionFromStripe({
        artistId,
        subscriptionId,
        fallbackTier: sub?.metadata?.tier,
      });
      console.log('✅ Artist subscription updated', { artistId, subscriptionId, status: sub?.status });
    }
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
  // Ensure Auth users are reflected in local table before listing
  await syncUsersFromSupabaseAuth();
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

    const { venueId: bodyVenueId, email, name, defaultVenueFeeBps, type, labels } = req.body || {};
    const venueId = authUser?.id || bodyVenueId;
    if (!venueId || typeof venueId !== 'string') return res.status(400).json({ error: 'Missing venueId' });

    const venue = await upsertVenue({
      id: venueId,
      email: email || authUser?.email || undefined,
      name: name || authUser?.user_metadata?.name || undefined,
      type: type || undefined,
      labels: Array.isArray(labels) ? labels : undefined,
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
  // Ensure Auth users are reflected in local table before listing
  await syncUsersFromSupabaseAuth();
  return res.json(await listArtists());
});

// Fetch a single artist by id
app.get('/api/artists/:id', async (req, res) => {
  try {
    const artistId = req.params.id;
    if (!artistId) return res.status(400).json({ error: 'Missing artistId' });
    const artist = await getArtist(artistId);
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    return res.json(artist);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Get artist error' });
  }
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
// Admin: list/sync users from Supabase Auth
// -----------------------------
app.get('/api/admin/users', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const users = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email || null,
      name: (u.user_metadata?.name ?? null),
      role: (u.user_metadata?.role ?? null),
      createdAt: u.created_at,
    }));
    return res.json(users);
  } catch (err) {
    console.error('admin list users error', err);
    return res.status(500).json({ error: err?.message || 'Admin list users failed' });
  }
});

app.post('/api/admin/sync-users', async (_req, res) => {
  try {
    const results = await syncUsersFromSupabaseAuth();
    return res.json({ ok: true, ...results });
  } catch (err) {
    console.error('admin sync users error', err);
    return res.status(500).json({ error: err?.message || 'Admin sync users failed' });
  }
});

// Admin: suspend/activate users (artist or venue)
app.post('/api/admin/users/:id/suspend', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const artist = await getArtist(userId);
    if (artist) {
      const updated = await updateArtistStatus(userId, 'suspended');
      return res.json({ role: 'artist', user: updated });
    }

    const venue = await getVenue(userId);
    if (venue) {
      const updated = await updateVenueSuspended(userId, true);
      return res.json({ role: 'venue', user: updated });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (err) {
    console.error('admin suspend user error', err);
    return res.status(500).json({ error: err?.message || 'Admin suspend failed' });
  }
});

app.post('/api/admin/users/:id/activate', async (req, res) => {
  try {
    const userId = req.params.id;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    const artist = await getArtist(userId);
    if (artist) {
      const updated = await updateArtistStatus(userId, 'active');
      return res.json({ role: 'artist', user: updated });
    }

    const venue = await getVenue(userId);
    if (venue) {
      const updated = await updateVenueSuspended(userId, false);
      return res.json({ role: 'venue', user: updated });
    }

    return res.status(404).json({ error: 'User not found' });
  } catch (err) {
    console.error('admin activate user error', err);
    return res.status(500).json({ error: err?.message || 'Admin activate failed' });
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
    let priceId = SUB_PRICE_IDS[tier];
    if (!priceId) {
      // Fallback to settings table values if env not set
      try {
        const s = await getSettings();
        const fromSettings = {
          starter: s?.subPriceStarter,
          growth: s?.subPriceGrowth,
          pro: s?.subPricePro,
          elite: s?.subPriceElite,
        };
        priceId = fromSettings[tier];
      } catch {}
    }
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid tier or missing subscription price ID (env or settings)' });
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

    // Venue is optional: artists can create listings before a venue is assigned.
    let venue = null;
    if (venueId && typeof venueId === 'string') {
      venue = await getVenue(venueId);
      if (!venue) return res.status(400).json({ error: 'Venue not found. Create/onboard the venue first.' });
    }

    // Enforce plan artwork listing limits
    const limits = getPlanLimitsForArtist(artist);
    const existing = await listArtworksByArtist(artist.id);
    const activeOrPublishedCount = (existing || []).filter(a => a.status !== 'sold').length;
    if (Number.isFinite(limits.artworks) && activeOrPublishedCount >= limits.artworks) {
      return res.status(403).json({ error: `Artwork limit reached for your plan. Upgrade to add more listings.` });
    }

    // If assigning to a venue at creation, enforce active displays cap
    if (venue) {
      const activeDisplays = await countActiveDisplaysForArtist(artist.id);
      if (Number.isFinite(limits.activeDisplays) && activeDisplays >= limits.activeDisplays) {
        return res.status(403).json({ error: 'Active displays limit reached for your plan. Upgrade to place artwork at more venues.' });
      }
    }

    const artworkId = crypto.randomUUID();

    const product = await stripe.products.create({
      name: title,
      description,
      images: imageUrl ? [String(imageUrl)] : undefined,
      metadata: venue ? { artworkId, artistId: artist.id, venueId } : { artworkId, artistId: artist.id },
    });

    const unit_amount = Math.round(priceNumber * 100);
    const stripePrice = await stripe.prices.create({
      product: product.id,
      currency,
      unit_amount,
    });

    const resolvedVenueFeeBps = venue
      ? (Number.isFinite(Number(venueFeeBps)) ? Number(venueFeeBps) : venue.defaultVenueFeeBps)
      : null;

    const record = await createArtwork({
      id: artworkId,
      title,
      description,
      price: priceNumber,
      currency,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800',
      artistId: artist.id,
      artistName: artist.name || 'Artist',
      venueId: venue ? venueId : null,
      venueName: venue ? (venue.name || 'Venue') : null,
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

// Assign or change an artwork's venue with subscription cap enforcement
app.patch('/api/artworks/:id/assign-venue', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    const artworkId = req.params.id;
    const { venueId, venueFeeBps } = req.body || {};
    if (!venueId || typeof venueId !== 'string') return res.status(400).json({ error: 'Missing venueId' });

    const artwork = await getArtwork(artworkId);
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    if (artwork.artistId !== artist.id) return res.status(403).json({ error: 'Forbidden: can only assign your own artwork' });
    if (artwork.status === 'sold') return res.status(409).json({ error: 'Cannot assign a sold artwork' });

    const venue = await getVenue(venueId);
    if (!venue) return res.status(400).json({ error: 'Venue not found' });

    // Enforce active displays limit (ignore this artwork's current assignment when counting)
    const limits = getPlanLimitsForArtist(artist);
    const activeDisplays = await countActiveDisplaysForArtist(artist.id);
    const currentlyAssignedHere = Boolean(artwork.venueId);
    const projected = currentlyAssignedHere ? activeDisplays : activeDisplays + 1;
    if (Number.isFinite(limits.activeDisplays) && projected > limits.activeDisplays) {
      return res.status(403).json({ error: 'Active displays limit reached for your plan. Upgrade to place artwork at more venues.' });
    }

    const updated = await updateArtwork(artworkId, {
      venueId,
      venueName: venue.name || null,
      venueFeeBps: Number.isFinite(Number(venueFeeBps)) ? Number(venueFeeBps) : venue.defaultVenueFeeBps,
    });
    return res.json(updated);
  } catch (err) {
    console.error('assign-venue error', err);
    return res.status(500).json({ error: err?.message || 'Assign venue failed' });
  }
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
