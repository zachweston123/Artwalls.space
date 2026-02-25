/**
 * Route module barrel — re-exports every route handler for the
 * thin entrypoint router.
 */

export { handleAnalytics } from './analytics';
export { handleAuth } from './auth';
export { handleArtists } from './artists';
export { handleAdmin } from './admin';
export { handleStripe } from './stripe';
export { handleVenues } from './venues';
export { handleArtworks } from './artworks';
export { handlePublic } from './public';
export { handleVenueInvites } from './venue-invites';
export { handleMisc } from './misc';
