// @deprecated — Express server is retired. Delete this file.
throw new Error('server/store.js is deprecated');

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function loadStore() {
  if (!fs.existsSync(STORE_PATH)) {
    const initial = { artists: {}, venues: {}, artworks: {}, orders: {}, webhookEvents: {} };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }

  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  const data = safeJsonParse(raw, { artists: {}, venues: {}, artworks: {}, orders: {}, webhookEvents: {} });

  // Ensure shape
  data.artists ||= {};
  data.venues ||= {};
  data.artworks ||= {};
  data.orders ||= {};
  data.webhookEvents ||= {};

  return data;
}

export function saveStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// --- Artists ---
export function upsertArtist({
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
  const store = loadStore();
  const now = new Date().toISOString();
  const existing = store.artists[id] || {};

  store.artists[id] = {
    id,
    email: email ?? existing.email ?? null,
    name: name ?? existing.name ?? null,
    role: role ?? existing.role ?? 'artist',
    stripeAccountId: stripeAccountId ?? existing.stripeAccountId ?? null,
    stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId ?? null,
    subscriptionTier: subscriptionTier ?? existing.subscriptionTier ?? 'free',
    subscriptionStatus: subscriptionStatus ?? existing.subscriptionStatus ?? 'inactive',
    stripeSubscriptionId: stripeSubscriptionId ?? existing.stripeSubscriptionId ?? null,
    // Optional override: store the platform fee schedule *resolved at subscription time*.
    // Keep it on the artist so fee changes don't require a deploy.
    platformFeeBps:
      Number.isFinite(Number(platformFeeBps)) && Number(platformFeeBps) >= 0
        ? Number(platformFeeBps)
        : existing.platformFeeBps ?? null,
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
  };

  saveStore(store);
  return store.artists[id];
}

export function getArtist(id) {
  const store = loadStore();
  return store.artists[id] || null;
}

// --- Venues ---
export function upsertVenue({ id, email, name, stripeAccountId, defaultVenueFeeBps }) {
  const store = loadStore();
  const now = new Date().toISOString();
  const existing = store.venues[id] || {};

  store.venues[id] = {
    id,
    email: email ?? existing.email ?? null,
    name: name ?? existing.name ?? null,
    stripeAccountId: stripeAccountId ?? existing.stripeAccountId ?? null,
    defaultVenueFeeBps: Number.isFinite(Number(defaultVenueFeeBps))
      ? Number(defaultVenueFeeBps)
      : existing.defaultVenueFeeBps ?? 1000, // 10% default
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
  };

  saveStore(store);
  return store.venues[id];
}

export function getVenue(id) {
  const store = loadStore();
  return store.venues[id] || null;
}

export function listVenues() {
  const store = loadStore();
  return Object.values(store.venues);
}

// --- Artworks / Listings ---
export function createArtwork(artwork) {
  const store = loadStore();
  const now = new Date().toISOString();
  store.artworks[artwork.id] = { ...artwork, createdAt: now, updatedAt: now };
  saveStore(store);
  return store.artworks[artwork.id];
}

export function listArtworksByArtist(artistId) {
  const store = loadStore();
  return Object.values(store.artworks).filter((a) => a.artistId === artistId);
}

export function getArtwork(id) {
  const store = loadStore();
  return store.artworks[id] || null;
}

export function markArtworkSold(id) {
  const store = loadStore();
  if (!store.artworks[id]) return null;
  store.artworks[id] = { ...store.artworks[id], status: 'sold', updatedAt: new Date().toISOString() };
  saveStore(store);
  return store.artworks[id];
}

// --- Orders ---
export function createOrder(order) {
  const store = loadStore();
  const now = new Date().toISOString();
  store.orders[order.id] = { ...order, createdAt: now, updatedAt: now };
  saveStore(store);
  return store.orders[order.id];
}

export function updateOrder(id, patch) {
  const store = loadStore();
  if (!store.orders[id]) return null;
  store.orders[id] = { ...store.orders[id], ...patch, updatedAt: new Date().toISOString() };
  saveStore(store);
  return store.orders[id];
}

export function findOrderByCheckoutSessionId(sessionId) {
  const store = loadStore();
  return Object.values(store.orders).find((o) => o.stripeCheckoutSessionId === sessionId) || null;
}

export function findOrderById(id) {
  const store = loadStore();
  return store.orders[id] || null;
}

// --- Webhook idempotency ---
export function wasEventProcessed(eventId) {
  const store = loadStore();
  return Boolean(store.webhookEvents[eventId]);
}

export function markEventProcessed(eventId, note = null) {
  const store = loadStore();
  store.webhookEvents[eventId] = { processedAt: new Date().toISOString(), note };
  saveStore(store);
}
