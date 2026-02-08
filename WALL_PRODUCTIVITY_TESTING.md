# Wall Productivity Tracking — How to Test Locally

## 1. Run the migration

Apply the new migration against your local/dev Supabase instance:

```bash
# Via Supabase CLI
supabase db push

# Or directly:
psql "$DATABASE_URL" -f supabase/migrations/20260208_wall_productivity.sql
```

Verify the table exists:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'app_events' ORDER BY ordinal_position;
```

## 2. Start the dev servers

```bash
# Terminal 1 — Express server (handles Stripe webhooks)
cd server && node index.js

# Terminal 2 — Cloudflare Worker (handles /api/track + /api/admin/wall-productivity)
npx wrangler dev worker/index.ts

# Terminal 3 — Vite frontend
npm run dev
```

## 3. Test each funnel step

### A. QR Scan + Artwork View

1. Open `http://localhost:5173/#/purchase-<ARTWORK_UUID>` (simulates a QR scan)
2. Check the `app_events` table:
   ```sql
   SELECT event_type, session_id, artwork_id, created_at
   FROM app_events ORDER BY created_at DESC LIMIT 10;
   ```
3. You should see exactly **one** `qr_scan` and **one** `artwork_view` row.
4. Reload the page — **no** new rows should be created (dedupe via unique index).

### B. Checkout Start

1. On the artwork purchase page, click **"Buy This Artwork"**
2. Check the table for a new `checkout_start` row.

### C. Purchase (via Stripe webhook)

Use the Stripe CLI to forward webhooks locally:
```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

1. Complete a test purchase using a Stripe test card.
2. When the `checkout.session.completed` webhook fires, verify a `purchase` row exists:
   ```sql
   SELECT event_type, order_id, stripe_checkout_session_id, metadata
   FROM app_events WHERE event_type = 'purchase';
   ```
3. The `metadata` JSONB should contain: `list_price_cents`, `platform_fee_cents`, `venue_payout_cents`, `artist_payout_cents`.
4. Re-send the same webhook — **no** duplicate row should be created (idempotent via `app_events_dedup_purchase_idx`).

## 4. Test the Admin Dashboard

1. Log in as an admin user.
2. In the sidebar, click **"Wall Productivity"**.
3. Verify the page loads with:
   - 4 funnel KPI cards (Scans, Views, Checkouts, Purchases)
   - Conversion rates (Scan → Checkout, Checkout → Purchase)
   - Scans-by-venue table
   - Top-artworks table
4. Toggle the 7d / 14d / 30d period buttons — data should update.

## 5. Verify RLS

```sql
-- As anon/public role: should return 0 rows
SET ROLE anon;
SELECT * FROM app_events; -- should fail or return empty

-- As service_role: should succeed
SET ROLE service_role;
SELECT count(*) FROM app_events;
```

## 6. Verify dedupe edge cases

```sql
-- Insert the same qr_scan twice in the same minute → second should fail with unique_violation
INSERT INTO app_events (event_type, session_id, artwork_id, venue_id)
VALUES ('qr_scan', 'test-session', '<artwork-id>', '<venue-id>');

INSERT INTO app_events (event_type, session_id, artwork_id, venue_id)
VALUES ('qr_scan', 'test-session', '<artwork-id>', '<venue-id>');
-- ^ ERROR: duplicate key value violates unique constraint

-- Insert the same purchase for the same order → second should fail
INSERT INTO app_events (event_type, session_id, order_id)
VALUES ('purchase', 'test-session', '<order-id>');

INSERT INTO app_events (event_type, session_id, order_id)
VALUES ('purchase', 'test-session', '<order-id>');
-- ^ ERROR: duplicate key value violates unique constraint
```

## Files Changed

| File | What changed |
|------|-------------|
| `supabase/migrations/20260208_wall_productivity.sql` | New `app_events` table, dedupe indexes, RLS, `wall_productivity_metrics` RPC |
| `src/lib/sessionId.ts` | Stable anonymous session ID (localStorage) |
| `src/lib/trackEvent.ts` | Client helpers: `trackQrScan`, `trackArtworkView`, `trackCheckoutStart` |
| `src/components/PurchasePage.tsx` | Calls new tracking on mount + checkout click |
| `worker/index.ts` | `POST /api/track` endpoint + `GET /api/admin/wall-productivity` |
| `server/index.js` | Purchase event logged in Stripe webhook handler |
| `src/components/admin/AdminWallProductivity.tsx` | New admin page component |
| `src/components/admin/AdminSidebar.tsx` | Added "Wall Productivity" nav item |
| `src/App.tsx` | Wired `AdminWallProductivity` into admin routing |
