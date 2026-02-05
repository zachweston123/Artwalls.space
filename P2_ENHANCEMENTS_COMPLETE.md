# P2 Enhancements Implementation Summary

All P2 enhancements from the audit have been implemented. These are optional improvements for performance, observability, and developer experience.

## F7: Database Indexes (Performance)

**File:** [supabase/migrations/20260205_p2_enhancements.sql](supabase/migrations/20260205_p2_enhancements.sql)

**Added Indexes:**
1. `orders_payout_status_partial_idx` - Fast queries for stuck/pending payouts (excludes 'paid' rows)
2. `orders_stripe_payment_intent_idx` - Fast webhook processing lookups
3. `orders_artist_status_idx` - Artist dashboard order filtering
4. `orders_venue_status_idx` - Venue dashboard order filtering
5. `events_type_created_idx` - Time-series analytics queries
6. `events_artwork_type_created_idx` - Artwork funnel analysis
7. `events_venue_type_created_idx` - Venue analytics

**Deployment:**
```bash
cd supabase
supabase db push
# Or if using migrations directly:
psql $DATABASE_URL -f migrations/20260205_p2_enhancements.sql
```

**Verification:**
```sql
-- Check indexes were created
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('orders', 'events') 
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

---

## F8: Payout Retry Cron Job (Reliability)

**File:** [worker/index.ts](worker/index.ts#L4660-L4804) (scheduled handler)

**Functionality:**
- Runs hourly to find orders stuck in `payout_status='pending_transfer'` for >1 hour
- Retries Stripe transfer creation for artist + venue
- Processes max 50 orders per run to avoid timeouts
- Updates orders to `payout_status='paid'` on success

**Setup:**

1. Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 * * * *"]  # Runs hourly
```

2. Deploy worker:
```bash
cd worker
wrangler deploy
```

3. Test manually:
```bash
# Trigger cron immediately (for testing)
wrangler publish
curl -X POST https://your-worker.workers.dev/__scheduled?cron=0+*+*+*+*
```

**Monitoring:**
- Check Cloudflare Workers dashboard → Logs → Filter by "[Cron]"
- Expect: "Starting payout retry job" → "Found X stuck orders" → "Successfully retried order Y"

**Example config:** [worker/cron-config.example.toml](worker/cron-config.example.toml)

---

## F9: Supabase Error Handling (DX Improvement)

**File:** [src/lib/supabaseErrors.ts](src/lib/supabaseErrors.ts)

**Utilities:**
- `parseSupabaseError(error)` - Maps Postgres error codes to user-friendly messages
- `isPermissionDenied(error)` - Quick check for RLS violations (42501)
- `isDuplicateError(error)` - Quick check for unique constraint violations (23505)
- `getErrorMessage(error)` - Extract user-friendly message
- `logSupabaseError(error, context)` - Structured logging for debugging

**Usage Example:**
```typescript
import { parseSupabaseError, isPermissionDenied } from '@/lib/supabaseErrors';

const { error } = await supabase.from('orders').insert({ ... });

if (error) {
  const parsed = parseSupabaseError(error);
  
  if (parsed.isPermissionDenied) {
    toast.error('You don't have permission to create orders');
    return;
  }
  
  if (parsed.isUniqueViolation) {
    toast.error('This order already exists');
    return;
  }
  
  // Generic fallback
  toast.error(parsed.message);
}
```

**Supported Error Codes:**
- `42501` - Insufficient privilege (RLS policy violation)
- `23505` - Unique violation (duplicate record)
- `23503` - Foreign key violation (referenced record missing)
- `23502` - Not null violation (required field missing)
- `23514` - Check constraint violation
- `42P01` - Undefined table (table not found)
- `08006` - Connection failure

**Integration Points:**
Apply this utility in:
- Frontend form submissions (artworks, orders, bookings)
- Artist/venue dashboard actions
- Worker API endpoints (wrap Supabase calls)

---

## Impact Summary

| Enhancement | Category | Impact | Effort |
|------------|----------|--------|--------|
| F7 - Indexes | Performance | 🔥 High (10-100x faster queries on large datasets) | Low (1 migration) |
| F8 - Cron | Reliability | 🔥 High (auto-recovers stuck payouts) | Medium (cron handler + config) |
| F9 - Errors | DX | 🌟 Medium (better UX for error states) | Low (utility library) |

---

## Deployment Checklist

- [ ] Run P2 migration: `supabase db push` or apply [20260205_p2_enhancements.sql](supabase/migrations/20260205_p2_enhancements.sql)
- [ ] Add cron trigger to `wrangler.toml` (see [cron-config.example.toml](worker/cron-config.example.toml))
- [ ] Deploy worker: `wrangler deploy`
- [ ] Verify cron runs: Check Cloudflare dashboard logs after 1 hour
- [ ] Import `supabaseErrors.ts` in frontend forms (optional, can be gradual)
- [ ] Monitor index usage: Query `pg_stat_user_indexes` after 1 week

---

## Testing

**F7 - Indexes:**
```sql
-- Before: Full table scan
EXPLAIN ANALYZE SELECT * FROM orders WHERE payout_status = 'pending_transfer';

-- After: Should use orders_payout_status_partial_idx
EXPLAIN ANALYZE SELECT * FROM orders WHERE payout_status = 'pending_transfer';
```

**F8 - Cron:**
```bash
# 1. Create test stuck order in DB
UPDATE orders SET payout_status = 'pending_transfer', created_at = now() - interval '2 hours' WHERE id = '...';

# 2. Trigger cron manually
wrangler publish
curl -X POST https://worker.artwalls.workers.dev/__scheduled?cron=0+*+*+*+*

# 3. Verify order updated to 'paid'
SELECT id, payout_status, transfer_ids FROM orders WHERE id = '...';
```

**F9 - Error Handling:**
```typescript
// Test permission denied
const { error } = await supabase.from('orders').insert({ /* wrong user */ });
console.log(parseSupabaseError(error)); // Should show "You do not have permission..."

// Test unique violation
const { error } = await supabase.from('artists').insert({ email: 'existing@email.com' });
console.log(parseSupabaseError(error)); // Should show "email with this value already exists"
```

---

## Rollback Plan

**If issues arise:**

1. **F7 Indexes:** Drop indexes without affecting data
   ```sql
   DROP INDEX IF EXISTS orders_payout_status_partial_idx;
   -- ... (drop others as needed)
   ```

2. **F8 Cron:** Remove `[triggers]` section from `wrangler.toml` and redeploy
   ```bash
   # Comment out in wrangler.toml:
   # [triggers]
   # crons = ["0 * * * *"]
   wrangler deploy
   ```

3. **F9 Errors:** Simply don't import the utility (no side effects)

All P2 enhancements are non-breaking and can be deployed/rolled back independently.
