# Public Artist Profile - Debug & Fix Report

## 🔴 THE PROBLEM

When visiting `/artists/f8b30ba3-3237-43b2-b458-6d35b9e838d8` (a valid artist's UUID), the page displays **"Artist not found"** error.

This affects:
- Artists clicking "View Public Profile" button
- Customers scanning QR codes and clicking artist names
- Direct URL navigation to public profiles

## 🔍 ROOT CAUSE ANALYSIS

### Step 1: Trace the Route Parameter
- **URL Format**: `/artists/{param}`
- **Param Type**: UUID (e.g., `f8b30ba3-3237-43b2-b458-6d35b9e838d8`)
- **What it Is**: The Supabase auth `user.id` 
- **Where It Comes From**: `ArtistProfile.tsx` → `getPublicProfilePath()` → returns `/artists/{slug || userId}`

### Step 2: Identify Database Schema
**Artist Identity Mapping**:
- `artists.id` = Supabase auth `user.id` (UUID)
- When artist signs up: auth.users.id is auto-generated UUID
- Artist profile row is created with `artists.id` = auth user id (via upsert on `artists.id`)
- Artist can optionally set a `slug` field
- If no slug, the UUID is used as the identifier

**Confirmed in code**:
- [ArtistProfile.tsx](src/components/artist/ArtistProfile.tsx#L75-80): Creates artist row with `id: user.id`
- [worker/index.ts](worker/index.ts#L305): Upserts artists on conflict with `onConflict: 'id'`

### Step 3: Trace the Lookup Logic

**OLD CODE** (Before Fix - BROKEN):
```tsx
// PublicArtistPage.tsx
import { supabase } from '../lib/supabase';  // ← anon client

const { data } = await supabase
  .from('artists')
  .select(...)
  .eq('id', identifier)  // ← querying with anon client
  .maybeSingle();
```

**Problem**: 
- Component used the **anon Supabase client** (no auth credentials)
- The `artists` table likely has RLS policies that block unauthenticated reads
- Query returns `null` (silent failure)
- Component shows "Artist not found"

### Step 4: Verify Public Endpoint Exists
**Good News**: The worker already has a public endpoint designed for this!
- **Endpoint**: `GET /api/public/artists/{id-or-slug}`
- **Authentication**: Public (no auth required)
- **Response**: `{ artist, forSale, onDisplay, sets }`
- **Located**: [worker/index.ts#L6195](worker/index.ts#L6195)

The endpoint handles:
- Lookup by UUID or slug
- Fallback to UID parameter if primary lookup fails
- Returns properly formatted data for the frontend

## ✅ THE FIX

### Changed Files

#### 1. **[src/pages/PublicArtistPage.tsx](src/pages/PublicArtistPage.tsx)**

**Change**: Import + query method
```diff
- import { supabase } from '../lib/supabase';
+ import { apiGet } from '../lib/api';

- const { data } = await supabase
-   .from('artists')
-   .select(...)
-   .eq('id', decoded)
-   .maybeSingle();

+ const response = await apiGet<any>(
+   `/api/public/artists/${encodeURIComponent(decoded)}` +
+   (uid ? `?uid=${encodeURIComponent(uid)}` : '')
+ );
+ const artistRow = response?.artist;
```

**Why This Works**:
- ✅ Uses worker API which has proper admin auth
- ✅ Worker endpoint handles RLS correctly
- ✅ Public access for unauthenticated customers (QR scan flow)
- ✅ Fallback to UID parameter if primary lookup fails
- ✅ Proper error handling

### How It Works Now

**Flow for authenticated artist viewing own profile**:
1. Artist clicks "View Public Profile" in settings
2. → generates `/artists/{userId}` or `/artists/{slug}` 
3. → App.tsx routes to `PublicArtistPage`
4. → component calls `apiGet('/api/public/artists/{id-or-slug}')`
5. → worker has admin auth, queries database directly
6. → returns artist data + public artworks
7. → profile displays correctly ✅

**Flow for unauthenticated customer (QR code)**:
1. Customer scans QR → lands on artwork page (PurchasePage)
2. Customer clicks artist name → `window.location.href = '/artists/{artistId}'`
3. → App.tsx routes to `PublicArtistPage`
4. → component calls `apiGet('/api/public/artists/{id}')`
5. → same worker endpoint (public access)
6. → profile displays correctly ✅

## 📋 Identity Mapping Summary

| Field | Value | Usage |
|-------|-------|-------|
| `auth.users.id` | UUID (e.g. `f8b30ba3...`) | Supabase auth primary key |
| `artists.id` | Same as `auth.users.id` | Artist profile primary key |
| `artists.slug` | Optional (e.g., `john-smith`) | Human-readable URL identifier |
| `artworks.artist_id` | References `artists.id` | Links artwork to artist |

**Lookup Precedence** (in worker endpoint):
1. Try UUID parameter → query `artists.id = param`
2. Try slug parameter → query `artists.slug = param`
3. Fallback: Try UID query param → query `artists.id = uid`

## ✅ VERIFICATION CHECKLIST

After deploying this fix, verify:

- [ ] Test 1: Artist visits `/artists/{their-uuid}` → shows profile
- [ ] Test 2: Artist visits `/artists/{their-slug}` → shows profile
- [ ] Test 3: Customer scans QR and clicks artist → shows profile
- [ ] Test 4: Invalid UUID `/artists/invalid-uuid-xyz` → shows "Artist not found" with Go Back button
- [ ] Test 5: Check browser console for no errors
- [ ] Test 6: Verify both authenticated and unauthenticated flows work

## 🔧 Related Components

- **[ArtistProfile.tsx](src/components/artist/ArtistProfile.tsx)** - Generates URLs with `getPublicProfilePath()`
- **[PurchasePage.tsx](src/components/PurchasePage.tsx)** - Creates artist links
- **[App.tsx](src/App.tsx)** - Routes `/artists/:param` to component
- **[worker/index.ts](worker/index.ts#L6195)** - Public API endpoint

## 📚 Future Improvements (Out of Scope)

1. **Handle System**: Implement `artists.handle` as alternative to UUID/slug
2. **Search & Discovery**: Add artist search on main page
3. **Profile Customization**: Let artists customize public profile appearance
4. **Social Links**: Add more social/portfolio options beyond Instagram
