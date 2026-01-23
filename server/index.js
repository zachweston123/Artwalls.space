import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import https from 'https';
import fs from 'fs';

import { supabaseAdmin } from './supabaseClient.js';

import {
  upsertArtist,
  getArtist,
  listArtists,
  upsertVenue,
  getVenue,
  listVenues,
  createArtwork,
  updateArtwork,
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
  getVenueSchedule,
  upsertVenueSchedule,
  listBookingsByVenueBetween,
  createBooking,
  getBookingById,
  createNotification,
  listNotificationsForUser,
  markNotificationRead,
  createSupportMessage,
  listSupportMessages,
  getSupportMessage,
  updateSupportMessageStatus,
  getRecentMessageCountByIp,
} from './db.js';
import { sendIcsEmail } from './mail.js';

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

// Use self-signed certificate for local development
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

// Allow setting multiple origins via comma-separated env var
// Examples:
//   CORS_ORIGIN=https://artwalls.space
//   CORS_ORIGIN=https://artwalls.space,https://*.pages.dev
const rawCors = process.env.CORS_ORIGIN;
const CORS_ORIGIN = !rawCors
  ? true
  : rawCors.includes(',')
    ? rawCors.split(',').map(s => s.trim()).filter(Boolean)
    : rawCors;

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

// Middleware
const CORS_OPTIONS = {
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password', 'x-admin-secret', 'x-admin'],
};
app.use(cors(CORS_OPTIONS));
// Ensure preflight across all routes
app.options('*', cors(CORS_OPTIONS));
app.use(express.json({ limit: '2mb' }));

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

