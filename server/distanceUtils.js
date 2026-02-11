// @deprecated — Distance utils live in worker/index.ts.
throw new Error('server/distanceUtils.js is deprecated');

const MAJOR_US_CITIES = [
  // Northeast
  { name: 'New York', state: 'NY', lat: 40.7128, lng: -74.006 },
  { name: 'Boston', state: 'MA', lat: 42.3601, lng: -71.0589 },
  { name: 'Philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652 },
  { name: 'Washington', state: 'DC', lat: 38.9072, lng: -77.0369 },
  { name: 'Baltimore', state: 'MD', lat: 39.2904, lng: -76.6122 },
  { name: 'Pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959 },
  
  // Southeast
  { name: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { name: 'Charlotte', state: 'NC', lat: 35.2271, lng: -80.8431 },
  { name: 'Miami', state: 'FL', lat: 25.7617, lng: -80.1918 },
  { name: 'Tampa', state: 'FL', lat: 27.9506, lng: -82.4593 },
  { name: 'Orlando', state: 'FL', lat: 28.5421, lng: -81.3723 },
  { name: 'Memphis', state: 'TN', lat: 35.1495, lng: -90.049 },
  { name: 'Nashville', state: 'TN', lat: 36.1627, lng: -86.7816 },
  { name: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.2623 },
  { name: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 },
  { name: 'Houston', state: 'TX', lat: 29.7604, lng: -95.3698 },
  { name: 'Dallas', state: 'TX', lat: 32.7767, lng: -96.797 },
  { name: 'San Antonio', state: 'TX', lat: 29.4241, lng: -98.4936 },
  
  // Midwest
  { name: 'Chicago', state: 'IL', lat: 41.8781, lng: -87.6298 },
  { name: 'Detroit', state: 'MI', lat: 42.3314, lng: -83.0458 },
  { name: 'Cleveland', state: 'OH', lat: 41.4993, lng: -81.6944 },
  { name: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 },
  { name: 'Cincinnati', state: 'OH', lat: 39.1131, lng: -84.5080 },
  { name: 'Milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065 },
  { name: 'Minneapolis', state: 'MN', lat: 44.9778, lng: -93.265 },
  { name: 'St. Louis', state: 'MO', lat: 38.6270, lng: -90.1994 },
  { name: 'Kansas City', state: 'MO', lat: 39.0997, lng: -94.5786 },
  { name: 'Indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581 },
  
  // Southwest
  { name: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.074 },
  { name: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 },
  { name: 'Albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504 },
  
  // West Coast
  { name: 'Los Angeles', state: 'CA', lat: 34.0522, lng: -118.2437 },
  { name: 'San Diego', state: 'CA', lat: 32.7157, lng: -117.1611 },
  { name: 'San Francisco', state: 'CA', lat: 37.7749, lng: -122.4194 },
  { name: 'Oakland', state: 'CA', lat: 37.8044, lng: -122.2712 },
  { name: 'San Jose', state: 'CA', lat: 37.3382, lng: -121.8863 },
  { name: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 },
  { name: 'Seattle', state: 'WA', lat: 47.6062, lng: -122.3321 },
  { name: 'Portland', state: 'OR', lat: 45.5152, lng: -122.6784 },
  { name: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 },
  { name: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.891 },
  
  // Additional Major Cities
  { name: 'Louisville', state: 'KY', lat: 38.2527, lng: -85.7585 },
  { name: 'Long Beach', state: 'CA', lat: 33.7701, lng: -118.1937 },
  { name: 'Tucson', state: 'AZ', lat: 32.2226, lng: -110.9747 },
  { name: 'Mesa', state: 'AZ', lat: 33.4152, lng: -111.831 },
  { name: 'Colorado Springs', state: 'CO', lat: 38.8339, lng: -104.8202 },
  { name: 'Arlington', state: 'TX', lat: 32.7357, lng: -97.2246 },
];

/**
 * Get city by name and state (case-insensitive)
 */
function getCityByName(nameStr, state) {
  const cleanName = (nameStr || '').toLowerCase().trim();
  return MAJOR_US_CITIES.find(
    (city) =>
      city.name.toLowerCase() === cleanName &&
      (!state || city.state.toUpperCase() === state.toUpperCase())
  );
}

/**
 * Parse city name from "City, ST" format
 */
function parseCityName(cityStr) {
  if (!cityStr) return { name: '', state: '' };
  const parts = cityStr.split(',').map(p => p.trim());
  return {
    name: parts[0] || '',
    state: parts[1] || ''
  };
}

/**
 * Convert degrees to radians
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculate distance between two cities using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if artist city is within 50 miles of venue city
 */
function isArtistNearVenue(artistCities, venueCity, radiusMiles = 50) {
  if (!venueCity) return true; // No venue city filter, show all
  
  const venueCityObj = getCityByName(venueCity);
  if (!venueCityObj) return false; // Invalid venue city
  
  // Check both primary and secondary artist cities
  const artistCitiesArray = [
    artistCities?.primary,
    artistCities?.secondary
  ].filter(Boolean);
  
  return artistCitiesArray.some(artistCityStr => {
    const artistCityObj = getCityByName(artistCityStr);
    if (!artistCityObj) return false;
    
    const distance = calculateDistance(
      artistCityObj.lat,
      artistCityObj.lng,
      venueCityObj.lat,
      venueCityObj.lng
    );
    return distance <= radiusMiles;
  });
}

/**
 * Check if venue city is within 50 miles of artist's cities
 */
function isVenueNearArtist(venueCityStr, artistCities, radiusMiles = 50) {
  if (!venueCityStr) return true; // No venue city, show all
  
  const venueCity = getCityByName(venueCityStr);
  if (!venueCity) return false; // Invalid venue city
  
  // Check both primary and secondary artist cities
  const artistCitiesArray = [
    artistCities?.primary,
    artistCities?.secondary
  ].filter(Boolean);
  
  return artistCitiesArray.some(artistCityStr => {
    const artistCity = getCityByName(artistCityStr);
    if (!artistCity) return false;
    
    const distance = calculateDistance(
      venueCity.lat,
      venueCity.lng,
      artistCity.lat,
      artistCity.lng
    );
    return distance <= radiusMiles;
  });
}

/**
 * Get the distance in miles between an artist's cities and a venue's city
 * Returns the minimum distance
 */
function getDistanceToVenue(artistCities, venueCityStr) {
  if (!venueCityStr) return null;
  
  const venueCity = getCityByName(venueCityStr);
  if (!venueCity) return null;
  
  const artistCitiesArray = [
    artistCities?.primary,
    artistCities?.secondary
  ].filter(Boolean);
  
  const distances = artistCitiesArray
    .map(artistCityStr => {
      const artistCity = getCityByName(artistCityStr);
      if (!artistCity) return null;
      
      return calculateDistance(
        artistCity.lat,
        artistCity.lng,
        venueCity.lat,
        venueCity.lng
      );
    })
    .filter(d => d !== null);
  
  return distances.length > 0 ? Math.min(...distances) : null;
}

module.exports = {
  getCityByName,
  parseCityName,
  calculateDistance,
  isArtistNearVenue,
  isVenueNearArtist,
  getDistanceToVenue,
  MAJOR_US_CITIES,
};
