# City-Based Artist & Venue System

## Overview

The Artwalls.space platform now features a comprehensive city-based system that organizes artists, venues, and interactions by geographic location. This ensures that:

- **Artists** only see venues within 50 miles of their selected cities
- **Venues** only see artists within 50 miles of their city
- **Data organization** is sorted and displayed by artist's two cities
- **Collaboration** happens naturally within geographic regions

## Key Features

### 1. Dual City Support for Artists
Artists can now set two cities:
- **Primary City** (required): Their main location
- **Secondary City** (optional): A second location they work in

This allows artists who work across multiple cities to showcase their work in both locations.

### 2. Intelligent Distance Filtering
Using the **Haversine formula**, the system calculates great-circle distances between cities:
- Artists are matched with venues **within 50 miles**
- Venues are matched with artists **within 50 miles**
- Both primary and secondary artist cities are considered

### 3. City Selection Interface
A user-friendly dropdown/search component allows artists to:
- Type or search for cities
- Select from a curated list of **50+ major US cities**
- See matched city results sorted by relevance
- Navigate with keyboard (↑↓ arrow keys, Enter to select, Esc to close)

## Architecture

### Data Layer

#### Database Schema
```sql
-- Artists table (already exists)
ALTER TABLE artists ADD COLUMN city_primary TEXT;
ALTER TABLE artists ADD COLUMN city_secondary TEXT;

-- Venues table (already exists)
ALTER TABLE venues ADD COLUMN city TEXT;

-- Indexes for performance
CREATE INDEX artists_city_primary_idx ON public.artists(city_primary);
CREATE INDEX artists_city_secondary_idx ON public.artists(city_secondary);
CREATE INDEX venues_city_idx ON public.venues(city);
```

### Frontend Components

#### CitySelect Component
**File**: `src/components/shared/CitySelect.tsx`

A reusable dropdown component with:
- Real-time city search
- Keyboard navigation
- Autocomplete suggestions
- Visual feedback and validation

**Usage**:
```tsx
<CitySelect
  value={cityPrimary}
  onChange={setCityPrimary}
  label="Primary City"
  placeholder="Search or select city..."
/>
```

#### ArtistProfile Component
**File**: `src/components/artist/ArtistProfile.tsx`

Updated to include:
- Primary city selector (required)
- Secondary city selector (optional)
- Visual display of selected cities
- Save/update functionality

### Backend/API Layer

#### Distance Utilities
**File**: `server/distanceUtils.js`

Core functions:
- `getCityByName()` - Parse and lookup city by name/state
- `calculateDistance()` - Haversine formula implementation
- `isArtistNearVenue()` - Check if artist cities are within 50 miles of venue
- `isVenueNearArtist()` - Check if venue city is within 50 miles of artist cities
- `getDistanceToVenue()` - Get exact distance in miles

#### API Endpoints

**GET /api/artists**
- Query parameter: `?city=VenueCityName`
- Returns: Artists within 50 miles of the venue's city
- Used by: Venues finding artists

Example:
```bash
curl "http://localhost:3000/api/artists?city=Portland,OR"
```

**GET /api/venues**
- Query parameters: `?artistPrimaryCity=CityName&artistSecondaryCity=CityName`
- Returns: Venues within 50 miles of either of the artist's cities
- Used by: Artists finding venues

Example:
```bash
curl "http://localhost:3000/api/venues?artistPrimaryCity=Portland,OR&artistSecondaryCity=Seattle,WA"
```

### Frontend Integration

#### FindVenues Component
**File**: `src/components/artist/FindVenues.tsx`

- Loads artist's primary and secondary cities from profile
- Passes both cities to `/api/venues` endpoint
- Filters venues within 50-mile radius of either city
- Displays results organized by proximity

#### FindArtists Component
**File**: `src/components/venue/FindArtists.tsx`

- Loads venue's city from profile
- Passes city to `/api/artists` endpoint
- Filters artists within 50-mile radius of venue
- Displays results organized by proximity

## City List

The system supports **50+ major US cities** across all regions:

### Northeast
- New York, Boston, Philadelphia, Washington DC, Baltimore, Pittsburgh

### Southeast
- Atlanta, Charlotte, Miami, Tampa, Orlando, Memphis, Nashville, New Orleans, Austin, Houston, Dallas, San Antonio

### Midwest
- Chicago, Detroit, Cleveland, Columbus, Cincinnati, Milwaukee, Minneapolis, St. Louis, Kansas City, Indianapolis

### Southwest
- Phoenix, Las Vegas, Albuquerque

