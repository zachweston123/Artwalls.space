import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import https from 'https';
import fs from 'fs';

import { supabaseAdmin } from './supabaseClient.js';
import { generateTimeOptions } from '../shared/timeOptions.js';

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
  getArtistSetLimitInfo,
  createArtworkSetRecord,
  updateArtworkSetRecord,
  publishArtworkSetRecord,
  archiveArtworkSetRecord,
  addArtworkToSet,
  removeArtworkFromSet,
  reorderArtworkSetItems,
  listArtworkSetsByArtist,
  listPublishedArtworkSets,
  getArtworkSetWithItems,
  getArtworkSetPublic,
  recordVenueSetSelection,
  listVenueSetSelectionsForVenue,
  recordEvent,
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
  createVenueInvite,
  listVenueInvitesByArtist,
  getVenueInviteById,
  getVenueInviteByToken,
  updateVenueInvite,
  createVenueInviteEvent,
  countVenueInvitesByArtistSince,
  findRecentInviteForPlace,
  createNotification,
  listNotificationsForUser,
  markNotificationRead,
  createSupportMessage,
  listSupportMessages,
  getSupportMessage,
  updateSupportMessageStatus,
  getRecentMessageCountByIp,
} from './db.js';
import { sendIcsEmail, sendEmail } from './mail.js';
import { buildVerificationEmail } from './emails/verificationEmail.js';
import {
  generateInviteToken,
  isValidInviteToken,
  isStatusTransitionAllowed,
  statusAfterOpen,
  shouldBlockDuplicateInvite,
} from './venueInviteUtils.js';

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
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@artwalls.space';
const EMAIL_VERIFICATION_REDIRECT = process.env.EMAIL_VERIFICATION_REDIRECT || `${APP_URL}/verify-email`;
const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

const SUCCESS_URL = process.env.CHECKOUT_SUCCESS_URL || `${APP_URL}/#/purchase-success`;
const CANCEL_URL = process.env.CHECKOUT_CANCEL_URL || `${APP_URL}/#/purchase-cancel`;

const SUB_SUCCESS_URL = process.env.SUB_SUCCESS_URL || `${APP_URL}/#/artist-dashboard?sub=success`;
const SUB_CANCEL_URL = process.env.SUB_CANCEL_URL || `${APP_URL}/#/artist-dashboard?sub=cancel`;

const VENUE_INVITE_DAILY_LIMIT = Number(process.env.VENUE_INVITE_DAILY_LIMIT || 10);
const VENUE_INVITE_DUPLICATE_WINDOW_DAYS = Number(process.env.VENUE_INVITE_DUPLICATE_WINDOW_DAYS || 30);
const VENUE_INVITE_PUBLIC_RATE_LIMIT = Number(process.env.VENUE_INVITE_PUBLIC_RATE_LIMIT || 60);
const REFERRAL_DAILY_LIMIT = Number(process.env.REFERRAL_DAILY_LIMIT || 5);