// Subscription checkout: start a recurring plan for the artist
app.post('/api/stripe/billing/create-subscription-session', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    const tier = req.body?.tier;
    const allowedTiers = ['starter', 'growth', 'pro'];
    if (!tier || !allowedTiers.includes(String(tier))) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    const normalizedTier = String(tier);

    // Support both old (STRIPE_SUB_PRICE_*) and new (STRIPE_PRICE_ID_*) env names
    const priceMap = {
      starter: process.env.STRIPE_PRICE_ID_STARTER || process.env.STRIPE_SUB_PRICE_STARTER,
      growth: process.env.STRIPE_PRICE_ID_GROWTH || process.env.STRIPE_SUB_PRICE_GROWTH,
      pro: process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_SUB_PRICE_PRO,
    };

    const priceId = priceMap[normalizedTier];
    if (!priceId) {
      console.error('Missing Stripe price ID for tier', normalizedTier);
      return res.status(500).json({ error: `Price ID not configured for ${normalizedTier}` });
    }

    // Ensure the artist has a Stripe customer record
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

    const successUrl = SUB_SUCCESS_URL || `${APP_URL}/#/artist-dashboard?sub=success`;
    const cancelUrl = SUB_CANCEL_URL || `${APP_URL}/#/artist-dashboard?sub=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // Omitting metadata entirely to avoid Stripe metadata validation issues.
      subscription_data: {},
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('create-subscription-session error', err);
    return res.status(500).json({ error: err?.message || 'Unable to start subscription checkout' });
  }
});

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

// Supabase connection test endpoint
app.get('/api/debug/supabase', async (_req, res) => {
  try {
    const rawUrl = process.env.SUPABASE_URL || '';
    const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
    
    // Show partial URL for debugging (hide sensitive parts)
    const urlPreview = cleanUrl ? cleanUrl.substring(0, 40) + '...' : 'MISSING';
    const keyPreview = rawKey ? `${rawKey.substring(0, 20)}...${rawKey.substring(rawKey.length - 10)}` : 'MISSING';
    
    // Test basic connection by querying a simple table
    const { data: artistsTest, error: artistsError } = await supabaseAdmin
      .from('artists')
      .select('id')
      .limit(1);

    const { data: venuesTest, error: venuesError } = await supabaseAdmin
      .from('venues')
      .select('id')
      .limit(1);

    return res.json({
      ok: !artistsError && !venuesError,
      config: {
        supabaseUrl: urlPreview,
        serviceRoleKey: keyPreview,
        urlValid: cleanUrl.includes('.supabase.co'),
        keyLength: rawKey.length,
      },
      artists: {
        ok: !artistsError,
        count: artistsTest?.length ?? 0,
        error: artistsError?.message || null,
        code: artistsError?.code || null,
        hint: artistsError?.hint || null,
        details: artistsError?.details || null,
      },
      venues: {
        ok: !venuesError,
        count: venuesTest?.length ?? 0,
        error: venuesError?.message || null,
        code: venuesError?.code || null,
        hint: venuesError?.hint || null,
        details: venuesError?.details || null,
      },
    });
  } catch (e) {
    return res.status(500).json({ 
      ok: false, 
      error: e?.message || 'Supabase test error',
      stack: process.env.NODE_ENV !== 'production' ? e?.stack : undefined,
    });
  }
});

// Profile provisioning: ensure an artist/venue row exists based on Supabase auth role
app.post('/api/profile/provision', async (req, res) => {
  try {
    const user = await getSupabaseUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Missing or invalid Authorization bearer token' });

    const role = (user.user_metadata?.role || 'artist').toLowerCase();
    const name = user.user_metadata?.name || null;
    const email = user.email || null;

    if (role === 'venue') {
      const type = user.user_metadata?.type || null;
      const defaultVenueFeeBps = 1000;
      const venue = await upsertVenue({ id: user.id, email, name, type, defaultVenueFeeBps });
      return res.json(venue);
    }

    const artist = await upsertArtist({ id: user.id, email, name, role: 'artist' });
    return res.json(artist);
  } catch (e) {
    console.error('profile provision error', e);
    return res.status(500).json({ error: e?.message || 'Provision failed' });
  }
});

// Root landing: help when visiting the domain directly
app.get('/', (_req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(JSON.stringify({
    ok: true,
    name: 'Artwalls API',
    docs: '/api/health',
  }));
});

// -----------------------------
// Scheduling APIs
// -----------------------------

function dayNameToIndex(name) {
  const names = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const n = String(name || '').toLowerCase();
  return Math.max(0, names.indexOf(n));
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // start on Sunday
  const start = new Date(d);
  start.setDate(diff);
  start.setHours(0,0,0,0);
  return start;
}

function buildDateForWeekday(weekStart, weekdayIndex, timeHHmm) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weekdayIndex);
  const [hh, mm] = String(timeHHmm).split(':').map((v) => parseInt(v, 10));
  d.setHours(hh, mm || 0, 0, 0);
  return d;
}

app.get('/api/venues/:venueId/schedule', async (req, res) => {
  try {
    const venueId = req.params.venueId;
    const schedule = await getVenueSchedule(venueId);
    return res.json({ schedule });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to get schedule' });
  }
});

app.post('/api/venues/:venueId/schedule', async (req, res) => {
  try {
    const venue = await requireVenue(req, res);
    if (!venue) return;
    const venueId = req.params.venueId;
    if (venue.id !== venueId) return res.status(403).json({ error: 'Can only update your own schedule' });

    const { dayOfWeek, startTime, endTime, slotMinutes, timezone } = req.body || {};
    if (!dayOfWeek || !startTime || !endTime) return res.status(400).json({ error: 'Missing dayOfWeek/startTime/endTime' });
    const updated = await upsertVenueSchedule({ venueId, dayOfWeek, startTime, endTime, slotMinutes, timezone });
    return res.json({ schedule: updated });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to save schedule' });
  }
});

app.get('/api/venues/:venueId/availability', async (req, res) => {
  try {
    const venueId = req.params.venueId;
    const schedule = await getVenueSchedule(venueId);
    if (!schedule) return res.json({ slots: [], slotMinutes: 30, dayOfWeek: null, startTime: null, endTime: null });

    const weekStartParam = req.query.weekStart;
    const baseDate = weekStartParam ? new Date(String(weekStartParam)) : new Date();
    const weekStart = getWeekStart(baseDate);
    const weekdayIndex = dayNameToIndex(schedule.dayOfWeek);
    const dayStart = buildDateForWeekday(weekStart, weekdayIndex, schedule.startTime);
    const dayEnd = buildDateForWeekday(weekStart, weekdayIndex, schedule.endTime);

    // Fetch existing bookings overlapping this window
    const existing = await listBookingsByVenueBetween(venueId, dayStart.toISOString(), dayEnd.toISOString());

    // Generate slots by slotMinutes and filter out overlaps
    const slots = [];
    const slotMins = Number(schedule.slotMinutes || 30);
    let cursor = new Date(dayStart);
    while (cursor < dayEnd) {
      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotMins);
      if (slotEnd <= dayEnd) {
        const overlaps = existing.some(b => new Date(b.startAt) < slotEnd && new Date(b.endAt) > slotStart);
        if (!overlaps) slots.push(slotStart.toISOString());
      }
      cursor.setMinutes(cursor.getMinutes() + slotMins);
    }

    return res.json({
      slots,
      slotMinutes: slotMins,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      windowStart: dayStart.toISOString(),
      windowEnd: dayEnd.toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to get availability' });
  }
});

// Venue metrics (real data for dashboard)
app.get('/api/venues/:venueId/metrics', async (req, res) => {
  const venue = await requireVenue(req, res);
  if (!venue) return;

  const requestedVenueId = req.params.venueId;
  if (requestedVenueId && requestedVenueId !== venue.id) {
    return res.status(403).json({ error: 'Forbidden: can only view metrics for your venue' });
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Artworks linked to this venue
    const { data: artworks, error: artworksErr } = await supabaseAdmin
      .from('artworks')
      .select('id, artist_id')
      .eq('venue_id', venue.id);
    if (artworksErr) throw artworksErr;

    const totalArtworks = artworks?.length || 0;
    const activeArtists = new Set((artworks || []).map(a => a.artist_id).filter(Boolean)).size;

    // Revenue in current month for this venue
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('amount_cents')
      .eq('venue_id', venue.id)
      .gte('created_at', monthStart);
    if (ordersErr) throw ordersErr;

    const monthlyRevenueCents = (orders || []).reduce((sum, o) => sum + (o.amount_cents || 0), 0);

    const completionPercentage = venue.status === 'live'
      ? 100
      : venue.status === 'approved'
      ? 85
      : venue.status === 'pending_review'
      ? 75
      : 50;

    return res.json({
      metrics: {
        totalArtworks,
        activeArtists,
        monthlyRevenueCents,
        monthlyRevenue: monthlyRevenueCents / 100,
        completionPercentage,
      },
    });
  } catch (err) {
    console.error('[GET /api/venues/:venueId/metrics] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load venue metrics' });
  }
});

app.post('/api/venues/:venueId/bookings', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    const venueId = req.params.venueId;
    const { artworkId, type, startAt } = req.body || {};
    if (!type || !startAt) return res.status(400).json({ error: 'Missing type/startAt' });

    const schedule = await getVenueSchedule(venueId);
    if (!schedule) return res.status(400).json({ error: 'Venue has no schedule configured' });
    const slotMins = Number(schedule.slotMinutes || 30);
    const start = new Date(startAt);
    const end = new Date(startAt);
    end.setMinutes(end.getMinutes() + slotMins);

    // Verify within today's window
    const weekdayIndex = dayNameToIndex(schedule.dayOfWeek);
    const weekStart = getWeekStart(start);
    const dayStart = buildDateForWeekday(weekStart, weekdayIndex, schedule.startTime);
    const dayEnd = buildDateForWeekday(weekStart, weekdayIndex, schedule.endTime);
    if (!(start >= dayStart && end <= dayEnd)) return res.status(400).json({ error: 'Time outside venue window' });

    // Check overlap
    const overlaps = await listBookingsByVenueBetween(venueId, start.toISOString(), end.toISOString());
    if (overlaps.length > 0) return res.status(409).json({ error: 'Time slot already booked' });

    const booking = await createBooking({ venueId, artistId: artist.id, artworkId: artworkId ?? null, type, startAt: start.toISOString(), endAt: end.toISOString() });

    // Notifications for both parties
    try {
      const icsUrl = `${APP_URL}/api/bookings/${booking.id}/ics`;
      const gcalUrl = `${APP_URL}/api/bookings/${booking.id}/google`;
      await createNotification({ userId: artist.id, type: `${type}-scheduled`, title: `${type === 'install' ? 'Install' : 'Pickup'} scheduled`, message: `${new Date(start).toLocaleString()}\nICS: ${icsUrl}\nGoogle: ${gcalUrl}` });
      const venue = await getVenue(venueId);
      if (venue?.id) {
        await createNotification({ userId: venue.id, type: `${type}-scheduled`, title: `${type === 'install' ? 'Install' : 'Pickup'} scheduled`, message: `${new Date(start).toLocaleString()}\nICS: ${icsUrl}\nGoogle: ${gcalUrl}` });
      }

      // Email delivery with ICS (if SMTP configured)
      const summary = type === 'install' ? 'Artwork Install' : 'Artwork Pickup';
      const desc = `Artwalls ${summary.toLowerCase()} at venue ${venueId}`;
      const pad = (n) => String(n).padStart(2, '0');
      const toIcs = (d) => (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) + 'Z'
      );
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Artwalls//Scheduling//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${booking.id}@artwalls`,
        `DTSTAMP:${toIcs(new Date())}`,
        `DTSTART:${toIcs(start)}`,
        `DTEND:${toIcs(end)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      const whenText = new Date(start).toLocaleString();
      const baseText = `${summary} scheduled for ${whenText}.\nAdd to Google: ${gcalUrl}\nDownload ICS: ${icsUrl}`;
      if (artist?.email) {
        await sendIcsEmail({ to: artist.email, subject: `Artwalls: ${summary} scheduled`, text: baseText, ics, icsFilename: `artwalls-${booking.id}.ics` });
      }
      if (venue?.email) {
        await sendIcsEmail({ to: venue.email, subject: `Artwalls: ${summary} scheduled`, text: baseText, ics, icsFilename: `artwalls-${booking.id}.ics` });
      }
    } catch {}

    return res.json({ booking, links: { ics: `/api/bookings/${booking.id}/ics`, google: `/api/bookings/${booking.id}/google` } });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to create booking' });
  }
});

function toIcsDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z'
  );
}

app.get('/api/bookings/:id/ics', async (req, res) => {
  try {
    const id = req.params.id;
    const b = await getBookingById(id);
    if (!b) return res.status(404).send('Not found');
    const start = new Date(b.startAt);
    const end = new Date(b.endAt);
    const summary = b.type === 'install' ? 'Artwork Install' : 'Artwork Pickup';
    const desc = `Artwalls ${summary.toLowerCase()} at venue ${b.venueId}`;
    const uid = `${id}@artwalls`; 
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Artwalls//Scheduling//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="artwalls-${id}.ics"`);
    return res.send(ics);
  } catch (e) {
    return res.status(500).send('Failed to generate ICS');
  }
});

