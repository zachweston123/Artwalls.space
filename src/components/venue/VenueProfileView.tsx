import { MapPin, Edit, Flag, CheckCircle, Calendar } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { mockWallSpaces } from '../../data/mockData';
import type { User } from '../../App';

interface VenueProfileViewProps {
  isOwnProfile: boolean;
  onEdit?: () => void;
  onViewWallspaces?: () => void;
  onNavigate?: (page: string) => void;
  currentUser: User;
}

export function VenueProfileView({ 
  isOwnProfile, 
  onEdit, 
  onViewWallspaces,
  onNavigate,
  currentUser 
}: VenueProfileViewProps) {
  // Mock venue data - in real app would come from props or API
  const venue = {
    id: '1',
    name: 'Brew & Palette Café',
    coverPhoto: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200',
    location: 'Pearl District, Portland',
    bio: 'A cozy neighborhood café and art space in the heart of Portland\'s Pearl District. We\'ve been supporting local artists for over 8 years, providing rotating wall displays that complement our warm, inviting atmosphere. Our mission is to make art accessible while serving exceptional coffee.',
    labels: ['Locally owned', 'LGBTQ+ friendly', 'Dog-friendly', 'Student-friendly'],
    foundedYear: 2016,
    wallSpaces: 4,
    currentArtists: 3,
    installWindow: 'Mondays 10am-2pm',
    verified: true,
  };

  const allLabels = [
    'Locally owned', 'LGBTQ+ friendly', 'Women-owned', 'Black-owned',
    'Veteran-owned', 'Student-friendly', 'Family-friendly', 'Dog-friendly',
    'Wheelchair accessible', 'Live music venue', 'Late night hours'
  ];

  const yearsInBusiness = new Date().getFullYear() - venue.foundedYear;

  return (
    <div>
      {/* Cover Photo & Header */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 mb-6">
        {/* Cover Photo */}
        <div className="h-64 bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
          <img
            src={venue.coverPhoto}
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Header Info */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl">{venue.name}</h1>
                {venue.verified && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{venue.location}</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Established {venue.foundedYear} • {yearsInBusiness} years in business
              </p>
            </div>
            
            {isOwnProfile && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-6 text-sm pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">Wall Spaces:</span>
              <span className="ml-2 text-neutral-900 dark:text-neutral-50">{venue.wallSpaces}</span>
            </div>
            <div>
              <span className="text-neutral-600 dark:text-neutral-400">Current Artists:</span>
              <span className="ml-2 text-neutral-900 dark:text-neutral-50">{venue.currentArtists}</span>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <h2 className="text-xl mb-3">About</h2>
        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">{venue.bio}</p>
      </div>

      {/* Venue Labels */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <h2 className="text-xl mb-4">Venue Highlights</h2>
        <div className="flex flex-wrap gap-2">
          {allLabels.map((label) => (
            <LabelChip
              key={label}
              label={label}
              selected={venue.labels.includes(label)}
              role="venue"
            />
          ))}
        </div>
      </div>

      {/* Install Window */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <h2 className="text-xl mb-4">Installation Schedule</h2>
        <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-800">
          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm mb-1">
              <span className="text-neutral-900 dark:text-neutral-50">Artwork Installation & Pickup:</span>
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{venue.installWindow}</p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-3">
          Please coordinate with venue staff for installations outside this window.
        </p>
      </div>

      {/* Wall Spaces Gallery */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">Wall Spaces</h2>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {mockWallSpaces.length} spaces
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockWallSpaces.slice(0, 3).map((wall) => (
            <div
              key={wall.id}
              className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all group"
            >
              <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                {wall.photos && wall.photos[0] && (
                  <img
                    src={wall.photos[0]}
                    alt={wall.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="">{wall.name}</h3>
                  {wall.available ? (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                      Available
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-full">
                      Occupied
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  {wall.width}" × {wall.height}"
                </p>
              </div>
            </div>
          ))}
        </div>

        {mockWallSpaces.length > 3 && (
          <div className="mt-4 text-center">
            <button
              onClick={onViewWallspaces}
              className="px-6 py-2 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
            >
              View all {mockWallSpaces.length} wall spaces →
            </button>
          </div>
        )}

        {mockWallSpaces.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <h3 className="text-xl mb-2">No wall spaces yet</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              {isOwnProfile ? 'Add your first wall space to get started' : 'This venue hasn\'t added any wall spaces yet'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
        <div className="flex flex-wrap gap-3">
          {!isOwnProfile && (
            <button
              onClick={onViewWallspaces}
              className="flex-1 px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
            >
              View Open Wallspaces
            </button>
          )}
          {isOwnProfile && (
            <button
              onClick={() => onNavigate?.('venue-find-artists')}
              className="flex-1 px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
            >
              Find Artists to Invite
            </button>
          )}
          {!isOwnProfile && (
            <button className="flex items-center gap-2 px-6 py-3 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
