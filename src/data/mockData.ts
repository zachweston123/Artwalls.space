export interface Artwork {
  id: string;
  title: string;
  artistName: string;
  price: number;
  imageUrl: string;
  description: string;
  status: 'available' | 'pending' | 'active' | 'sold';
  venueId?: string;
  venueName?: string;

  // Payments (Stripe)
  // Option A: store a Stripe Payment Link (recommended for no-backend embeds)
  checkoutUrl?: string;
  // Option B: store a Stripe Price ID for server-created Checkout Sessions
  stripePriceId?: string;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  address: string;
  imageUrl: string;
  wallSpaces: number;
  availableSpaces: number;
  description: string;
}

export interface WallSpace {
  id: string;
  name: string;
  width: number;
  height: number;
  available: boolean;
  currentArtworkId?: string;
  photos?: string[];
  description?: string;
}

export interface Application {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artistName: string;
  artworkImage: string;
  venueId: string;
  venueName: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
}

export interface Sale {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkImage: string;
  artistName: string;
  venueName: string;
  price: number;
  artistEarnings: number;
  venueEarnings: number;
  platformFee: number;
  saleDate: string;
}

export interface InstalledArtwork {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkImage: string;
  artistName: string;
  price: number;
  wallSpaceId: string;
  wallSpaceName: string;
  installDate: string;
  endDate: string;
  status: 'active' | 'sold' | 'ending-soon' | 'needs-pickup' | 'ended';
  scheduledInstall?: string; // e.g., "Thu 4:30 PM"
  scheduledPickup?: string; // e.g., "Thu 5:15 PM"
  installConfirmed?: boolean;
  pickupConfirmed?: boolean;
}

export interface VenueScheduleConfig {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface Notification {
  id: string;
  type: 'application-approved' | 'install-scheduled' | 'install-reminder' | 'artwork-sold' | 'pickup-scheduled' | 'pickup-reminder';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  ctaLabel?: string;
  ctaAction?: string;
  artworkId?: string;
}

export const mockArtworks: Artwork[] = [];

export const mockVenues: Venue[] = [];

export const mockWallSpaces: WallSpace[] = [];

export const mockApplications: Application[] = [];

export const mockSales: Sale[] = [];

export const mockInstalledArtworks: InstalledArtwork[] = [];

export const mockVenueSchedule: VenueScheduleConfig = {
  dayOfWeek: 'Thursday',
  startTime: '16:00',
  endTime: '18:00',
  timezone: 'PST',
};

export const mockNotifications: Notification[] = [];
