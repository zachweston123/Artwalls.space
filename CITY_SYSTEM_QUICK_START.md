# City-Based System - Implementation Quick Start

## What Was Built

A complete city-based geographic matching system for Artwalls.space that organizes all artist-venue interactions by location within a 50-mile radius.

## Files Created/Modified

### New Files Created

1. **`src/data/cities.ts`** - City database with coordinates
   - 50+ major US cities with latitude/longitude
   - Distance calculation functions
   - City search/lookup utilities

2. **`src/components/shared/CitySelect.tsx`** - Reusable city selector component
   - Dropdown with search/autocomplete
   - Keyboard navigation support
   - Clean, accessible UI

3. **`server/distanceUtils.js`** - Backend distance calculations
   - Haversine formula implementation
   - City matching logic for filtering
   - Node.js compatible for server use

4. **`CITY_BASED_SYSTEM.md`** - Complete documentation

### Files Updated

1. **`src/components/artist/ArtistProfile.tsx`**
   - Replaced plain text inputs with `CitySelect` components
   - Display cities in view/edit modes
   - Support dual city entry (primary + secondary)

2. **`src/components/artist/FindVenues.tsx`**
   - Load artist's cities from profile
   - Pass cities to `/api/venues` endpoint for filtering
   - Display filtered results based on 50-mile radius

3. **`src/components/venue/FindArtists.tsx`**
   - Already supports venue city filtering (no changes needed)
   - API endpoint `/api/artists?city=VenueCity` filters by distance

4. **`server/index.js`**
   - Updated `GET /api/artists` endpoint with city filtering
   - Updated `GET /api/venues` endpoint with city filtering
   - Uses `distanceUtils.js` for calculations

## How It Works

### 1. Artist Sets Their Cities

```
Artist Profile → Edit → Primary City: Portland, OR
                        Secondary City: Seattle, WA
                        → Save
```

### 2. System Filters Venues

```
Artist views "Find Venues"
↓
System loads artist's cities (Portland + Seattle)
↓
API call: GET /api/venues?artistPrimaryCity=Portland,OR&artistSecondaryCity=Seattle,WA
↓
Backend filters venues within 50 miles of EITHER city
↓
Artist sees venues in Portland AND Seattle areas
```

### 3. Venue Finds Artists

```
Venue has set their city: Portland, OR
↓
Venue views "Find Artists"
↓
System loads venue's city
↓
API call: GET /api/artists?city=Portland,OR
↓
Backend filters artists within 50 miles (from primary OR secondary city)
↓
Venue sees local artists
```

## Distance Calculation

Uses the **Haversine formula** - calculates great-circle distance between two points on Earth:

- 50 miles = ~80 km radius
- Accurate for distances up to thousands of miles
- Accounts for Earth's curvature

Example distances:
- Portland, OR to Seattle, WA = ~174 miles (artists in Seattle would NOT show for Portland venues)
- Portland, OR to Salem, OR = ~50 miles (artists in Salem would show for Portland venues)

## Data Format

Cities are stored in the database as strings:
- Format: `"City, ST"` (e.g., "Portland, OR", "New York, NY")
- Case-insensitive matching on backend
- Database indexes for fast lookups

## API Endpoints

### Find Artists (Venue Perspective)
```
GET /api/artists?city=Portland,OR
Returns: Artists whose primary OR secondary city is within 50 miles
```

### Find Venues (Artist Perspective)
```
GET /api/venues?artistPrimaryCity=Portland,OR&artistSecondaryCity=Seattle,WA
Returns: Venues within 50 miles of Portland OR Seattle
```

## Testing the System

### 1. Test City Selection
- Go to Artist Profile
- Click Edit
- Click primary/secondary city fields
- Search for "Portland"
- Select "Portland, OR"
- Save and verify it persists

### 2. Test Venue Filtering
- As artist, go to "Find Venues"
- Check browser network tab for API call
- Should see: `GET /api/venues?artistPrimaryCity=Portland,OR`
- Verify venues displayed are in Portland area

### 3. Test Artist Filtering
- As venue with city set, go to "Find Artists"
- Check browser network tab
- Should see: `GET /api/artists?city=Portland,OR`
- Verify artists are from Portland area

### 4. Test Distance Calculation
Open browser console and test:
```javascript
// Import cities module (if you need to test frontend distance)
import { calculateDistance, getCityByName } from '@/data/cities';

const portland = getCityByName('Portland', 'OR');
const seattle = getCityByName('Seattle', 'WA');
const distance = calculateDistance(
  portland.lat, portland.lng,
  seattle.lat, seattle.lng
);
console.log(distance); // ~174 miles
```

## Supported Cities

The system includes 50+ major US cities:

**Northwest**: Portland, Seattle
**Northeast**: Boston, Philadelphia, New York, Washington DC
**Southeast**: Atlanta, Miami, Austin, Houston, Dallas, New Orleans
**Midwest**: Chicago, Detroit, Minneapolis, St. Louis, Kansas City
**Southwest**: Phoenix, Las Vegas
**West Coast**: Los Angeles, San Francisco, San Diego, Sacramento
**Mountain**: Denver, Salt Lake City, Albuquerque

See `src/data/cities.ts` for complete list.

## Future Customization

### To Add More Cities
Edit `src/data/cities.ts`:
```javascript
{ name: 'Your City', state: 'XX', lat: 0.0000, lng: -0.0000 }
```

Get coordinates from Google Maps or similar.

### To Change Search Radius
Edit `server/index.js`:
```javascript
// Change 50 to your desired radius in miles
isArtistNearVenue(artistCities, venueCity, 50)
// or
isVenueNearArtist(venueCityStr, artistCities, 75)
```

### To Add Geographic Features
- Map visualization (Mapbox, Google Maps)
- Distance display on search results
- Radius slider for user preferences
- Automatic radius expansion for sparse regions

## Known Limitations

1. **Single city per venue** - Venues currently support one city. Could extend to dual cities like artists.

2. **Manual coordinate maintenance** - Cities hardcoded in database. Could integrate with geocoding API (Google Places, etc).

3. **No custom locations yet** - Limited to predefined cities. Could add user-defined locations.

4. **US only** - Currently supports US cities only. Could expand globally.

## Troubleshooting

### "No cities found" in dropdown
- Make sure `src/data/cities.ts` is properly imported
- Check browser console for errors

### Artists/venues not showing up after setting city
- Verify city name format: "City, ST"
- Check that other users actually exist in database in nearby areas
- Check browser network tab - verify API calls are being made

### Distance seems wrong
- Remember: 50 miles is actually pretty short distance
- Portland to Seattle is ~174 miles, too far to match
- Portland to Salem is ~50 miles, right at the edge
- Use test distances to verify

## Architecture Decisions

1. **Store city as text** - Simple, flexible, human-readable
   - Could optimize with geographic DB (PostGIS) for production scale

2. **Calculate distances in app** - O(n) filtering in memory
   - Scales fine for up to ~10,000 artists/venues
   - For larger scale, use database-native geospatial queries

3. **Dual cities for artists only** - Matches marketplace need
   - Artists work multiple locations (tour, commute)
   - Venues typically fixed to one location

4. **50-mile radius** - Reasonable commute distance
   - Could make configurable in settings
   - Clear business logic boundary

5. **Major cities only** - Reduces UI clutter
   - Artists still see results in nearby areas
   - Could add custom locations as future feature

## Support & Questions

Refer to:
- `CITY_BASED_SYSTEM.md` - Full technical documentation
- This file - Implementation guide
- Code comments in each file
