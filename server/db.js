import { supabaseAdmin } from './supabaseClient.js';

// Server-side DB adapter (Supabase Postgres).
// Uses service-role key, so keep all access on the server.

function nowIso() {
  return new Date().toISOString();
}

function toIntOrNull(v) {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function mapArtistRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    stripeAccountId: r.stripe_account_id,
    stripeCustomerId: r.stripe_customer_id,
    subscriptionTier: r.subscription_tier,
    subscriptionStatus: r.subscription_status,
    stripeSubscriptionId: r.stripe_subscription_id,
    platformFeeBps: r.platform_fee_bps,
    venueFeeBps: r.venue_fee_bps,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapVenueRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    stripeAccountId: r.stripe_account_id,
    defaultVenueFeeBps: r.default_venue_fee_bps,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapArtworkRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    artistId: r.artist_id,
    venueId: r.venue_id,
    artistName: r.artist_name,
    venueName: r.venue_name,
    title: r.title,
    description: r.description,
    priceCents: r.price_cents,
    price: r.price_cents == null ? null : r.price_cents / 100,
    currency: r.currency,
    imageUrl: r.image_url,
    venueFeeBps: r.venue_fee_bps,
    stripeProductId: r.stripe_product_id,
    stripePriceId: r.stripe_price_id,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapOrderRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    artworkId: r.artwork_id,
    artistId: r.artist_id,
    venueId: r.venue_id,
    amountCents: r.amount_cents,
    buyerEmail: r.buyer_email,
    currency: r.currency,
    platformFeeBps: r.platform_fee_bps,
    venueFeeBps: r.venue_fee_bps,
    platformFeeCents: r.platform_fee_cents,
    artistPayoutCents: r.artist_payout_cents,
    venuePayoutCents: r.venue_payout_cents,
    status: r.status,
    stripeCheckoutSessionId: r.stripe_checkout_session_id,
    stripePaymentIntentId: r.stripe_payment_intent_id,
    stripeChargeId: r.stripe_charge_id,
    transferIds: r.transfer_ids,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function throwIfError(error, context) {
  if (!error) return;
  const msg = `${context}: ${error.message || JSON.stringify(error)}`;
  const e = new Error(msg);
  e.cause = error;
  throw e;
}

// --- Artists ---
export async function upsertArtist({
  id,
  email,
  name,
  role,
  stripeAccountId,
  stripeCustomerId,
  subscriptionTier,
  subscriptionStatus,
  stripeSubscriptionId,
  platformFeeBps,
}) {
  const payload = {
    id,
    email: email ?? null,
    name: name ?? null,
    role: role ?? 'artist',
    stripe_account_id: stripeAccountId ?? null,
    stripe_customer_id: stripeCustomerId ?? null,
    subscription_tier: subscriptionTier ?? 'free',
    subscription_status: subscriptionStatus ?? 'inactive',
    stripe_subscription_id: stripeSubscriptionId ?? null,
    platform_fee_bps: platformFeeBps === undefined ? null : toIntOrNull(platformFeeBps),
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from('artists')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  throwIfError(error, 'upsertArtist');
  return mapArtistRow(data);
}

export async function getArtist(id) {
  const { data, error } = await supabaseAdmin.from('artists').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getArtist');
  return mapArtistRow(data);
}

// --- Venues ---
export async function upsertVenue({ id, email, name, stripeAccountId, defaultVenueFeeBps }) {
  const payload = {
    id,
    email: email ?? null,
    name: name ?? null,
    stripe_account_id: stripeAccountId ?? null,
    default_venue_fee_bps: defaultVenueFeeBps === undefined ? null : toIntOrNull(defaultVenueFeeBps),
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from('venues')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  throwIfError(error, 'upsertVenue');
  return mapVenueRow(data);
}

export async function getVenue(id) {
  const { data, error } = await supabaseAdmin.from('venues').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getVenue');
  return mapVenueRow(data);
}

export async function listVenues() {
  const { data, error } = await supabaseAdmin.from('venues').select('*').order('created_at', { ascending: false });
  throwIfError(error, 'listVenues');
  return (data || []).map(mapVenueRow);
}

// --- Artworks / Listings ---
export async function createArtwork(artwork) {
  const payload = {
    id: artwork.id,
    artist_id: artwork.artistId,
    venue_id: artwork.venueId ?? null,
    artist_name: artwork.artistName ?? null,
    venue_name: artwork.venueName ?? null,
    title: artwork.title,
    description: artwork.description ?? null,
    price_cents: toIntOrNull(artwork.priceCents ?? (artwork.price !== undefined ? Math.round(Number(artwork.price) * 100) : null)),
    currency: artwork.currency,
    image_url: artwork.imageUrl ?? null,
    venue_fee_bps: artwork.venueFeeBps === undefined ? null : toIntOrNull(artwork.venueFeeBps),
    stripe_product_id: artwork.stripeProductId ?? null,
    stripe_price_id: artwork.stripePriceId ?? null,
    status: artwork.status ?? 'published',
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin.from('artworks').insert(payload).select('*').single();
  throwIfError(error, 'createArtwork');
  return mapArtworkRow(data);
}

export async function listArtworksByArtist(artistId) {
  const { data, error } = await supabaseAdmin
    .from('artworks')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false });
  throwIfError(error, 'listArtworksByArtist');
  return (data || []).map(mapArtworkRow);
}

export async function getArtwork(id) {
  const { data, error } = await supabaseAdmin.from('artworks').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getArtwork');
  return mapArtworkRow(data);
}

export async function updateArtwork(id, patch) {
  const payload = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.stripeProductId !== undefined) payload.stripe_product_id = patch.stripeProductId;
  if (patch.stripePriceId !== undefined) payload.stripe_price_id = patch.stripePriceId;
  payload.updated_at = nowIso();

  const { data, error } = await supabaseAdmin.from('artworks').update(payload).eq('id', id).select('*').single();
  throwIfError(error, 'updateArtwork');
  return mapArtworkRow(data);
}

export async function markArtworkSold(id) {
  const { data, error } = await supabaseAdmin
    .from('artworks')
    .update({ status: 'sold', updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .single();
  throwIfError(error, 'markArtworkSold');
  return mapArtworkRow(data);
}

// --- Orders ---
export async function createOrder(order) {
  const payload = {
    id: order.id,
    artwork_id: order.artworkId ?? null,
    artist_id: order.artistId,
    venue_id: order.venueId ?? null,
    amount_cents: toIntOrNull(order.amountCents),
    buyer_email: order.buyerEmail ?? null,
    currency: order.currency,
    platform_fee_bps: toIntOrNull(order.platformFeeBps),
    venue_fee_bps: toIntOrNull(order.venueFeeBps),
    platform_fee_cents: toIntOrNull(order.platformFeeCents),
    artist_payout_cents: toIntOrNull(order.artistPayoutCents),
    venue_payout_cents: toIntOrNull(order.venuePayoutCents),
    status: order.status ?? 'created',
    stripe_checkout_session_id: order.stripeCheckoutSessionId ?? null,
    stripe_payment_intent_id: order.stripePaymentIntentId ?? null,
    stripe_charge_id: order.stripeChargeId ?? null,
    transfer_ids: order.transferIds ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin.from('orders').insert(payload).select('*').single();
  throwIfError(error, 'createOrder');
  return mapOrderRow(data);
}

export async function updateOrder(id, patch) {
  const payload = {};
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.stripePaymentIntentId !== undefined) payload.stripe_payment_intent_id = patch.stripePaymentIntentId;
  if (patch.stripeChargeId !== undefined) payload.stripe_charge_id = patch.stripeChargeId;
  if (patch.transferIds !== undefined) payload.transfer_ids = patch.transferIds;
  if (patch.stripeCheckoutSessionId !== undefined) payload.stripe_checkout_session_id = patch.stripeCheckoutSessionId;
  payload.updated_at = nowIso();

  const { data, error } = await supabaseAdmin.from('orders').update(payload).eq('id', id).select('*').single();
  throwIfError(error, 'updateOrder');
  return mapOrderRow(data);
}

export async function findOrderByCheckoutSessionId(sessionId) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle();
  throwIfError(error, 'findOrderByCheckoutSessionId');
  return mapOrderRow(data);
}

export async function findOrderById(id) {
  const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'findOrderById');
  return mapOrderRow(data);
}

// --- Webhook idempotency ---
export async function wasEventProcessed(eventId) {
  const { data, error } = await supabaseAdmin.from('webhook_events').select('id').eq('id', eventId).maybeSingle();
  throwIfError(error, 'wasEventProcessed');
  return Boolean(data?.id);
}

export async function markEventProcessed(eventId, type, note = null) {
  const { error } = await supabaseAdmin.from('webhook_events').insert({
    id: eventId,
    type: type ?? null,
    note,
    processed_at: nowIso(),
  });
  throwIfError(error, 'markEventProcessed');
}
