# Rate Limiting & Abuse Protection

> Artwalls.space API — Cloudflare Worker at `api.artwalls.space/*`

## Architecture

Rate limiting is implemented in [worker/rateLimit.ts](../worker/rateLimit.ts) and applied
per-route inside [worker/index.ts](../worker/index.ts).

### How it works

1. **Per-route counters** — each endpoint has its own rate-limit "preset" with
   independent counters. Hitting one endpoint never exhausts the budget of another.

2. **Multi-dimension keying** — a single endpoint can enforce limits across
   multiple dimensions simultaneously:
   - **IP** (always) — `CF-Connecting-IP` → `X-Forwarded-For` → `"unknown"`.
   - **userId** (when a JWT is present) — decoded from the `sub` claim
     without calling Supabase (zero extra latency).
   - **artworkId** (checkout only) — prevents runaway sessions for one piece.

3. **Backing store:**
   | Environment | Store | Durability |
   |---|---|---|
   | Production (with KV binding) | **Cloudflare KV** | Global, survives isolate recycling |
   | Production (no KV yet) | In-memory `Map` | Per-isolate, evicts stale entries |
   | Local dev (`wrangler dev`) | In-memory `Map` | Single process, resets on restart |

4. **429 response format** (RFC 6585 § 4 compliant):
   ```json
   { "error": "rate_limited", "retryAfterSec": 42 }
   ```
   Plus headers: `Retry-After: 42` · `Cache-Control: no-store`

---

## Endpoint Limits

### Stripe Connect (artist + venue)

| Endpoint | IP limit | User limit |
|---|---|---|
| `POST /api/stripe/connect/{role}/create-account` | 10/min | 20/hour |
| `POST /api/stripe/connect/{role}/account-link` | 15/min | 30/hour |
| `POST /api/stripe/connect/{role}/login-link` | 15/min | — |

### Stripe Checkout & Billing

| Endpoint | IP limit | User limit | Artwork limit |
|---|---|---|---|
| `POST /api/stripe/create-checkout-session` | 5/min | 20/hour | 10/hour |
| `POST /api/stripe/billing/create-subscription-session` | 5/min | 10/hour | — |
| `POST /api/stripe/billing/create-portal-session` | 10/min | 20/hour | — |

### Writes

| Endpoint | IP limit | User limit |
|---|---|---|
| `POST /api/profile/provision` | 10/min | 20/hour |
| `POST /api/artists` · `POST /api/venues` | 20/min | — |
| `POST /api/artworks` | 20/min | 50/hour |
| `POST /api/artworks/:id/approve` | 20/min | — |
| `POST /api/venues/:id/wallspaces` · `PATCH /api/wallspaces/:id` | 20/min | — |
| `POST /api/artworks/:id/reactions` | 60/min | — |
| `POST /api/artists/dismiss-momentum-banner` | 30/min | — |

### Analytics / Events

| Endpoint | IP limit |
|---|---|
| `POST /api/track` | 60/min |
| `POST /api/events` | 60/min |

### Public Contact Form

| Endpoint | IP limit |
|---|---|
| `POST /api/support/messages` | **5/hour** |

### Public Reads

| Category | IP limit |
|---|---|
| General reads (profiles, artworks, venues) | 120/min |
| Heavy reads (QR posters, detailed profiles) | 30/min |
| Admin endpoints | 60/min |

### Webhook (Stripe)

**Not rate-limited.** Stripe webhooks are verified via `stripe-signature` header
— never block by IP (Stripe IPs change without notice).

---

## Tuning Limits

### Via environment variables

Set `RATE_LIMIT_ENABLED` to `"false"` in `wrangler.toml` (or via `wrangler secret put`)
to disable all rate limiting. **Do not do this in production.**

```toml
# wrangler.toml
[vars]
RATE_LIMIT_ENABLED = "true"   # "false" to disable (dev only)
```

### Via code

All presets are in `ROUTE_LIMITS` at the bottom of
[worker/rateLimit.ts](../worker/rateLimit.ts). Adjust `limit` and `windowSec`:

```ts
'stripe-connect-artist-create': [
  ipRule('connect-create-ip', 'connect-artist-create', 10, 60),    // 10 per 60s
  userRule('connect-create-user', 'connect-artist-create', 20, 3600), // 20 per hour
],
```

---

## Enabling Cloudflare KV (Recommended for Production)

The in-memory fallback works but is **per-isolate** — different edge PoPs and
isolate recycling can reset counters. For durable, globally-consistent limiting:

```bash
# 1. Create the KV namespace
npx wrangler kv namespace create RATE_LIMIT_KV

# 2. Copy the id from the output and uncomment in wrangler.toml:
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<paste-id-here>"

# 3. Deploy
npx wrangler deploy --name artwalls-spacess-production
```

No code changes needed — the Worker automatically detects the binding.

---

## Cloudflare WAF Rate-Limiting Rules (Dashboard)

For an additional layer **in front of** the Worker:

1. Go to **Cloudflare Dashboard → artwalls.space → Security → WAF → Rate limiting rules**
2. Create a rule:
   - **Name:** API Rate Limit
   - **If:** URI Path starts with `/api/`
   - **Rate:** 300 requests per 1 minute (generous baseline)
   - **Counting expression:** IP
   - **Action:** Block for 60 seconds
3. Create a stricter rule for checkout:
   - **If:** URI Path equals `/api/stripe/create-checkout-session` AND Method equals `POST`
   - **Rate:** 10 requests per 1 minute
   - **Action:** Block for 120 seconds

These WAF rules run before the Worker even executes — blocking abusive IPs at
the edge with zero Worker CPU cost.

---

## Anti-Abuse Hardening

### Stripe Idempotency Keys

The checkout session endpoint generates a **deterministic idempotency key**:

```
key = "cs_" + sha256(artworkId + ":" + (userId|ip) + ":" + 10minWindow)
```

Retries within a 10-minute window reuse the same Stripe session instead of
creating duplicates. This protects against:
- Users double-clicking "Buy"
- Frontend retry logic
- Network timeouts causing re-sends

### Body Size Enforcement

JSON POST endpoints enforce a **32 KB max body size** before parsing, returning
413 if exceeded. This prevents abuse via oversized payloads.

### Honeypot Fields

The support/contact form silently discards submissions where the hidden
`honeypot` / `website` field is filled — catching most bots without user friction.

---

## Supabase Cost Protection Notes

### Egress Risk — Image Storage

Artwork images are served from **Supabase Storage public buckets**. At scale this
can become the dominant cost line. Recommendations:

- **Now:** The `public/_headers` file sets `Cache-Control: public, max-age=31536000, immutable`
  for `/assets/*`. Supabase Storage URLs are **not** covered by this.
- **Recommended:** Add a custom domain (e.g. `images.artwalls.space`) as a
  Cloudflare-proxied CNAME pointing to your Supabase Storage bucket. Cloudflare
  will then cache images at the edge for free.
- **Alternative:** Move to Cloudflare R2 or Cloudinary for image hosting.

### Query Protection

- All public-facing read endpoints use `.select()` with specific columns (not `*`).
- List endpoints use `.limit()` (typically 50–100).
- Analytics/events endpoints are behind auth + rate limits.
- RLS is enabled on all user-facing tables.

---

## Testing

```bash
# Start local Worker
npx wrangler dev

# In another terminal
node tests/rate-limit.test.mjs
```

The test script hammers the support and checkout endpoints past their thresholds
and verifies 429 responses with proper format.
