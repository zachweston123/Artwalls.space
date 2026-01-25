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
    cityPrimary: r.city_primary,
    citySecondary: r.city_secondary,
    bio: r.bio,
    artTypes: r.art_types,
    instagramHandle: r.instagram_handle,
    portfolioUrl: r.portfolio_url,
    profilePhotoUrl: r.profile_photo_url,
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
    type: r.type,
    stripeAccountId: r.stripe_account_id,
    defaultVenueFeeBps: r.default_venue_fee_bps,
    labels: Array.isArray(r.labels) ? r.labels : (r.labels ? r.labels : []),
    suspended: !!r.suspended,
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
  // Include error code and details for better debugging
  const details = {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  };
  const msg = `${context}: ${error.message || JSON.stringify(details)}`;
  console.error(`[Supabase Error] ${context}:`, details);
  const e = new Error(msg);
  e.cause = error;
  e.code = error.code;
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
  phoneNumber,
  cityPrimary,
  citySecondary,
  bio,
  artTypes,
  instagramHandle,
  portfolioUrl,
  profilePhotoUrl,
}) {
  const payload = {
    id,
    updated_at: nowIso(),
  };

  // Only add fields if they are defined (allow null to set to null)
  if (email !== undefined) payload.email = email;
  if (name !== undefined) payload.name = name;
  if (role !== undefined) payload.role = role ?? 'artist';
  if (phoneNumber !== undefined) payload.phone_number = phoneNumber;
  if (stripeAccountId !== undefined) payload.stripe_account_id = stripeAccountId;
  if (stripeCustomerId !== undefined) payload.stripe_customer_id = stripeCustomerId;
  if (subscriptionTier !== undefined) payload.subscription_tier = subscriptionTier;
  if (subscriptionStatus !== undefined) payload.subscription_status = subscriptionStatus;
  if (stripeSubscriptionId !== undefined) payload.stripe_subscription_id = stripeSubscriptionId;
  if (platformFeeBps !== undefined) payload.platform_fee_bps = platformFeeBps === null ? null : toIntOrNull(platformFeeBps);
  if (cityPrimary !== undefined) payload.city_primary = cityPrimary;
  if (citySecondary !== undefined) payload.city_secondary = citySecondary;
  if (bio !== undefined) payload.bio = bio;
  if (artTypes !== undefined) payload.art_types = artTypes;
  if (instagramHandle !== undefined) payload.instagram_handle = instagramHandle;
  if (portfolioUrl !== undefined) payload.portfolio_url = portfolioUrl;
  if (profilePhotoUrl !== undefined) payload.profile_photo_url = profilePhotoUrl;

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

export async function listArtists() {
  const { data, error } = await supabaseAdmin
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error, 'listArtists');
  return (data || []).map(mapArtistRow);
}