app.get('/api/bookings/:id/google', async (req, res) => {
  try {
    const id = req.params.id;
    const b = await getBookingById(id);
    if (!b) return res.status(404).send('Not found');
    const start = new Date(b.startAt);
    const end = new Date(b.endAt);
    const fmt = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) + 'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) + 'Z'
      );
    };
    const text = encodeURIComponent(b.type === 'install' ? 'Artwork Install' : 'Artwork Pickup');
    const details = encodeURIComponent('Artwalls booking');
    const dates = `${fmt(start)}/${fmt(end)}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}`;
    return res.redirect(url);
  } catch (e) {
    return res.status(500).send('Failed to build Google Calendar URL');
  }
});

// Notifications APIs
app.get('/api/notifications', async (req, res) => {
  try {
    const user = await getSupabaseUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const list = await listNotificationsForUser(user.id, 100);
    return res.json({ notifications: list });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to list notifications' });
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    const user = await getSupabaseUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id;
    const updated = await markNotificationRead(id, user.id);
    return res.json({ notification: updated });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to mark read' });
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
    
    // QR code can only be generated for approved artworks
    if (art.approval_status !== 'approved') {
      return res.status(403).json({ 
        error: 'QR code can only be generated for approved artworks',
        status: art.approval_status 
      });
    }
    
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
    
    // QR code can only be generated for approved artworks
    if (art.approval_status !== 'approved') {
      return res.status(403).json({ 
        error: 'QR code can only be generated for approved artworks',
        status: art.approval_status 
      });
    }
    
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
    
    // QR code can only be generated for approved artworks
    if (art.approval_status !== 'approved') {
      return res.status(403).json({ 
        error: 'QR code can only be generated for approved artworks',
        status: art.approval_status 
      });
    }
    
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
  if (!authHeader || typeof authHeader !== 'string') {
    console.log('[getSupabaseUserFromRequest] No authorization header');
    return null;
  }
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) {
    console.log('[getSupabaseUserFromRequest] Invalid bearer scheme or token');
    return null;
  }
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) {
    console.error('[getSupabaseUserFromRequest] Token verification failed:', error.message);
    return null;
  }
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

async function requireAdmin(req, res) {
  const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

  // Require Supabase JWT in production
  const authUser = await getSupabaseUserFromRequest(req);
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow via explicit admin role flag in user metadata
  const role = authUser.user_metadata?.role;
  const isAdminRole = role === 'admin' || authUser.user_metadata?.isAdmin === true;

  // Or allow via email allowlist (comma-separated)
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const isAllowlisted = !!(authUser.email && allowlist.includes(authUser.email.toLowerCase()));

  if (isAdminRole || isAllowlisted) {
    return authUser;
  }

  // In non-production, optionally accept a shared password or dev flag for convenience
  if (!isProd) {
    const header = req.headers['x-admin-password'] || req.headers['x-admin-secret'];
    const supplied = Array.isArray(header) ? header[0] : (header || '');
    const envPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
    // Development fallback only if environment variables not set
    const devFallback = !envPass ? 'StormBL26' : null;
    const effectivePass = envPass || devFallback;
    const q = req.query?.admin || req.headers['x-admin'];
    if ((supplied && effectivePass && supplied === effectivePass) || q === '1' || q === 'true') {
      return { id: 'admin-dev', email: authUser.email || null, user_metadata: { role: 'admin' } };
    }
  }

  res.status(403).json({ error: 'Admin access required' });
  return null;
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
    console.log('[requireVenue] Auth user found:', {
      id: authUser.id,
      email: authUser.email,
      role: authRole,
    });
    if (authRole !== 'venue') {
      console.error('[requireVenue] User is not a venue. Role:', authRole);
      res.status(403).json({ error: `Forbidden: venue role required (got "${authRole}")` });
      return null;
    }
    const venueId = authUser.id;
    const venue = await getVenue(venueId);
    if (!venue) {
      const email = authUser.email || 'unknown@venue.local';
      const name = authUser.user_metadata?.name || 'Venue';
      const type = authUser.user_metadata?.type || null;
      const defaultVenueFeeBps = 1000;
      console.log('[requireVenue] Creating new venue for:', venueId);
      return await upsertVenue({ id: venueId, email, name, type, defaultVenueFeeBps });
    }
    return venue;
  }

  // Dev-only fallback: x-venue-id / venueId
  const venueId = req.body?.venueId || req.query?.venueId || req.headers['x-venue-id'];
  if (!venueId || typeof venueId !== 'string') {
    console.error('[requireVenue] Missing Authorization bearer token or venue fallback');
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
  // NEW MODEL: Convert artist take-home % to basis points representation for legacy code
  // Takes home: Free=65%, Starter=80%, Growth=83%, Pro=85%
  // Venue: Always 15%
  // Platform = 1 - artist% - venue%
  // 
  // This function returns basis points for compatibility, but should be deprecated.
  // Prefer `getArtistTakeHomePct` from plans.js for new code.
  
  const tier = (artist?.subscriptionTier || 'free').toLowerCase();
  const isActive = artist?.subscriptionStatus === 'active';
  
  // NEW: If subscription is inactive, treat as free tier
  if (!isActive) {
    // Free: 65% artist + 15% venue = 80%, so platform gets 20% = 2000 bps
    return 2000;
  }

  // NEW: Mapping of take-home % to basis points
  // Formula: (1 - takeHome% - 15% venue) * 10000
  const takehomeToFeeBps = {
    free: 2000,      // 1 - 0.65 - 0.15 = 0.20 = 2000 bps
    starter: 500,    // 1 - 0.80 - 0.15 = 0.05 = 500 bps
    growth: 200,     // 1 - 0.83 - 0.15 = 0.02 = 200 bps
    pro: 0,          // 1 - 0.85 - 0.15 = 0.00 = 0 bps
  };

  return takehomeToFeeBps[tier] ?? 2500;
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
// Venues (simple listing with city-based filtering)
// -----------------------------
app.get('/api/venues', async (req, res) => {
  try {
    // Ensure Auth users are reflected in local table before listing
    await syncUsersFromSupabaseAuth();
    
    const { artistPrimaryCity, artistSecondaryCity } = req.query;
    let venues = await listVenues();
    
    // Filter by artist city if provided (50-mile radius filter)
    if (artistPrimaryCity || artistSecondaryCity) {
      const { isVenueNearArtist } = require('./distanceUtils.js');
      venues = venues.filter(venue => {
        const artistCities = {
          primary: artistPrimaryCity,
          secondary: artistSecondaryCity
        };
        return isVenueNearArtist(venue.city, artistCities, 50);
      });
    }
    
    return res.json(venues);
  } catch (err) {
    console.error('[GET /api/venues] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to list venues' });
  }
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

    const { venueId: bodyVenueId, email, name, defaultVenueFeeBps, type, labels, city, phoneNumber, bio } = req.body || {};
    const venueId = authUser?.id || bodyVenueId;
    if (!venueId || typeof venueId !== 'string') return res.status(400).json({ error: 'Missing venueId' });

    // Update local store for basic fields
    const venue = await upsertVenue({
      id: venueId,
      email: email || authUser?.email || undefined,
      name: name || authUser?.user_metadata?.name || undefined,
      defaultVenueFeeBps,
    });

    // Update Supabase venues table with additional fields
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const { createClient } = await import('@supabase/supabase-js');
      const sbClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      
      const updateData = {
        id: venueId,
        suspended: false, // Always include this - it's NOT NULL in the database
        ...(name && { name }),
        ...(email && { email }),
        ...(type && { type }),
        ...(phoneNumber && { phone_number: phoneNumber }),
        ...(city && { city }),
        ...(bio && { bio }),
        ...(Array.isArray(labels) && { labels }),
      };
      
      const { error: updateErr } = await sbClient
        .from('venues')
        .upsert(updateData, { onConflict: 'id' });
      
      if (updateErr) {
        console.warn('Failed to update Supabase venues table:', updateErr);
        // Don't fail the entire request, just log the warning
      }
    }

    return res.json(venue);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Venue upsert error' });
  }
});

