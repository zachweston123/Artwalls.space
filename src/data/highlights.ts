// Centralized venue highlights (labels)
// Grouped categories for UI organization, with optional tooltips.

export const VENUE_HIGHLIGHTS_GROUPS: Record<string, Array<{ label: string; tooltip?: string }>> = {
  'Ownership & Inclusivity': [
    { label: 'Locally owned' },
    { label: 'LGBTQ+ friendly' },
    { label: 'Women-owned' },
    { label: 'Black-owned' },
    { label: 'Veteran-owned' },
  ],
  'Accessibility & Audience': [
    { label: 'Wheelchair accessible' },
    { label: 'Family-friendly' },
    { label: 'Student-friendly' },
    { label: 'Dog-friendly' },
  ],
  'Atmosphere & Amenities': [
    { label: 'Live music venue' },
    { label: 'Late night hours' },
    { label: 'Outdoor seating' },
    { label: 'Full bar' },
    { label: 'Wine & beer only' },
    { label: 'Cafe onsite' },
    { label: 'Bar onsite' },
  ],
  'Venue Type & Vibe': [
    { label: 'Industrial loft', tooltip: 'Raw brick, exposed beams, warehouse aesthetic' },
    { label: 'Storefront gallery', tooltip: 'Street-level visibility, window displays' },
    { label: 'Hidden gem', tooltip: 'Intimate, off-the-beaten-path location' },
    { label: 'Rooftop space', tooltip: 'Elevated venue with views' },
    { label: 'Bohemian atmosphere', tooltip: 'Eclectic, artistic, casual vibe' },
    { label: 'Modern minimalist', tooltip: 'Clean lines, contemporary space' },
    { label: 'Historic building', tooltip: 'Vintage architecture with character' },
  ],
  'Location & Foot Traffic': [
    { label: 'High foot traffic', tooltip: 'Busy pedestrian area' },
    { label: 'Arts district', tooltip: 'Located in creative neighborhood' },
    { label: 'Transit accessible', tooltip: 'Near public transportation' },
    { label: 'Weekend destination', tooltip: 'Popular weekend gathering spot' },
    { label: 'Emerging neighborhood', tooltip: 'Up-and-coming area with growth' },
    { label: 'Tourist hotspot', tooltip: 'Popular with visitors' },
  ],
  'Collaboration & Community': [
    { label: 'Artist residencies', tooltip: 'Offers studio space or residency programs' },
    { label: 'Community events', tooltip: 'Hosts workshops, talks, or artist meetups' },
    { label: 'Music collaborations', tooltip: 'Partners with musicians and performers' },
    { label: 'Local artist focus', tooltip: 'Primarily features emerging/local artists' },
    { label: 'International artists', tooltip: 'Showcases work from diverse origins' },
  ],
};

export const VENUE_HIGHLIGHTS: string[] = Object.values(VENUE_HIGHLIGHTS_GROUPS)
  .flat()
  .map((i) => i.label);
