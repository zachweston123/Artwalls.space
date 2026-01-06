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
  'Art Display Readiness': [
    { label: 'Rotating exhibitions', tooltip: 'Regularly rotates displayed artwork' },
    { label: 'Gallery-style walls', tooltip: 'Clean, professional wall surfaces' },
    { label: 'Dedicated lighting', tooltip: 'Spotlighting or gallery lights for art' },
    { label: 'Secure hanging systems', tooltip: 'Hardware suitable for framed works' },
    { label: 'Climate controlled', tooltip: 'Temperature/humidity suitable for art' },
  ],
  'Logistics & Reach': [
    { label: 'High foot traffic' },
    { label: 'Weekend peak hours' },
    { label: 'Downtown location' },
    { label: 'Neighborhood favorite' },
  ],
  'Safety & Assurance': [
    { label: 'Insurance coverage', tooltip: 'Venue carries insurance for displayed works' },
  ],
};

export const VENUE_HIGHLIGHTS: string[] = Object.values(VENUE_HIGHLIGHTS_GROUPS)
  .flat()
  .map((i) => i.label);