// --- Venues ---
export async function upsertVenue({ id, email, name, type, stripeAccountId, defaultVenueFeeBps, suspended, labels, city }) {
  const payload = {
    id,
    updated_at: nowIso(),
  };

  if (email !== undefined) payload.email = email;
  if (name !== undefined) payload.name = name;
  if (type !== undefined) payload.type = type;
  if (city !== undefined) payload.city = city;
  if (stripeAccountId !== undefined) payload.stripe_account_id = stripeAccountId;
  if (defaultVenueFeeBps !== undefined) payload.default_venue_fee_bps = defaultVenueFeeBps === null ? null : toIntOrNull(defaultVenueFeeBps);
  if (labels !== undefined) payload.labels = Array.isArray(labels) ? labels : null;
  if (suspended !== undefined) payload.suspended = suspended;

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
  if (patch.venueId !== undefined) payload.venue_id = patch.venueId === null ? null : String(patch.venueId);
  if (patch.venueName !== undefined) payload.venue_name = patch.venueName === null ? null : String(patch.venueName);
  if (patch.venueFeeBps !== undefined) payload.venue_fee_bps = patch.venueFeeBps === null ? null : toIntOrNull(patch.venueFeeBps);
  if (patch.artistName !== undefined) payload.artist_name = patch.artistName === null ? null : String(patch.artistName);
  if (patch.imageUrl !== undefined) payload.image_url = patch.imageUrl === null ? null : String(patch.imageUrl);
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

// --- Admin moderation helpers ---
export async function updateArtistStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from('artists')
    .update({ subscription_status: status, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'updateArtistStatus');
  return mapArtistRow(data);
}

export async function updateVenueSuspended(id, suspended) {
  const { data, error } = await supabaseAdmin
    .from('venues')
    .update({ suspended, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'updateVenueSuspended');
  return mapVenueRow(data);
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

// --- Wallspaces ---
function mapWallspaceRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    venueId: r.venue_id,
    name: r.name,
    width: r.width_inches,
    height: r.height_inches,
    description: r.description,
    available: r.available,
    photos: r.photos,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listWallspacesByVenue(venueId) {
  const { data, error } = await supabaseAdmin
    .from('wallspaces')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });
  throwIfError(error, 'listWallspacesByVenue');
  return (data || []).map(mapWallspaceRow);
}

export async function createWallspace({ id, venueId, name, width, height, description, available, photos }) {
  const payload = {
    id: id,
    venue_id: venueId,
    name,
    width_inches: width === undefined ? null : toIntOrNull(width),
    height_inches: height === undefined ? null : toIntOrNull(height),
    description: description ?? null,
    available: available === undefined ? true : Boolean(available),
    photos: Array.isArray(photos) ? photos : (photos ? [photos] : null),
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from('wallspaces')
    .insert(payload)
    .select('*')
    .single();
  throwIfError(error, 'createWallspace');
  return mapWallspaceRow(data);
}

export async function updateWallspace(id, patch) {
  const payload = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.width !== undefined) payload.width_inches = toIntOrNull(patch.width);
  if (patch.height !== undefined) payload.height_inches = toIntOrNull(patch.height);
  if (patch.description !== undefined) payload.description = patch.description;
  if (patch.available !== undefined) payload.available = Boolean(patch.available);
  if (patch.photos !== undefined) payload.photos = patch.photos;
  payload.updated_at = nowIso();

  const { data, error } = await supabaseAdmin
    .from('wallspaces')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  throwIfError(error, 'updateWallspace');
  return mapWallspaceRow(data);
}

export async function deleteWallspace(id) {
  const { error } = await supabaseAdmin.from('wallspaces').delete().eq('id', id);
  throwIfError(error, 'deleteWallspace');
  return { id };
}

// --- Settings ---
function mapSettingsRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    appUrl: r.app_url,
    subSuccessUrl: r.sub_success_url,
    subCancelUrl: r.sub_cancel_url,
    subPriceStarter: r.sub_price_starter,
    subPriceGrowth: r.sub_price_growth,
    subPricePro: r.sub_price_pro,
    subPriceElite: r.sub_price_elite,
    feeBpsFree: r.fee_bps_free,
    feeBpsStarter: r.fee_bps_starter,
    feeBpsPro: r.fee_bps_pro,
    feeBpsElite: r.fee_bps_elite,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getSettings() {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();
  throwIfError(error, 'getSettings');
  return mapSettingsRow(data);
}

export async function upsertSettings(patch) {
  const payload = {
    id: 'default',
    app_url: patch.appUrl ?? null,
    sub_success_url: patch.subSuccessUrl ?? null,
    sub_cancel_url: patch.subCancelUrl ?? null,
    sub_price_starter: patch.subPriceStarter ?? null,
    sub_price_growth: patch.subPriceGrowth ?? null,
    sub_price_pro: patch.subPricePro ?? null,
    sub_price_elite: patch.subPriceElite ?? null,
    fee_bps_free: patch.feeBpsFree === undefined ? null : toIntOrNull(patch.feeBpsFree),
    fee_bps_starter: patch.feeBpsStarter === undefined ? null : toIntOrNull(patch.feeBpsStarter),
    fee_bps_pro: patch.feeBpsPro === undefined ? null : toIntOrNull(patch.feeBpsPro),
    fee_bps_elite: patch.feeBpsElite === undefined ? null : toIntOrNull(patch.feeBpsElite),
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from('settings')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();
  throwIfError(error, 'upsertSettings');
  return mapSettingsRow(data);
}

// --- Scheduling: Venue Schedules ---
function mapVenueScheduleRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    venueId: r.venue_id,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    slotMinutes: r.slot_minutes,
    timezone: r.timezone,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function getVenueSchedule(venueId) {
  const { data, error } = await supabaseAdmin
    .from('venue_schedules')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle();
  throwIfError(error, 'getVenueSchedule');
  return mapVenueScheduleRow(data);
}

export async function upsertVenueSchedule({ venueId, dayOfWeek, startTime, endTime, slotMinutes, timezone }) {
  const payload = {
    venue_id: venueId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    slot_minutes: slotMinutes ?? 30,
    timezone: timezone ?? null,
    updated_at: nowIso(),
  };

  const { data, error } = await supabaseAdmin
    .from('venue_schedules')
    .upsert(payload, { onConflict: 'venue_id' })
    .select('*')
    .single();
  throwIfError(error, 'upsertVenueSchedule');
  return mapVenueScheduleRow(data);
}

// --- Scheduling: Bookings ---
function mapBookingRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    venueId: r.venue_id,
    artistId: r.artist_id,
    artworkId: r.artwork_id,
    type: r.type,
    startAt: r.start_at,
    endAt: r.end_at,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listBookingsByVenueBetween(venueId, startIso, endIso) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('venue_id', venueId)
    .eq('status', 'booked')
    .lt('start_at', endIso)
    .gt('end_at', startIso)
    .order('start_at', { ascending: true });
  throwIfError(error, 'listBookingsByVenueBetween');
  return (data || []).map(mapBookingRow);
}

export async function createBooking({ venueId, artistId, artworkId, type, startAt, endAt }) {
  const payload = {
    venue_id: venueId,
    artist_id: artistId,
    artwork_id: artworkId ?? null,
    type,
    start_at: startAt,
    end_at: endAt,
    status: 'booked',
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .insert(payload)
    .select('*')
    .single();
  throwIfError(error, 'createBooking');
  return mapBookingRow(data);
}

export async function getBookingById(id) {
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error, 'getBookingById');
  return mapBookingRow(data);
}

// --- Venue Invites ---
function mapVenueInviteRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    token: r.token,
    artistId: r.artist_id,
    placeId: r.place_id,
    venueName: r.venue_name,
    venueAddress: r.venue_address,
    googleMapsUrl: r.google_maps_url,
    websiteUrl: r.website_url,
    phone: r.phone,
    venueEmail: r.venue_email,
    personalLine: r.personal_line,
    subject: r.subject,
    bodyTemplateVersion: r.body_template_version,
    status: r.status,
    sentAt: r.sent_at,
    firstClickedAt: r.first_clicked_at,
    clickCount: r.click_count,
    acceptedAt: r.accepted_at,
    declinedAt: r.declined_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createVenueInvite(invite) {
  const payload = {
    token: invite.token,
    artist_id: invite.artistId,
    place_id: invite.placeId,
    venue_name: invite.venueName,
    venue_address: invite.venueAddress ?? null,
    google_maps_url: invite.googleMapsUrl ?? null,
    website_url: invite.websiteUrl ?? null,
    phone: invite.phone ?? null,
    venue_email: invite.venueEmail ?? null,
    personal_line: invite.personalLine ?? null,
    subject: invite.subject ?? null,
    body_template_version: invite.bodyTemplateVersion ?? 'v1',
    status: invite.status ?? 'DRAFT',
    sent_at: invite.sentAt ?? null,
    first_clicked_at: invite.firstClickedAt ?? null,
    click_count: invite.clickCount ?? 0,
    accepted_at: invite.acceptedAt ?? null,
    declined_at: invite.declinedAt ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  const { data, error } = await supabaseAdmin
    .from('venue_invites')
    .insert(payload)
    .select('*')
    .single();
  throwIfError(error, 'createVenueInvite');
  return mapVenueInviteRow(data);
}

export async function listVenueInvitesByArtist(artistId, limit = 100) {
  const { data, error } = await supabaseAdmin
    .from('venue_invites')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwIfError(error, 'listVenueInvitesByArtist');
  return (data || []).map(mapVenueInviteRow);
}

export async function getVenueInviteById(id) {
  const { data, error } = await supabaseAdmin
    .from('venue_invites')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error, 'getVenueInviteById');
  return mapVenueInviteRow(data);
}

export async function getVenueInviteByToken(token) {
  const { data, error } = await supabaseAdmin
    .from('venue_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  throwIfError(error, 'getVenueInviteByToken');
  return mapVenueInviteRow(data);
}

export async function updateVenueInvite(id, updates) {
  const payload = { updated_at: nowIso() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.sentAt !== undefined) payload.sent_at = updates.sentAt;
  if (updates.firstClickedAt !== undefined) payload.first_clicked_at = updates.firstClickedAt;
  if (updates.clickCount !== undefined) payload.click_count = updates.clickCount;
  if (updates.acceptedAt !== undefined) payload.accepted_at = updates.acceptedAt;
  if (updates.declinedAt !== undefined) payload.declined_at = updates.declinedAt;
  if (updates.venueEmail !== undefined) payload.venue_email = updates.venueEmail;
  if (updates.personalLine !== undefined) payload.personal_line = updates.personalLine;
  if (updates.subject !== undefined) payload.subject = updates.subject;
  if (updates.bodyTemplateVersion !== undefined) payload.body_template_version = updates.bodyTemplateVersion;
  if (updates.venueName !== undefined) payload.venue_name = updates.venueName;
  if (updates.venueAddress !== undefined) payload.venue_address = updates.venueAddress;
  if (updates.googleMapsUrl !== undefined) payload.google_maps_url = updates.googleMapsUrl;
  if (updates.websiteUrl !== undefined) payload.website_url = updates.websiteUrl;
  if (updates.phone !== undefined) payload.phone = updates.phone;

  const { data, error } = await supabaseAdmin
    .from('venue_invites')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'updateVenueInvite');
  return mapVenueInviteRow(data);
}

export async function createVenueInviteEvent(inviteId, type, meta = {}) {
  const { data, error } = await supabaseAdmin
    .from('venue_invite_events')
    .insert({ invite_id: inviteId, type, meta })
    .select('*')
    .maybeSingle();
  throwIfError(error, 'createVenueInviteEvent');
  return data || null;
}

export async function countVenueInvitesByArtistSince(artistId, sinceIso) {
  const { count, error } = await supabaseAdmin
    .from('venue_invites')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .gte('created_at', sinceIso);
  throwIfError(error, 'countVenueInvitesByArtistSince');
  return count || 0;
}

export async function findRecentInviteForPlace(artistId, placeId, sinceIso) {
  const { data, error } = await supabaseAdmin
    .from('venue_invites')
    .select('*')
    .eq('artist_id', artistId)
    .eq('place_id', placeId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error, 'findRecentInviteForPlace');
  return mapVenueInviteRow(data);
}

// --- Notifications ---
function mapNotificationRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    isRead: r.is_read,
    createdAt: r.created_at,
  };
}