// -----------------------------
// Artists (simple listing with city-based filtering)
// -----------------------------
app.get('/api/artists', async (req, res) => {
  try {
    // Ensure Auth users are reflected in local table before listing
    await syncUsersFromSupabaseAuth();
    
    const { city: venueCity } = req.query;
    let artists = await listArtists();
    
    // Filter by venue city if provided (50-mile radius filter)
    if (venueCity) {
      const { isArtistNearVenue } = require('./distanceUtils.js');
      artists = artists.filter(artist => {
        const artistCities = {
          primary: artist.city_primary,
          secondary: artist.city_secondary
        };
        return isArtistNearVenue(artistCities, venueCity, 50);
      });
    }
    
    return res.json(artists);
  } catch (err) {
    console.error('[GET /api/artists] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to list artists' });
  }
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

    const { 
      artistId: bodyArtistId, 
      email, 
      name, 
      phoneNumber, 
      cityPrimary, 
      citySecondary, 
      subscriptionTier,
      bio,
      artTypes,
      instagramHandle,
      portfolioUrl
    } = req.body || {};
    const artistId = authUser?.id || bodyArtistId;
    if (!artistId || typeof artistId !== 'string') return res.status(400).json({ error: 'Missing artistId' });

    const artist = await upsertArtist({
      id: artistId,
      email: email || authUser?.email || undefined,
      name: name || authUser?.user_metadata?.name || undefined,
      role: 'artist',
      phoneNumber: phoneNumber ?? undefined,
      cityPrimary: cityPrimary ?? undefined,
      citySecondary: citySecondary ?? undefined,
      subscriptionTier: subscriptionTier ?? undefined,
      bio: bio ?? undefined,
      artTypes: artTypes ?? undefined,
      instagramHandle: instagramHandle ?? undefined,
      portfolioUrl: portfolioUrl ?? undefined,
    });
    return res.json(artist);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Artist upsert error' });
  }
});

