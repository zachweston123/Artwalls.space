export interface VenueBasics {
  name: string;
  address: string;
  hours: string;
  website?: string;
  instagram?: string;
}

export interface VenueWall {
  type: 'single' | 'multiple' | 'rotating';
  dimensions?: string;
  displaySpots: number;
}

export interface VenueSetupData {
  basics: VenueBasics;
  photos: string[];
  wall: VenueWall;
  categories: string[];
  qrAssets: {
    generated: boolean;
    placement?: string;
  };
  status: 'draft' | 'pending_review' | 'approved' | 'live' | 'paused';
}

export interface SetupStep {
  id: number;
  key: string;
  title: string;
  description: string;
  recommendedDefaults?: Record<string, any>;
  helpText?: string;
}

export const SETUP_STEPS: SetupStep[] = [
  {
    id: 1,
    key: 'basics',
    title: 'Confirm Venue Basics',
    description: 'Let us know about your venue and how to reach you',
    helpText:
      'Complete venue information helps customers find you and verifies legitimacy with artists.',
    recommendedDefaults: {
      website: '',
      instagram: '',
    },
  },
  {
    id: 2,
    key: 'photos',
    title: 'Add Photos',
    description: 'Upload high-quality photos of your venue and wall space',
    helpText:
      'Great photos increase discoverability and help artists assess if your space matches their work.',
    recommendedDefaults: {
      minPhotos: 3,
      maxPhotos: 5,
      recommendedTypes: ['space overview', 'wall area', 'ambiance'],
    },
  },
  {
    id: 3,
    key: 'wall',
    title: 'Configure Wall',
    description: 'Tell us about your display space and capacity',
    helpText:
      'This helps artists understand space constraints and plan their work accordingly.',
    recommendedDefaults: {
      type: 'single',
      displaySpots: 1,
    },
  },
  {
    id: 4,
    key: 'categories',
    title: 'Categorize Venue',
    description: 'Select categories that represent your venue style',
    helpText:
      'Categories make your venue discoverable to artists working in your specialty areas.',
    recommendedDefaults: {
      categories: ['Contemporary', 'Local Artists'],
    },
  },
  {
    id: 5,
    key: 'signage',
    title: 'Signage & Launch',
    description: 'Generate QR assets and prepare to launch',
    helpText: 'After setup, download and print QR codes for your venue.',
    recommendedDefaults: {
      qrFormats: ['poster', 'table-tent', 'card'],
    },
  },
];

// Economics constants for consistency across the app
export const ECONOMICS = {
  BUYER_FEE: 0.045, // 4.5% (paid by buyer at checkout)
  VENUE_COMMISSION: 0.15, // 15% of list price (always)
  ARTIST_TIERS: {
    free: 0.6, // 60%
    starter: 0.8, // 80%
    growth: 0.83, // 83%
    pro: 0.85, // 85%
  },
  DESCRIPTIONS: {
    buyerFee: '4.5% buyer support fee (paid by customer)',
    venueCommission: '15% venue commission',
    artistFree: '60% for free tier artists',
    artistStarter: '80% for starter tier artists',
    artistGrowth: '83% for growth tier artists',
    artistPro: '85% for pro tier artists',
  },
};

export function calculateArtworkEconomics(price: number, tierKey: 'free' | 'starter' | 'growth' | 'pro') {
  const buyerFee = price * ECONOMICS.BUYER_FEE;
  const venueCommission = price * ECONOMICS.VENUE_COMMISSION;
  const artistEarnings = price * ECONOMICS.ARTIST_TIERS[tierKey];

  return {
    price,
    buyerFee,
    venueCommission,
    artistEarnings,
    totalDeductions: buyerFee + venueCommission,
  };
}

export interface HealthChecklistItem {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'optional';
  action: string;
  actionPath: string;
}

export function generateDefaultHealthChecklist(venueData: any): HealthChecklistItem[] {
  return [
    {
      id: 'photos',
      title: 'Photos Added',
      description: `${venueData?.photos?.length || 0} of 3+ photos uploaded`,
      status: (venueData?.photos?.length || 0) >= 3 ? 'completed' : 'pending',
      action: 'Add Photos',
      actionPath: 'venue-setup',
    },
    {
      id: 'profile',
      title: 'Profile Published',
      description: 'Your venue profile is published and visible',
      status:
        venueData?.status === 'live' || venueData?.status === 'approved'
          ? 'completed'
          : 'pending',
      action: 'Publish',
      actionPath: 'venue-settings',
    },
    {
      id: 'wall',
      title: 'Wall Configured',
      description: `${venueData?.wall?.type || 'Not set'} wall with ${venueData?.wall?.displaySpots || 0} display spots`,
      status: venueData?.wall?.type ? 'completed' : 'pending',
      action: 'Configure',
      actionPath: 'venue-setup',
    },
    {
      id: 'qr',
      title: 'QR Assets Downloaded',
      description: 'Poster and table tent QR codes ready for printing',
      status: venueData?.qrDownloaded ? 'completed' : 'pending',
      action: 'Download',
      actionPath: 'venue-partner-kit',
    },
    {
      id: 'placement',
      title: 'QR Placement Confirmed',
      description: 'QR codes printed and placed in your venue',
      status: venueData?.qrPlaced ? 'completed' : 'pending',
      action: 'Mark Complete',
      actionPath: 'venue-dashboard',
    },
    {
      id: 'share',
      title: 'Shared Venue Page',
      description: 'Optional: Share your venue page on social media',
      status: 'optional',
      action: 'Share',
      actionPath: 'venue-dashboard',
    },
  ];
}