const inviteRateLimitMap = new Map();
function rateLimitByIp(ip, limit, windowMs) {
  if (!ip) return { ok: true, remaining: limit };
  const now = Date.now();
  const entry = inviteRateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  inviteRateLimitMap.set(ip, entry);
  return { ok: entry.count <= limit, remaining: Math.max(limit - entry.count, 0), resetAt: entry.resetAt };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function generateReferralToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function buildReferralInviteEmail({ artistName, venueName, note, inviteLink }) {
  const safeArtist = artistName || 'An artist on Artwalls';
  const safeVenue = venueName || 'your venue';
  const safeNote = note ? `<p style="margin:0 0 12px;">${note}</p>` : '';
  const bullets = `
    <ul style="padding-left:18px;margin:12px 0;">
      <li>Feature rotating local art with zero inventory risk</li>
      <li>Attract new guests with fresh, curated artwork</li>
      <li>Set your commission and approve placements</li>
    </ul>
  `;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <p style="margin:0 0 12px;">${safeArtist} invited ${safeVenue} to join Artwalls.</p>
      ${safeNote}
      <p style="margin:0 0 12px;">Artwalls helps venues host local art and connect with nearby artists.</p>
      ${bullets}
      <p style="margin:18px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#2563eb;color:#fff;text-decoration:none;">Create Venue Account</a>
      </p>
      <p style="margin:0;color:#666;font-size:12px;">If you weren’t expecting this, you can ignore this email.</p>
    </div>
  `;
  const text = `${safeArtist} invited ${safeVenue} to join Artwalls.\n\n${note ? `${note}\n\n` : ''}Artwalls helps venues host local art and connect with nearby artists.\n\n- Feature rotating local art with zero inventory risk\n- Attract new guests with fresh, curated artwork\n- Set your commission and approve placements\n\nCreate Venue Account: ${inviteLink}\n\nIf you weren’t expecting this, you can ignore this email.`;
  return { html, text };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

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
  const proUntil = artist?.proUntil || artist?.pro_until || null;
  const hasProOverride = proUntil ? new Date(proUntil).getTime() > Date.now() : false;
  const tier = hasProOverride ? 'pro' : String(artist?.subscriptionTier || 'free').toLowerCase();
  const isActive = hasProOverride ? true : String(artist?.subscriptionStatus || '').toLowerCase() === 'active';
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
      metadata: {
        artistId: artist.id,
        tier: normalizedTier,
      },
      subscription_data: {
        metadata: {
          artistId: artist.id,
          tier: normalizedTier,
        },
      },
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

// Email verification sign-up flow (custom template)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, role, name, phone } = req.body || {};
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedPassword = typeof password === 'string' ? password : '';
    const requestedRole = role === 'venue' ? 'venue' : role === 'artist' ? 'artist' : null;

    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (!requestedRole) {
      return res.status(400).json({ error: 'A valid role is required.' });
    }

    const safeName = typeof name === 'string' ? name.trim() : '';
    const safePhone = typeof phone === 'string' ? phone.trim() : '';

    const metadata = {
      role: requestedRole,
      ...(safeName ? { name: safeName } : {}),
      ...(safePhone ? { phone: safePhone } : {}),
    };

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: trimmedEmail,
      password: trimmedPassword,
      email_confirm: false,
      user_metadata: metadata,
    });

    if (createErr) {
      const message = createErr.message || 'Unable to create user.';
      const normalized = message.toLowerCase();
      if (normalized.includes('already') && normalized.includes('registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      if (createErr.status === 422 || normalized.includes('password')) {
        return res.status(400).json({ error: message });
      }
      console.error('[POST /api/auth/signup] createUser error:', createErr);
      return res.status(500).json({ error: 'Unable to create user account.' });
    }

    const userId = created?.user?.id;
    if (!userId) {
      return res.status(500).json({ error: 'Supabase did not return a user ID.' });
    }

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'email_confirmation',
      email: trimmedEmail,
      options: {
        emailRedirectTo: EMAIL_VERIFICATION_REDIRECT,
      },
    });

    if (linkErr || !linkData?.action_link) {
      console.error('[POST /api/auth/signup] generateLink error:', linkErr || 'missing action_link');
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return res.status(500).json({ error: 'Unable to generate verification link.' });
    }

    const template = buildVerificationEmail({
      verifyUrl: linkData.action_link,
      email: trimmedEmail,
      name: safeName || created.user?.user_metadata?.name,
      role: requestedRole,
      supportEmail: SUPPORT_EMAIL,
    });

    const sendResult = await sendEmail({
      to: trimmedEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: {
        'X-Artwalls-Template': 'verification',
        'X-Artwalls-User': userId,
      },
    });

    if (sendResult.skipped) {
      if (isProduction) {
        await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
        return res.status(503).json({ error: 'Email delivery is not configured. Please try again later.' });
      }
      return res.status(202).json({
        ok: true,
        emailSent: false,
        emailSkipped: true,
        verificationUrl: linkData.action_link,
        message: 'Email sending is not configured. Use the link to verify your account while testing.',
      });
    }

    if (!sendResult.ok) {
      console.error('[POST /api/auth/signup] sendEmail error:', sendResult.error || sendResult.reason || 'unknown error');
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return res.status(500).json({ error: 'Unable to send verification email.' });
    }

    return res.status(201).json({
      ok: true,
      emailSent: true,
      message: 'Account created. Check your inbox for the verification email.',
    });
  } catch (err) {
    console.error('[POST /api/auth/signup] unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error creating account.' });
  }
});

// Resend verification email with branding
app.post('/api/auth/send-verification', async (req, res) => {
  try {
    const { email } = req.body || {};
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!trimmedEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const { data: userData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      email: trimmedEmail,
    });
    if (listErr) {
      console.error('[POST /api/auth/send-verification] listUsers error:', listErr);
    }

    const user = userData?.users?.[0];
    if (!user) {
      // Avoid leaking existence of accounts
      return res.json({ ok: true, emailSent: false });
    }

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'email_confirmation',
      email: trimmedEmail,
      options: {
        emailRedirectTo: EMAIL_VERIFICATION_REDIRECT,
      },
    });

    if (linkErr || !linkData?.action_link) {
      console.error('[POST /api/auth/send-verification] generateLink error:', linkErr || 'missing action_link');
      return res.status(500).json({ error: 'Unable to generate verification link.' });
    }

    const template = buildVerificationEmail({
      verifyUrl: linkData.action_link,
      email: trimmedEmail,
      name: user.user_metadata?.name,
      role: user.user_metadata?.role,
      supportEmail: SUPPORT_EMAIL,
    });

    const sendResult = await sendEmail({
      to: trimmedEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      headers: {
        'X-Artwalls-Template': 'verification',
        'X-Artwalls-User': user.id,
      },
    });

    if (sendResult.skipped) {
      return res.status(isProduction ? 503 : 202).json({
        ok: !isProduction,
        emailSent: false,
        emailSkipped: true,
        verificationUrl: isProduction ? undefined : linkData.action_link,
        message: isProduction
          ? 'Email delivery is not available right now.'
          : 'Email sending is not configured. Use the link to verify while testing.',
      });
    }

    if (!sendResult.ok) {
      console.error('[POST /api/auth/send-verification] sendEmail error:', sendResult.error || sendResult.reason || 'unknown error');
      return res.status(500).json({ error: 'Unable to send verification email.' });
    }

    return res.json({ ok: true, emailSent: true });
  } catch (err) {
    console.error('[POST /api/auth/send-verification] unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error resending verification email.' });
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
    const referralToken = String(req.body?.referralToken || '').trim();

    if (role === 'venue') {
      const type = user.user_metadata?.type || null;
      const defaultVenueFeeBps = 1000;
      const venue = await upsertVenue({ id: user.id, email, name, type, defaultVenueFeeBps });

      if (referralToken) {
        const { data: referral } = await supabaseAdmin
          .from('venue_referrals')
          .select('id,status,venue_id')
          .eq('token', referralToken)
          .maybeSingle();

        if (referral && !referral.venue_id) {
          const nowIso = new Date().toISOString();
          await supabaseAdmin
            .from('venues')
            .update({ referral_id: referral.id, updated_at: nowIso })
            .eq('id', user.id);

          const nextStatus = ['sent', 'opened'].includes(referral.status) ? 'venue_signed_up' : referral.status;
          await supabaseAdmin
            .from('venue_referrals')
            .update({ venue_id: user.id, status: nextStatus, updated_at: nowIso })
            .eq('id', referral.id);
        }
      }

      return res.json(venue);
    }

    const artist = await upsertArtist({ id: user.id, email, name, role: 'artist' });
    return res.json(artist);
  } catch (e) {
    console.error('profile provision error', e);
    return res.status(500).json({ error: e?.message || 'Provision failed' });
  }
});

// Profile: get current user profile (artist or venue)
app.get('/api/profile/me', async (req, res) => {
  try {
    const user = await getSupabaseUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Missing or invalid Authorization bearer token' });
    const role = (user.user_metadata?.role || 'artist').toLowerCase();

    if (role === 'venue') {
      const { data, error } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ role: 'venue', profile: data });
    }

    const { data, error } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const proUntil = data?.pro_until ? new Date(data.pro_until).getTime() : 0;
    const hasProOverride = proUntil && proUntil > Date.now();
    const profile = hasProOverride
      ? { ...data, subscription_tier: 'pro', subscription_status: 'active' }
      : data;

    return res.json({ role: 'artist', profile, proOverride: hasProOverride });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to load profile' });
  }
});

// Legacy profile endpoint used by some pages
app.get('/api/me', async (req, res) => {
  try {
    const user = await getSupabaseUserFromRequest(req);
    if (!user) return res.status(401).json({ error: 'Missing or invalid Authorization bearer token' });
    const role = (user.user_metadata?.role || 'artist').toLowerCase();

    if (role === 'venue') {
      const { data, error } = await supabaseAdmin.from('venues').select('*').eq('id', user.id).maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ role: 'venue', profile: data });
    }

    const { data, error } = await supabaseAdmin.from('artists').select('*').eq('id', user.id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    const proUntil = data?.pro_until ? new Date(data.pro_until).getTime() : 0;
    const hasProOverride = proUntil && proUntil > Date.now();
    const profile = hasProOverride
      ? { ...data, subscription_tier: 'pro', subscription_status: 'active' }
      : data;

    return res.json({ role: 'artist', profile, proOverride: hasProOverride });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to load profile' });
  }
});

// Artist → Venue Referrals (V1)
app.post('/api/referrals/create', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    const venueName = String(req.body?.venueName || '').trim();
    const venueEmail = String(req.body?.venueEmail || '').trim();
    const venueWebsite = req.body?.venueWebsite ? String(req.body.venueWebsite).trim() : null;
    const venueLocationText = req.body?.venueLocationText ? String(req.body.venueLocationText).trim() : null;
    const note = req.body?.note ? String(req.body.note).trim() : null;

    if (!venueName) return res.status(400).json({ error: 'Venue name is required.' });
    if (!venueEmail || !isValidEmail(venueEmail)) return res.status(400).json({ error: 'Valid venue email is required.' });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
      .from('venue_referrals')
      .select('id', { count: 'exact', head: true })
      .eq('artist_user_id', artist.id)
      .gte('created_at', since);
    if (countErr) return res.status(500).json({ error: countErr.message });
    if ((count || 0) >= REFERRAL_DAILY_LIMIT) {
      return res.status(429).json({ error: `Daily invite limit reached (${REFERRAL_DAILY_LIMIT}/day).` });
    }

    const token = generateReferralToken();
    const nowIso = new Date().toISOString();
    const { data: referral, error } = await supabaseAdmin
      .from('venue_referrals')
      .insert({
        artist_user_id: artist.id,
        venue_name: venueName,
        venue_email: venueEmail,
        venue_website: venueWebsite,
        venue_location_text: venueLocationText,
        note,
        token,
        status: 'sent',
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: error.message });

    const inviteLink = `${APP_URL}/venue/signup?ref=${encodeURIComponent(token)}`;
    const subject = `${artist.name || 'An artist'} invited you to host local art on Artwalls`;
    const email = buildReferralInviteEmail({
      artistName: artist.name || 'An artist on Artwalls',
      venueName,
      note,
      inviteLink,
    });

    const sendResult = await sendEmail({
      to: venueEmail,
      subject,
      html: email.html,
      text: email.text,
      headers: {
        'X-Artwalls-Template': 'artist-referral',
        'X-Artwalls-Referral': referral.id,
      },
    });

    if (sendResult?.skipped) {
      console.warn('[referrals] Email skipped - SMTP not configured');
    } else if (!sendResult?.ok) {
      console.error('[referrals] Email failed:', sendResult?.error || sendResult?.reason || 'unknown error');
    }

    return res.json({ referral, emailSent: !!sendResult?.ok, emailSkipped: !!sendResult?.skipped });
  } catch (err) {
    console.error('[POST /api/referrals/create] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to create referral' });
  }
});

app.get('/api/referrals', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    const { data, error } = await supabaseAdmin
      .from('venue_referrals')
      .select('*')
      .eq('artist_user_id', artist.id)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ referrals: data || [] });
  } catch (err) {
    console.error('[GET /api/referrals] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load referrals' });
  }
});

app.get('/api/referrals/token/:token', async (req, res) => {
  try {
    const token = String(req.params?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Missing referral token' });
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    const { data: referral, error } = await supabaseAdmin
      .from('venue_referrals')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!referral || referral.status === 'invalid') return res.status(404).json({ error: 'Referral not found' });

    const { data: artist } = await supabaseAdmin
      .from('artists')
      .select('id,name')
      .eq('id', referral.artist_user_id)
      .maybeSingle();

    return res.json({ referral, artist });
  } catch (err) {
    console.error('[GET /api/referrals/token] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load referral' });
  }
});

app.get('/api/admin/referrals', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    const status = req.query?.status ? String(req.query.status) : null;
    let query = supabaseAdmin
      .from('venue_referrals')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);

    const { data: referrals, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const artistIds = Array.from(new Set((referrals || []).map((r) => r.artist_user_id).filter(Boolean)));
    const venueIds = Array.from(new Set((referrals || []).map((r) => r.venue_id).filter(Boolean)));

    const [{ data: artists }, { data: venues }] = await Promise.all([
      artistIds.length
        ? supabaseAdmin.from('artists').select('id,name,email,pro_until').in('id', artistIds)
        : Promise.resolve({ data: [] }),
      venueIds.length
        ? supabaseAdmin.from('venues').select('id,name,email').in('id', venueIds)
        : Promise.resolve({ data: [] }),
    ]);

    const artistMap = new Map((artists || []).map((a) => [a.id, a]));
    const venueMap = new Map((venues || []).map((v) => [v.id, v]));

    const enriched = (referrals || []).map((r) => ({
      ...r,
      artist: artistMap.get(r.artist_user_id) || null,
      venue: r.venue_id ? venueMap.get(r.venue_id) || null : null,
    }));

    return res.json({ referrals: enriched });
  } catch (err) {
    console.error('[GET /api/admin/referrals] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load referrals' });
  }
});

app.post('/api/admin/referrals/grant', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    const referralId = String(req.body?.referralId || '').trim();
    if (!referralId) return res.status(400).json({ error: 'Missing referralId' });

    const { data: referral, error } = await supabaseAdmin
      .from('venue_referrals')
      .select('*')
      .eq('id', referralId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!referral) return res.status(404).json({ error: 'Referral not found' });

    if (referral.status !== 'qualified') {
      return res.status(400).json({ error: 'Referral must be qualified before granting reward.' });
    }

    const { data: artist, error: artistErr } = await supabaseAdmin
      .from('artists')
      .select('id,pro_until')
      .eq('id', referral.artist_user_id)
      .maybeSingle();
    if (artistErr) return res.status(500).json({ error: artistErr.message });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });

    const now = new Date();
    const base = artist.pro_until && new Date(artist.pro_until) > now ? new Date(artist.pro_until) : now;
    const newProUntil = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nowIso = now.toISOString();

    await supabaseAdmin
      .from('artists')
      .update({ pro_until: newProUntil.toISOString(), updated_at: nowIso })
      .eq('id', artist.id);

    await supabaseAdmin
      .from('venue_referrals')
      .update({ status: 'reward_granted', updated_at: nowIso })
      .eq('id', referral.id);

    await supabaseAdmin
      .from('referral_rewards')
      .insert({
        referral_id: referral.id,
        artist_user_id: referral.artist_user_id,
        reward_type: 'ONE_MONTH_PRO',
        granted_by_admin_id: isUuid(admin.id) ? admin.id : null,
        granted_at: nowIso,
      });

    return res.json({ ok: true, pro_until: newProUntil.toISOString() });
  } catch (err) {
    console.error('[POST /api/admin/referrals/grant] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to grant reward' });
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

    const { dayOfWeek, startTime, endTime, slotMinutes, installSlotIntervalMinutes, timezone } = req.body || {};
    if (!dayOfWeek || !startTime || !endTime) return res.status(400).json({ error: 'Missing dayOfWeek/startTime/endTime' });

    const interval = Number(installSlotIntervalMinutes ?? slotMinutes ?? 60);
    const allowedIntervals = new Set([15, 30, 60, 120]);
    if (!Number.isFinite(interval) || interval <= 0 || !allowedIntervals.has(interval)) {
      return res.status(400).json({ error: 'Invalid slot interval. Allowed: 15, 30, 60, 120 minutes.' });
    }

    const updated = await upsertVenueSchedule({
      venueId,
      dayOfWeek,
      startTime,
      endTime,
      slotMinutes: interval,
      installSlotIntervalMinutes: interval,
      timezone,
    });
    return res.json({ schedule: updated });
  } catch (e) {
    return res.status(500).json({ error: e?.message || 'Failed to save schedule' });
  }
});

app.get('/api/venues/:venueId/availability', async (req, res) => {
  try {
    const venueId = req.params.venueId;
    const schedule = await getVenueSchedule(venueId);
    if (!schedule) return res.json({ slots: [], slotMinutes: 60, slotIntervalMinutes: 60, dayOfWeek: null, startTime: null, endTime: null });

    const weekStartParam = req.query.weekStart;
    const baseDate = weekStartParam ? new Date(String(weekStartParam)) : new Date();
    const weekStart = getWeekStart(baseDate);
    const weekdayIndex = dayNameToIndex(schedule.dayOfWeek);
    const dayStart = buildDateForWeekday(weekStart, weekdayIndex, schedule.startTime);
    const dayEnd = buildDateForWeekday(weekStart, weekdayIndex, schedule.endTime);

    // Fetch existing bookings overlapping this window
    const existing = await listBookingsByVenueBetween(venueId, dayStart.toISOString(), dayEnd.toISOString());

    const slotMins = Number(schedule.installSlotIntervalMinutes ?? schedule.slotMinutes ?? 60);
    const generatedSlots = generateTimeOptions({ startTime: dayStart, endTime: dayEnd, intervalMinutes: slotMins });

    const slots = generatedSlots
      .map((opt) => opt.value)
      .filter((slotIso) => {
        const slotStart = new Date(slotIso);
        const slotEnd = new Date(slotStart.getTime() + slotMins * 60 * 1000);
        const overlaps = existing.some((b) => new Date(b.startAt) < slotEnd && new Date(b.endAt) > slotStart);
        return !overlaps && slotEnd <= dayEnd;
      });

    return res.json({
      slots,
      slotMinutes: slotMins,
      slotIntervalMinutes: slotMins,
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

// Public: list wallspaces for a venue (used by artist-facing venue view)
app.get('/api/venues/:venueId/wallspaces', async (req, res) => {
  try {
    const venueId = req.params.venueId;
    if (!venueId) return res.status(400).json({ error: 'Missing venueId' });

    const wallspaces = await listWallspacesByVenue(venueId);
    const items = (wallspaces || []).map((w) => ({
      id: w.id,
      name: w.name,
      width: typeof w.width === 'number' ? w.width : undefined,
      height: typeof w.height === 'number' ? w.height : undefined,
      available: Boolean(w.available),
      description: w.description || undefined,
      photos: Array.isArray(w.photos) ? w.photos : [],
    }));

    return res.json(items);
  } catch (err) {
    console.error('[GET /api/venues/:venueId/wallspaces] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to list wallspaces' });
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
    const slotMins = Number(schedule.installSlotIntervalMinutes ?? schedule.slotMinutes ?? 60);
    const start = new Date(startAt);
    const end = new Date(startAt);
    end.setMinutes(end.getMinutes() + slotMins);

    // Verify within today's window
    const weekdayIndex = dayNameToIndex(schedule.dayOfWeek);
    const weekStart = getWeekStart(start);
    const dayStart = buildDateForWeekday(weekStart, weekdayIndex, schedule.startTime);
    const dayEnd = buildDateForWeekday(weekStart, weekdayIndex, schedule.endTime);
    if (!(start >= dayStart && end <= dayEnd)) return res.status(400).json({ error: 'Time outside venue window' });

    // Verify selection aligns to generated options (guards against stale intervals)
    const validSlots = generateTimeOptions({ startTime: dayStart, endTime: dayEnd, intervalMinutes: slotMins });
    const isAligned = validSlots.some((opt) => new Date(opt.value).getTime() === start.getTime());
    if (!isAligned) return res.status(400).json({ error: 'Selected time is no longer available. Please pick another slot.' });

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
// Venue Invites (Warm Intro)
// -----------------------------
app.post('/api/venue-invites', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;

    const authUser = await getSupabaseUserFromRequest(req);
    const emailVerified = !!(authUser?.email_confirmed_at || authUser?.confirmed_at);
    if (!emailVerified) {
      return res.status(403).json({ error: 'Email verification required to send invites.' });
    }

    const {
      placeId,
      venueName,
      venueAddress,
      googleMapsUrl,
      websiteUrl,
      phone,
      venueEmail,
      personalLine,
      subject,
      bodyTemplateVersion,
    } = req.body || {};

    const cleanPlaceId = String(placeId || '').trim();
    const cleanName = String(venueName || '').trim();
    if (!cleanPlaceId) return res.status(400).json({ error: 'Missing placeId' });
    if (!cleanName) return res.status(400).json({ error: 'Missing venueName' });

    const nowIso = new Date().toISOString();
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const invitesToday = await countVenueInvitesByArtistSince(artist.id, startOfDay.toISOString());
    if (invitesToday >= VENUE_INVITE_DAILY_LIMIT) {
      return res.status(429).json({ error: `Daily invite limit reached (${VENUE_INVITE_DAILY_LIMIT}/day).` });
    }

    const adminOverride = String(req.query?.adminOverride || '').toLowerCase() === 'true' || String(req.query?.adminOverride || '') === '1';
    if (!adminOverride) {
      const cutoff = new Date(Date.now() - VENUE_INVITE_DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const recent = await findRecentInviteForPlace(artist.id, cleanPlaceId, cutoff);
      if (recent && shouldBlockDuplicateInvite(recent.createdAt, nowIso, VENUE_INVITE_DUPLICATE_WINDOW_DAYS)) {
        return res.status(409).json({ error: 'You recently invited this venue. Try again later.' });
      }
    } else {
      const adminUser = await requireAdmin(req, res);
      if (!adminUser) return;
    }

    const invite = await createVenueInvite({
      token: generateInviteToken(),
      artistId: artist.id,
      placeId: cleanPlaceId,
      venueName: cleanName,
      venueAddress: venueAddress ? String(venueAddress) : null,
      googleMapsUrl: googleMapsUrl ? String(googleMapsUrl) : null,
      websiteUrl: websiteUrl ? String(websiteUrl) : null,
      phone: phone ? String(phone) : null,
      venueEmail: venueEmail ? String(venueEmail) : null,
      personalLine: personalLine ? String(personalLine) : null,
      subject: subject ? String(subject) : `Artwalls invite for ${cleanName}`,
      bodyTemplateVersion: bodyTemplateVersion ? String(bodyTemplateVersion) : 'v1',
      status: 'DRAFT',
    });

    await createVenueInviteEvent(invite.id, 'CREATED', { source: 'artist', at: nowIso });
    return res.json({ invite });
  } catch (err) {
    console.error('[POST /api/venue-invites] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to create invite' });
  }
});

app.get('/api/venue-invites', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    const limit = Number(req.query?.limit || 100);
    const invites = await listVenueInvitesByArtist(artist.id, Number.isFinite(limit) ? limit : 100);
    return res.json({ invites });
  } catch (err) {
    console.error('[GET /api/venue-invites] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to list invites' });
  }
});

app.post('/api/venue-invites/:id/send', async (req, res) => {
  try {
    const artist = await requireArtist(req, res);
    if (!artist) return;
    const inviteId = req.params.id;
    const invite = await getVenueInviteById(inviteId);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.artistId !== artist.id) return res.status(403).json({ error: 'Forbidden' });

    const { personalLine, venueEmail, subject, bodyTemplateVersion, sendMethod } = req.body || {};
    const line = String(personalLine || '').trim();
    if (line.length < 12) return res.status(400).json({ error: 'Personal line must be at least 12 characters.' });
    const email = venueEmail ? String(venueEmail).trim() : null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid venue email.' });
    }

    const nextStatus = invite.status === 'CLICKED' ? 'CLICKED' : 'SENT';
    if (!isStatusTransitionAllowed(invite.status, nextStatus)) {
      return res.status(409).json({ error: `Invite status cannot transition from ${invite.status} to ${nextStatus}.` });
    }

    const nowIso = new Date().toISOString();
    const updated = await updateVenueInvite(invite.id, {
      personalLine: line,
      venueEmail: email,
      subject: subject ? String(subject) : invite.subject,
      bodyTemplateVersion: bodyTemplateVersion ? String(bodyTemplateVersion) : invite.bodyTemplateVersion,
      status: nextStatus,
      sentAt: invite.sentAt || nowIso,
    });

    if (!invite.sentAt) {
      await createVenueInviteEvent(invite.id, 'SENT', { method: sendMethod || 'unknown', at: nowIso });
    }

    return res.json({ invite: updated });
  } catch (err) {
    console.error('[POST /api/venue-invites/:id/send] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to mark sent' });
  }
});

app.get('/api/venue-invites/token/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidInviteToken(token)) return res.status(400).json({ error: 'Invalid invite token' });

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
    const rate = rateLimitByIp(`invite:${ip}`, VENUE_INVITE_PUBLIC_RATE_LIMIT, 60 * 60 * 1000);
    if (!rate.ok) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });

    const invite = await getVenueInviteByToken(token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    const artist = await getArtist(invite.artistId);
    const artworks = await listArtworksByArtist(invite.artistId);
    const featured = (artworks || []).slice(0, 3).map(a => ({
      id: a.id,
      title: a.title,
      imageUrl: a.imageUrl,
      price: a.price,
      currency: a.currency,
    }));

    return res.json({ invite, artist, artworks: featured });
  } catch (err) {
    console.error('[GET /api/venue-invites/token/:token] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load invite' });
  }
});

app.post('/api/venue-invites/token/:token/open', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidInviteToken(token)) return res.status(400).json({ error: 'Invalid invite token' });

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
    const rate = rateLimitByIp(`invite:${ip}`, VENUE_INVITE_PUBLIC_RATE_LIMIT, 60 * 60 * 1000);
    if (!rate.ok) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });

    const invite = await getVenueInviteByToken(token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    const nowIso = new Date().toISOString();
    const nextStatus = statusAfterOpen(invite.status);
    const updated = await updateVenueInvite(invite.id, {
      status: nextStatus,
      clickCount: (invite.clickCount || 0) + 1,
      firstClickedAt: invite.firstClickedAt || nowIso,
    });

    if (!invite.firstClickedAt) {
      await createVenueInviteEvent(invite.id, 'OPENED', { at: nowIso });
      await createNotification({
        userId: invite.artistId,
        type: 'venue_invite',
        title: 'Venue viewed your invite',
        message: `${invite.venueName} opened your invite link.`,
      });
    }

    return res.json({ invite: updated });
  } catch (err) {
    console.error('[POST /api/venue-invites/token/:token/open] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to track invite open' });
  }
});

app.post('/api/venue-invites/token/:token/accept', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidInviteToken(token)) return res.status(400).json({ error: 'Invalid invite token' });
    const invite = await getVenueInviteByToken(token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (!isStatusTransitionAllowed(invite.status, 'ACCEPTED')) {
      return res.status(409).json({ error: `Invite status cannot transition from ${invite.status} to ACCEPTED.` });
    }

    const nowIso = new Date().toISOString();
    const updated = await updateVenueInvite(invite.id, {
      status: 'ACCEPTED',
      acceptedAt: nowIso,
      firstClickedAt: invite.firstClickedAt || nowIso,
    });
    await createVenueInviteEvent(invite.id, 'ACCEPTED', { at: nowIso });
    await createNotification({
      userId: invite.artistId,
      type: 'venue_invite',
      title: 'Venue accepted your invite',
      message: `${invite.venueName} accepted your invite.`,
    });

    return res.json({ invite: updated });
  } catch (err) {
    console.error('[POST /api/venue-invites/token/:token/accept] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to accept invite' });
  }
});

app.post('/api/venue-invites/token/:token/decline', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidInviteToken(token)) return res.status(400).json({ error: 'Invalid invite token' });
    const invite = await getVenueInviteByToken(token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (!isStatusTransitionAllowed(invite.status, 'DECLINED')) {
      return res.status(409).json({ error: `Invite status cannot transition from ${invite.status} to DECLINED.` });
    }

    const nowIso = new Date().toISOString();
    const updated = await updateVenueInvite(invite.id, {
      status: 'DECLINED',
      declinedAt: nowIso,
      firstClickedAt: invite.firstClickedAt || nowIso,
    });
    await createVenueInviteEvent(invite.id, 'DECLINED', { at: nowIso });
    return res.json({ invite: updated });
  } catch (err) {
    console.error('[POST /api/venue-invites/token/:token/decline] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to decline invite' });
  }
});

app.post('/api/venue-invites/token/:token/question', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidInviteToken(token)) return res.status(400).json({ error: 'Invalid invite token' });
    const invite = await getVenueInviteByToken(token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });

    const { message, email } = req.body || {};
    const cleanMessage = String(message || '').trim();
    if (cleanMessage.length < 10) return res.status(400).json({ error: 'Message must be at least 10 characters.' });
    const cleanEmail = email ? String(email).trim() : '';
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Invalid email.' });
    }

    await createNotification({
      userId: invite.artistId,
      type: 'venue_invite_question',
      title: 'Venue asked a question',
      message: `${invite.venueName}: ${cleanMessage}${cleanEmail ? ` (Reply: ${cleanEmail})` : ''}`,
    });
    await createVenueInviteEvent(invite.id, 'OPENED', { question: true, email: cleanEmail || null });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/venue-invites/token/:token/question] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to send question' });
  }
});

app.get('/api/admin/venue-invites/summary', async (req, res) => {
  try {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not configured' });

    const days = Number(req.query?.days || 30);
    const rangeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 30;
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('venue_invites')
      .select('id,artist_id,status,created_at,sent_at,first_clicked_at,accepted_at,declined_at')
      .gte('created_at', since);
    if (error) return res.status(500).json({ error: error.message });

    const byDayMap = new Map();
    const artistMap = new Map();
    const totals = { created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };

    (data || []).forEach((row) => {
      const createdDay = row.created_at?.slice(0, 10);
      const sentDay = row.sent_at?.slice(0, 10);
      const clickedDay = row.first_clicked_at?.slice(0, 10);
      const acceptedDay = row.accepted_at?.slice(0, 10);
      const declinedDay = row.declined_at?.slice(0, 10);

      if (createdDay) {
        const entry = byDayMap.get(createdDay) || { date: createdDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
        entry.created += 1;
        byDayMap.set(createdDay, entry);
        totals.created += 1;
      }
      if (sentDay) {
        const entry = byDayMap.get(sentDay) || { date: sentDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
        entry.sent += 1;
        byDayMap.set(sentDay, entry);
        totals.sent += 1;
      }
      if (clickedDay) {
        const entry = byDayMap.get(clickedDay) || { date: clickedDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
        entry.clicked += 1;
        byDayMap.set(clickedDay, entry);
        totals.clicked += 1;
      }
      if (acceptedDay) {
        const entry = byDayMap.get(acceptedDay) || { date: acceptedDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
        entry.accepted += 1;
        byDayMap.set(acceptedDay, entry);
        totals.accepted += 1;
      }
      if (declinedDay) {
        const entry = byDayMap.get(declinedDay) || { date: declinedDay, created: 0, sent: 0, clicked: 0, accepted: 0, declined: 0 };
        entry.declined += 1;
        byDayMap.set(declinedDay, entry);
        totals.declined += 1;
      }

      const artistId = row.artist_id;
      if (artistId) {
        const artistStats = artistMap.get(artistId) || { artistId, created: 0, accepted: 0 };
        artistStats.created += 1;
        if (row.accepted_at) artistStats.accepted += 1;
        artistMap.set(artistId, artistStats);
      }
    });

    const artistIds = Array.from(artistMap.keys());
    const artistNames = new Map();
    if (artistIds.length) {
      const { data: artistsData } = await supabaseAdmin
        .from('artists')
        .select('id,name')
        .in('id', artistIds);
      (artistsData || []).forEach((a) => artistNames.set(a.id, a.name));
    }

    const topArtists = Array.from(artistMap.values())
      .map((a) => ({
        artistId: a.artistId,
        artistName: artistNames.get(a.artistId) || 'Artist',
        created: a.created,
        accepted: a.accepted,
        conversionRate: a.created ? Math.round((a.accepted / a.created) * 100) : 0,
      }))
      .sort((a, b) => b.accepted - a.accepted)
      .slice(0, 10);

    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return res.json({ rangeDays, totals, byDay, topArtists });
  } catch (err) {
    console.error('[GET /api/admin/venue-invites/summary] Error:', err);
    return res.status(500).json({ error: err?.message || 'Failed to load invite summary' });
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
// Curated Artwork Sets
// -----------------------------
const ALLOWED_SET_ARTWORK_STATUSES = new Set(['available', 'active', 'published']);

function getAvailableItems(items = []) {
  return (items || []).filter((item) => {
    const status = String(item?.artwork?.status || '').toLowerCase();
    return ALLOWED_SET_ARTWORK_STATUSES.has(status) && !item?.artwork?.archivedAt;
  });
}

app.get('/api/curated-sets', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const artistId = (typeof req.query?.artistId === 'string' && req.query.artistId) ? req.query.artistId : authUser.id;
    if (artistId !== authUser.id) return res.status(403).json({ error: 'Can only view your own sets' });

    const [sets, limits] = await Promise.all([
      listArtworkSetsByArtist(artistId),
      getArtistSetLimitInfo(artistId),
    ]);

    return res.json({ sets, limit: limits });
  } catch (err) {
    console.error('[GET /api/curated-sets]', err);
    return res.status(500).json({ error: err?.message || 'Failed to load curated sets' });
  }
});

app.post('/api/curated-sets', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const { title, description, tags } = req.body || {};
    if (!title || String(title).trim().length === 0) return res.status(400).json({ error: 'Title is required' });

    const limits = await getArtistSetLimitInfo(authUser.id);
    if (limits.maxSets === 0 || limits.activeCount >= limits.maxSets) {
      return res.status(402).json({ error: 'Upgrade required to create curated sets', limit: limits });
    }

    const set = await createArtworkSetRecord({
      artistId: authUser.id,
      title: String(title).trim().slice(0, 60),
      description: description ? String(description).slice(0, 240) : null,
      tags: Array.isArray(tags) ? tags.slice(0, 8) : null,
      status: 'draft',
    });

    await recordEvent('set_created', authUser.id, { setId: set.id });
    return res.json({ set, limit: { ...limits, activeCount: limits.activeCount + 1 } });
  } catch (err) {
    console.error('[POST /api/curated-sets]', err);
    return res.status(500).json({ error: err?.message || 'Failed to create set' });
  }
});

app.post('/api/curated-sets/:id', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const setId = req.params.id;
    const set = await getArtworkSetWithItems(setId);
    if (!set || set.artistId !== authUser.id) return res.status(404).json({ error: 'Set not found' });

    const { title, description, tags, status } = req.body || {};
    const next = await updateArtworkSetRecord(setId, {
      title: title !== undefined ? String(title).slice(0, 60) : undefined,
      description: description !== undefined ? String(description).slice(0, 240) : undefined,
      tags: Array.isArray(tags) ? tags.slice(0, 8) : undefined,
      status,
    });
    return res.json({ set: { ...next, items: set.items } });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id]', err);
    return res.status(500).json({ error: err?.message || 'Failed to update set' });
  }
});

app.post('/api/curated-sets/:id/publish', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const setId = req.params.id;
    const set = await getArtworkSetWithItems(setId);
    if (!set || set.artistId !== authUser.id) return res.status(404).json({ error: 'Set not found' });

    const available = getAvailableItems(set.items);
    if (available.length < 3 || available.length > 6) {
      return res.status(400).json({ error: 'You need 3–6 available artworks to publish this set.' });
    }

    const limits = await getArtistSetLimitInfo(authUser.id);
    if (limits.maxSets === 0) return res.status(402).json({ error: 'Upgrade required to publish curated sets', limit: limits });

    const published = await publishArtworkSetRecord(setId);
    await recordEvent('set_published', authUser.id, { setId });
    return res.json({ set: { ...published, items: available }, limit: limits });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id/publish]', err);
    return res.status(500).json({ error: err?.message || 'Failed to publish set' });
  }
});

app.post('/api/curated-sets/:id/archive', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const setId = req.params.id;
    const set = await getArtworkSetWithItems(setId);
    if (!set || set.artistId !== authUser.id) return res.status(404).json({ error: 'Set not found' });

    const archived = await archiveArtworkSetRecord(setId);
    await recordEvent('set_archived', authUser.id, { setId });
    return res.json({ set: { ...archived, items: set.items || [] } });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id/archive]', err);
    return res.status(500).json({ error: err?.message || 'Failed to archive set' });
  }
});

app.post('/api/curated-sets/:id/add-item', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const setId = req.params.id;
    const { artworkId, sortOrder } = req.body || {};
    if (!artworkId) return res.status(400).json({ error: 'artworkId is required' });

    const [set, artwork] = await Promise.all([
      getArtworkSetWithItems(setId),
      getArtwork(artworkId),
    ]);

    if (!set || set.artistId !== authUser.id) return res.status(404).json({ error: 'Set not found' });
    if (!artwork || artwork.artistId !== authUser.id) return res.status(400).json({ error: 'Artwork must belong to you' });

    const available = getAvailableItems(set.items);
    if (available.length >= 6) return res.status(400).json({ error: 'Sets can include up to 6 artworks' });
    if (!ALLOWED_SET_ARTWORK_STATUSES.has(String(artwork.status || '').toLowerCase()) || artwork.status === 'sold') {
      return res.status(400).json({ error: 'Artwork must be available or active to add to a set' });
    }

    const item = await addArtworkToSet({ setId, artworkId, sortOrder: sortOrder ?? available.length });
    const refreshed = await getArtworkSetWithItems(setId);
    return res.json({ item, set: refreshed });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id/add-item]', err);
    return res.status(500).json({ error: err?.message || 'Failed to add artwork to set' });
  }
});

app.post('/api/curated-sets/:id/remove-item', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const setId = req.params.id;
    const { artworkId } = req.body || {};
    if (!artworkId) return res.status(400).json({ error: 'artworkId is required' });

    const set = await getArtworkSetWithItems(setId);
    if (!set || set.artistId !== authUser.id) return res.status(404).json({ error: 'Set not found' });

    await removeArtworkFromSet(setId, artworkId);
    const refreshed = await getArtworkSetWithItems(setId);
    return res.json({ set: refreshed });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id/remove-item]', err);
    return res.status(500).json({ error: err?.message || 'Failed to remove artwork from set' });
  }
});

app.post('/api/curated-sets/:id/reorder', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'artist') return res.status(403).json({ error: 'Artist role required' });

    const setId = req.params.id;
    const set = await getArtworkSetWithItems(setId);
    if (!set || set.artistId !== authUser.id) return res.status(404).json({ error: 'Set not found' });

    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const reordered = await reorderArtworkSetItems(setId, items);
    return res.json({ set: { ...set, items: reordered } });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id/reorder]', err);
    return res.status(500).json({ error: err?.message || 'Failed to reorder set items' });
  }
});

app.get('/api/curated-sets/published', async (req, res) => {
  try {
    const tagsRaw = req.query?.tags;
    const tagList = typeof tagsRaw === 'string' && tagsRaw.length ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const search = typeof req.query?.search === 'string' ? req.query.search : undefined;

    const sets = await listPublishedArtworkSets({ search, tags: tagList });
    await recordEvent('set_viewed', null, { scope: 'published-list', search, tags: tagList });
    return res.json({ sets });
  } catch (err) {
    console.error('[GET /api/curated-sets/published]', err);
    return res.status(500).json({ error: err?.message || 'Failed to load published sets' });
  }
});

app.get('/api/curated-sets/:id/public', async (req, res) => {
  try {
    const setId = req.params.id;
    const set = await getArtworkSetPublic(setId);
    if (!set) return res.status(404).json({ error: 'Set not found or not published' });
    await recordEvent('set_viewed', null, { setId });
    return res.json({ set });
  } catch (err) {
    console.error('[GET /api/curated-sets/:id/public]', err);
    return res.status(500).json({ error: err?.message || 'Failed to load set' });
  }
});

app.post('/api/curated-sets/:id/select', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'venue') return res.status(403).json({ error: 'Venue role required' });

    const setId = req.params.id;
    const status = req.body?.status || 'selected';
    const set = await getArtworkSetPublic(setId);
    if (!set) return res.status(404).json({ error: 'Set not available' });

    const snapshot = (set.items || []).map((i) => i.artworkId).filter(Boolean);
    const selection = await recordVenueSetSelection({
      venueId: authUser.id,
      setId,
      status,
      artworkIdsSnapshot: snapshot,
    });
    await recordEvent('set_selected', authUser.id, { setId, venueId: authUser.id });
    return res.json({ selection, set });
  } catch (err) {
    console.error('[POST /api/curated-sets/:id/select]', err);
    return res.status(500).json({ error: err?.message || 'Failed to select set' });
  }
});

app.get('/api/venue/curated-set-selections', async (req, res) => {
  try {
    const authUser = await getSupabaseUserFromRequest(req);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });
    if (authUser.user_metadata?.role !== 'venue') return res.status(403).json({ error: 'Venue role required' });

    const selections = await listVenueSetSelectionsForVenue(authUser.id);
    return res.json({ selections });
  } catch (err) {
    console.error('[GET /api/venue/curated-set-selections]', err);
    return res.status(500).json({ error: err?.message || 'Failed to load selections' });
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
  const authRole = (authUser?.user_metadata?.role || '').toLowerCase();

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
  const authRole = (authUser?.user_metadata?.role || '').toLowerCase();

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

  const deriveConnectOnboardingStatus = (account) => {
    const details = !!account?.details_submitted;
    const charges = !!account?.charges_enabled;
    const payouts = !!account?.payouts_enabled;
    const hasRequirements = Array.isArray(account?.requirements?.currently_due)
      ? account.requirements.currently_due.length > 0
      : false;

    if (details && charges && payouts) return 'complete';
    if (details && (!charges || !payouts)) return 'restricted';
    if (details || hasRequirements) return 'pending';
    return 'not_started';
  };

  const syncConnectAccount = async (account) => {
    if (!account?.id || !supabaseAdmin) return;
    const nowIso = new Date().toISOString();
    const updates = {
      stripe_charges_enabled: !!account?.charges_enabled,
      stripe_payouts_enabled: !!account?.payouts_enabled,
      stripe_details_submitted: !!account?.details_submitted,
      stripe_requirements_currently_due: account?.requirements?.currently_due || [],
      stripe_requirements_eventually_due: account?.requirements?.eventually_due || [],
      stripe_onboarding_status: deriveConnectOnboardingStatus(account),
      stripe_last_status_sync_at: nowIso,
      updated_at: nowIso,
    };

    await supabaseAdmin.from('artists').update(updates).eq('stripe_account_id', account.id);
    await supabaseAdmin.from('venues').update(updates).eq('stripe_account_id', account.id);
  };

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
        let payoutStatus = order.payoutStatus || 'pending_connect';
        let payoutError = order.payoutError || null;

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
          const venueReady = !!venue?.stripeAccountId && !!venue?.stripePayoutsEnabled;
          if (!venueReady) {
            payoutStatus = 'blocked_pending_onboarding';
            payoutError = 'Venue payouts disabled or onboarding incomplete';
          } else {
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
        }

        if (!payoutError) {
          payoutStatus = 'paid';
        }

        await updateOrder(orderId, {
          status: 'paid',
          stripePaymentIntentId: piId,
          stripeChargeId: chargeId,
          transferIds: transfers,
          payoutStatus,
          payoutError,
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

        // ── Wall-productivity: record purchase event (idempotent via unique index on order_id) ──
        try {
          await supabaseAdmin.from('app_events').insert({
            event_type: 'purchase',
            session_id: session?.metadata?.sessionId || session.client_reference_id || orderId,
            order_id: orderId,
            artwork_id: artworkId || null,
            venue_id: order.venueId || null,
            artist_id: order.artistId || null,
            stripe_checkout_session_id: session.id || null,
            metadata: {
              list_price_cents: order.amountCents || 0,
              platform_fee_cents: order.platformFeeCents || 0,
              venue_payout_cents: order.venuePayoutCents || 0,
              artist_payout_cents: order.artistPayoutCents || 0,
              currency: order.currency || 'usd',
            },
          });
          console.log('✅ app_events purchase recorded', { orderId });
        } catch (trackErr) {
          // 23505 = unique_violation (duplicate purchase for same order – expected on webhook retries)
          if (trackErr?.code !== '23505') {
            console.warn('⚠ app_events purchase insert failed (non-critical)', trackErr?.message || trackErr);
          }
        }
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

  if (event.type === 'account.updated') {
    await syncConnectAccount(event.data?.object);
    return;
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
    const proUntil = artist.proUntil || artist.pro_until || null;
    const hasProOverride = proUntil ? new Date(proUntil).getTime() > Date.now() : false;
    const tier = (hasProOverride ? 'pro' : (artist.subscriptionTier || 'free')).toLowerCase();
    const isActive = hasProOverride ? true : artist.subscriptionStatus === 'active';
    const limits = getPlanLimitsForArtist(artist);

    const subscription = {
      tier,
      status: hasProOverride ? 'active' : (artist.subscriptionStatus || 'inactive'),
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
