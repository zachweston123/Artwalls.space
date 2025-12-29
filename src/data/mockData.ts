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

export const mockArtworks: Artwork[] = [
  {
    id: '1',
    title: 'Sunset Boulevard',
    artistName: 'Sarah Chen',
    price: 450,
    imageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    description: 'Abstract interpretation of urban sunsets',
    status: 'active',
    venueId: '1',
    venueName: 'Brew & Palette Café',
    checkoutUrl: '',
  },
  {
    id: '2',
    title: 'Urban Dreams',
    artistName: 'Sarah Chen',
    price: 380,
    imageUrl: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800',
    description: 'Mixed media cityscape',
    status: 'available',
  },
  {
    id: '3',
    title: 'Morning Light',
    artistName: 'Sarah Chen',
    price: 520,
    imageUrl: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800',
    description: 'Watercolor landscape series',
    status: 'pending',
    venueId: '2',
    venueName: 'The Artisan Lounge',
  },
  {
    id: '4',
    title: 'Reflections',
    artistName: 'Sarah Chen',
    price: 295,
    imageUrl: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    description: 'Contemporary abstract piece',
    status: 'sold',
    venueId: '1',
    venueName: 'Brew & Palette Café',
    checkoutUrl: '',
  },
];

export const mockVenues: Venue[] = [
  {
    id: '1',
    name: 'Brew & Palette Café',
    type: 'Coffee Shop',
    address: '123 Main Street, Downtown',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
    wallSpaces: 3,
    availableSpaces: 1,
    description: 'Cozy neighborhood café with exposed brick walls perfect for showcasing local art',
  },
  {
    id: '2',
    name: 'The Artisan Lounge',
    type: 'Wine Bar',
    address: '456 Oak Avenue, Arts District',
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800',
    wallSpaces: 4,
    availableSpaces: 2,
    description: 'Upscale wine bar featuring rotating exhibitions from emerging artists',
  },
  {
    id: '3',
    name: 'Sunrise Bistro',
    type: 'Restaurant',
    address: '789 Park Lane, Midtown',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    wallSpaces: 5,
    availableSpaces: 3,
    description: 'Modern bistro with bright, open dining spaces ideal for large-format artwork',
  },
  {
    id: '4',
    name: 'Corner Grind',
    type: 'Coffee Shop',
    address: '321 Elm Street, Westside',
    imageUrl: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800',
    wallSpaces: 2,
    availableSpaces: 2,
    description: 'Minimalist coffee spot looking for contemporary pieces',
  },
];

export const mockWallSpaces: WallSpace[] = [
  {
    id: 'w1',
    name: 'Main Wall',
    width: 96,
    height: 72,
    available: false,
    currentArtworkId: '1',
    photos: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'],
    description: 'Main wall in the café, prominently displayed',
  },
  {
    id: 'w2',
    name: 'Side Wall',
    width: 60,
    height: 48,
    available: true,
  },
  {
    id: 'w3',
    name: 'Corner Space',
    width: 48,
    height: 60,
    available: false,
    currentArtworkId: '5',
  },
];

export const mockApplications: Application[] = [
  {
    id: 'app1',
    artworkId: '6',
    artworkTitle: 'Coastal Memories',
    artistName: 'Marcus Rodriguez',
    artworkImage: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800',
    venueId: '1',
    venueName: 'Brew & Palette Café',
    status: 'pending',
    appliedDate: '2025-12-20',
  },
  {
    id: 'app2',
    artworkId: '7',
    artworkTitle: 'Digital Nature',
    artistName: 'Emma Thompson',
    artworkImage: 'https://images.unsplash.com/photo-1536924430914-91f9e2041b83?w=800',
    venueId: '1',
    venueName: 'Brew & Palette Café',
    status: 'pending',
    appliedDate: '2025-12-22',
  },
  {
    id: 'app3',
    artworkId: '8',
    artworkTitle: 'Urban Jungle',
    artistName: 'Alex Kim',
    artworkImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
    venueId: '1',
    venueName: 'Brew & Palette Café',
    status: 'approved',
    appliedDate: '2025-12-18',
  },
];