export async function createNotification({ userId, type, title, message }) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, title, message })
    .select('*')
    .single();
  throwIfError(error, 'createNotification');
  return mapNotificationRow(data);
}

export async function listNotificationsForUser(userId, limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwIfError(error, 'listNotificationsForUser');
  return (data || []).map(mapNotificationRow);
}

export async function markNotificationRead(id, userId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'markNotificationRead');
  return mapNotificationRow(data);
}
// Support Messages

function mapSupportMessageRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    message: r.message,
    roleContext: r.role_context,
    pageSource: r.page_source,
    userId: r.user_id,
    artistId: r.artist_id,
    venueId: r.venue_id,
    status: r.status,
    ipHash: r.ip_hash,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createSupportMessage({ email, message, roleContext, pageSource, userId, artistId, venueId, ipHash, userAgent }) {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .insert({
      email,
      message,
      role_context: roleContext,
      page_source: pageSource,
      user_id: userId || null,
      artist_id: artistId || null,
      venue_id: venueId || null,
      status: 'new',
      ip_hash: ipHash,
      user_agent: userAgent,
      created_at: nowIso(),
      updated_at: nowIso(),
    })
    .select('*')
    .maybeSingle();
  throwIfError(error, 'createSupportMessage');
  return mapSupportMessageRow(data);
}