### West Coast
- Los Angeles, San Diego, San Francisco, Oakland, San Jose, Sacramento, Seattle, Portland, Denver, Salt Lake City

And more...

## Distance Calculation

The system uses the **Haversine formula** to calculate distances:

$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1) \cos(\phi_2) \sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Where:
- $R$ = Earth's radius (3,959 miles)
- $\phi$ = latitude
- $\lambda$ = longitude

This gives accurate great-circle distances for matching artists and venues.

## User Workflows

### For Artists

1. **Sign Up / Edit Profile**
   - Navigate to Artist Profile
   - Click "Edit Profile"
   - Use city selectors to choose primary and secondary cities
   - Save changes

2. **Browse Venues**
   - Navigate to "Find Venues"
   - System automatically filters venues within 50 miles of selected cities
   - Browse and apply to venues in your areas

3. **Multiple City Support**
   - Set Portland, OR as primary city
   - Set Seattle, WA as secondary city
   - See venues in both cities on your Find Venues page
   - Your artworks are searchable in both cities

### For Venues

1. **Set Up Profile**
   - Navigate to Venue Profile
   - Set your city (e.g., Portland, OR)
   - Save

2. **Find Artists**
   - Navigate to "Find Artists"
   - System automatically shows artists within 50 miles
   - Search and invite local artists to display work

3. **Multiple Regions** (Future)
   - Venues can potentially support multiple cities
   - Currently limited to one city per venue

## Implementation Details

### How Filtering Works

**Finding Artists for a Venue:**
1. Venue provides their city (e.g., "Portland, OR")
2. API receives GET `/api/artists?city=Portland,OR`
3. For each artist in database:
   - Check if artist's primary city is within 50 miles of venue city
   - OR check if artist's secondary city is within 50 miles of venue city
   - Include artist if either condition is true
4. Return filtered artist list

**Finding Venues for an Artist:**
1. Artist provides primary city (required) and secondary city (optional)
2. API receives GET `/api/venues?artistPrimaryCity=Portland,OR&artistSecondaryCity=Seattle,WA`
3. For each venue in database:
   - Check if venue city is within 50 miles of artist's primary city
   - OR check if venue city is within 50 miles of artist's secondary city
   - Include venue if either condition is true
4. Return filtered venue list

### Performance Considerations

- City name is stored as text (e.g., "Portland, OR")
- Database indexes on `city_primary`, `city_secondary`, and `city` columns
- Distance calculations happen in application layer (not database)
- Filtering is efficient: O(n) where n = number of artists/venues
- For large datasets, could optimize with geographic databases (PostGIS)

## Future Enhancements

1. **Multiple Venues per City**
   - Extend venues to support multiple cities
   - Similar to artists' dual-city model

2. **Custom Distance Radius**
   - Allow users to adjust search radius (e.g., 30, 50, 100 miles)
   - Persistent user preferences

3. **Automatic Radius Adjustment**
   - In sparse regions, automatically expand search radius
   - Ensure artists/venues always have matches available

4. **Geographic Search**
   - Add map-based interface
   - Show artists/venues on interactive map
   - Visual radius visualization

5. **City Expansion**
   - Add smaller cities and custom locations
   - Allow users to input custom city names
   - Coordinate validation and storage

6. **Regional Analytics**
   - Dashboard showing artist/venue distribution by region
   - Hot spots and growth areas
   - Regional trending content

## Testing

### Manual Testing Checklist

- [ ] Artist can select primary city from dropdown
- [ ] Artist can select secondary city from dropdown
- [ ] City selection persists when saving profile
- [ ] Artist profile displays selected cities in view mode
- [ ] FindVenues filters by both primary and secondary cities
- [ ] FindArtists filters by venue city
- [ ] Distance calculations are accurate (manual spot checks)
- [ ] API parameters are correctly formatted in network requests
- [ ] Empty city selections don't break filtering

### Testing Commands

```bash
# Test artist listing with venue city filter
curl "http://localhost:3000/api/artists?city=Portland,OR"

# Test venue listing with artist city filters
curl "http://localhost:3000/api/venues?artistPrimaryCity=Portland,OR&artistSecondaryCity=Seattle,WA"

# Test without filters
curl "http://localhost:3000/api/artists"
curl "http://localhost:3000/api/venues"
```

## References

- [Haversine Formula](https://en.wikipedia.org/wiki/Haversine_formula)
- [Great-circle Distance](https://en.wikipedia.org/wiki/Great-circle_distance)
- Database indexing strategies for location-based queries