export const mockSales: Sale[] = [
  {
    id: 's1',
    artworkId: '4',
    artworkTitle: 'Reflections',
    artworkImage: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    artistName: 'Sarah Chen',
    venueName: 'Brew & Palette Café',
    price: 295,
    artistEarnings: 236,
    venueEarnings: 29.50,
    platformFee: 29.50,
    saleDate: '2025-12-20',
  },
  {
    id: 's2',
    artworkId: '9',
    artworkTitle: 'Golden Hour',
    artworkImage: 'https://images.unsplash.com/photo-1551732998-9d6c0b9c5fef?w=800',
    artistName: 'Sarah Chen',
    venueName: 'The Artisan Lounge',
    price: 680,
    artistEarnings: 544,
    venueEarnings: 68,
    platformFee: 68,
    saleDate: '2025-12-15',
  },
  {
    id: 's3',
    artworkId: '10',
    artworkTitle: 'Midnight City',
    artworkImage: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?w=800',
    artistName: 'Sarah Chen',
    venueName: 'Brew & Palette Café',
    price: 425,
    artistEarnings: 340,
    venueEarnings: 42.50,
    platformFee: 42.50,
    saleDate: '2025-12-10',
  },
];

export const mockInstalledArtworks: InstalledArtwork[] = [
  {
    id: 'ia1',
    artworkId: '1',
    artworkTitle: 'Sunset Boulevard',
    artworkImage: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    artistName: 'Sarah Chen',
    price: 450,
    wallSpaceId: 'w1',
    wallSpaceName: 'Main Wall',
    installDate: '2025-11-15',
    endDate: '2026-02-15',
    status: 'active',
    scheduledInstall: 'Thu 4:30 PM',
    installConfirmed: true,
  },
  {
    id: 'ia2',
    artworkId: '3',
    artworkTitle: 'Morning Light',
    artworkImage: 'https://images.unsplash.com/photo-1549887534-1541e9326642?w=800',
    artistName: 'Sarah Chen',
    price: 520,
    wallSpaceId: 'w3',
    wallSpaceName: 'Corner Space',
    installDate: '2025-12-01',
    endDate: '2026-01-05',
    status: 'ending-soon',
    scheduledInstall: 'Thu 5:00 PM',
    installConfirmed: true,
  },
  {
    id: 'ia3',
    artworkId: '4',
    artworkTitle: 'Reflections',
    artworkImage: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=800',
    artistName: 'Sarah Chen',
    price: 295,
    wallSpaceId: 'w1',
    wallSpaceName: 'Main Wall',
    installDate: '2025-10-01',
    endDate: '2025-12-20',
    status: 'sold',
    scheduledPickup: 'Thu 5:15 PM',
    installConfirmed: true,
    pickupConfirmed: false,
  },
];

export const mockVenueSchedule: VenueScheduleConfig = {
  dayOfWeek: 'Thursday',
  startTime: '16:00',
  endTime: '18:00',
  timezone: 'PST',
};

export const mockNotifications: Notification[] = [
  {
    id: 'n1',
    type: 'application-approved',
    title: 'Application Approved!',
    message: 'Your artwork "Urban Dreams" has been approved by Brew & Palette Café',
    timestamp: '2025-12-24T10:30:00',
    isRead: false,
    ctaLabel: 'Schedule Install',
    ctaAction: 'schedule-install',
    artworkId: '2',
  },
  {
    id: 'n2',
    type: 'install-reminder',
    title: 'Install Tomorrow',
    message: 'Reminder: Install "Sunset Boulevard" tomorrow at 4:30 PM',
    timestamp: '2025-12-24T09:00:00',
    isRead: false,
    ctaLabel: 'View Details',
  },
  {
    id: 'n3',
    type: 'artwork-sold',
    title: 'Artwork Sold!',
    message: 'Congratulations! "Reflections" has been sold for $295',
    timestamp: '2025-12-20T14:22:00',
    isRead: true,
    ctaLabel: 'Schedule Pickup',
    ctaAction: 'schedule-pickup',
    artworkId: '4',
  },
  {
    id: 'n4',
    type: 'pickup-scheduled',
    title: 'Pickup Scheduled',
    message: 'Pickup scheduled for "Reflections" on Thursday at 5:15 PM',
    timestamp: '2025-12-20T15:00:00',
    isRead: true,
  },
];