// Artist Dashboard: comprehensive statistics
app.get('/api/stats/artist', async (req, res) => {
  try {
    const artistId = req.query?.artistId;
    if (!artistId || typeof artistId !== 'string') return res.status(400).json({ error: 'Missing artistId' });

    const artist = await getArtist(artistId);
    if (!artist) return res.status(404).json({ error: 'Artist not found' });

    // Get subscription info and plan limits
    const tier = (artist.subscriptionTier || 'free').toLowerCase();
    const isActive = artist.subscriptionStatus === 'active';
    const limits = getPlanLimitsForArtist(artist);

    const subscription = {
      tier,
      status: artist.subscriptionStatus || 'inactive',
      isActive,
      limits: {
        artworks: limits.artworks,
        activeDisplays: limits.activeDisplays,
      },
    };

    // Get artworks stats
    const artworks = await listArtworksByArtist(artistId);
    const artworkStats = {
      total: artworks?.length || 0,
      active: (artworks || []).filter(a => a.status === 'active').length,
      sold: (artworks || []).filter(a => a.status === 'sold').length,
      available: (artworks || []).filter(a => a.status === 'available').length,
    };

    // Get active displays (artworks assigned to venues and not sold)
    const activeDisplays = await countActiveDisplaysForArtist(artistId);
    const displays = {
      active: activeDisplays,
      limit: limits.activeDisplays,
      isOverage: activeDisplays > limits.activeDisplays,
    };

    // Get pending applications count
    const { data: applicationsData } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('artist_id', artistId)
      .eq('status', 'pending');
    const applications = {
      pending: applicationsData?.length || 0,
    };

    // Get sales stats (total sales and earnings)
    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('amount_cents, created_at')
      .eq('artist_id', artistId)
      .eq('status', 'completed');

    const totalEarnings = (ordersData || []).reduce((sum, o) => sum + (o.amount_cents || 0), 0);
    
    // Calculate recent 30 days sales
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent30DaysSales = (ordersData || []).filter(o => new Date(o.created_at) >= thirtyDaysAgo).length;

    const sales = {
      total: ordersData?.length || 0,
      recent30Days: recent30DaysSales,
      totalEarnings,
    };

    return res.json({
      artistId,
      subscription,
      artworks: artworkStats,
      displays,
      applications,
      sales,
    });
  } catch (err) {
    console.error('artist stats error', err);
    return res.status(500).json({ error: err?.message || 'Failed to load artist stats' });
  }
});

// Available wallspaces for discovery
app.get('/api/wallspaces/available', async (req, res) => {
  try {
    const { data: wallspaces } = await supabaseAdmin
      .from('wallspaces')
      .select('id')
      .eq('available', true);
    
    const total = wallspaces?.length || 0;
    return res.json({ total });
  } catch (err) {
    console.error('wallspaces available error', err);
    return res.status(500).json({ error: err?.message || 'Failed to count available wallspaces' });
  }
});

// Create HTTPS server
https.createServer(options, app).listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
