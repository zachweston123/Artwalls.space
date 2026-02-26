# First-Win Measurement & Onboarding Definitions

## What "First Win" Means

### Artist First Win
The artist has completed all three steps:
1. **Profile complete** — name, bio, and city filled in
2. **First artwork published** — at least 1 artwork in the `artworks` table
3. **First application submitted** — at least 1 row in `applications` for this artist

### Venue First Win
The venue has completed all three steps:
1. **Profile complete** — name and address filled in
2. **First wall added** — at least 1 wallspace in the `wallspaces` table
3. **First call posted** — at least 1 call in the `calls_for_art` table

## Target: < 10 minutes for each role

Both checklists are designed so a motivated user can complete them in under 10 minutes.

## Analytics Events

| Event Name | Trigger | Properties |
|---|---|---|
| `signup_complete` | After successful email/Google signup | `role`, `method` |
| `first_artwork_published` | Artist publishes first artwork | `artworkId`, `minutesSinceSignup` |
| `first_call_published` | Venue posts first call | `callId`, `minutesSinceSignup` |
| `first_application_submitted` | Artist submits first application | `applicationId`, `minutesSinceSignup` |
| `time_to_first_win` | All 3 checklist items complete | `role`, `minutes` |
| `onboarding_finished` | Legacy event (also fires) | `stepsCompleted`, `role` |

All events are privacy-safe — no PII, only opaque IDs and durations.

## How to Verify Locally

1. **Start dev server:** `npm run dev`
2. **Create a new artist account** (or use an existing test account)
3. **Open browser DevTools → Network tab**, filter by `/api/analytics`
4. **Complete each checklist step** and verify events fire:
   - Navigate to artist dashboard → see `GettingStartedChecklist`
   - Click "Edit Profile" → fill in bio + city → save
   - Click "Add Artwork" → upload photo + set price → save
   - Click "Find Venues" → apply to a venue
5. **Check the `analytics_events` table** in Supabase:
   ```sql
   SELECT event_name, properties, created_at
   FROM analytics_events
   WHERE user_id = '<your-user-id>'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

## Checklist UI Behavior

- **Persistent**: Shows on every dashboard load until all items are complete
- **Dismissible**: User can hide it via the X button (stored in localStorage)
- **Progress bar**: Visual progress indicator (0/3 → 3/3)
- **Deep-links**: Each CTA navigates to the exact screen where the action is performed
- **Auto-detects completion**: Re-queries Supabase on each mount

## Time-to-First-Win Calculation

- Signup timestamp stored in `localStorage` as `artwalls_signup_ts_{userId}`
- When all checklist items are complete, delta computed:
  `minutes = (Date.now() - signupTimestamp) / 60000`
- Emitted as `time_to_first_win` event with `role` and `minutes`