export async function listSupportMessages({ limit = 50, offset = 0, status = null, searchEmail = null, searchMessage = null }) {
  let query = supabaseAdmin
    .from('support_messages')
    .select('*', { count: 'exact' });

  if (status) {
    query = query.eq('status', status);
  }
  if (searchEmail) {
    query = query.ilike('email', `%${searchEmail}%`);
  }
  if (searchMessage) {
    query = query.ilike('message', `%${searchMessage}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  throwIfError(error, 'listSupportMessages');
  return {
    messages: (data || []).map(mapSupportMessageRow),
    total: count || 0,
  };
}

export async function getSupportMessage(id) {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwIfError(error, 'getSupportMessage');
  return mapSupportMessageRow(data);
}

export async function updateSupportMessageStatus(id, status) {
  const { data, error } = await supabaseAdmin
    .from('support_messages')
    .update({ status, updated_at: nowIso() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'updateSupportMessageStatus');
  return mapSupportMessageRow(data);
}

export async function getRecentMessageCountByIp(ipHash, withinMinutes = 60) {
  const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000).toISOString();
  const { data, error, count } = await supabaseAdmin
    .from('support_messages')
    .select('id', { count: 'exact' })
    .eq('ip_hash', ipHash)
    .gte('created_at', cutoffTime);
  throwIfError(error, 'getRecentMessageCountByIp');
  return count || 0;
}