import { MapPin, Edit, Flag, Eye } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { mockArtworks } from '../../data/mockData';
import type { User } from '../../App';

interface ArtistProfileViewProps {
  isOwnProfile: boolean;
  onEdit?: () => void;
  onInviteToApply?: () => void;
  onViewArtwork?: (artworkId: string) => void;
  currentUser: User;
}

export function ArtistProfileView({ 
  isOwnProfile, 
  onEdit, 
  onInviteToApply,
  onViewArtwork,
  currentUser 
}: ArtistProfileViewProps) {
  // Mock artist data - in real app would come from props or API
  const artist = {
    id: '1',
    name: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    location: 'Downtown, Portland',
    bio: 'Contemporary mixed media artist exploring themes of urban life and human connection. My work combines traditional painting techniques with digital elements to create layered, textured pieces that invite viewers to look closer and discover hidden narratives.',
    artTypes: ['Painter', 'Mixed Media', 'Digital', 'Collage'],
    openToNew: true,
    activeDisplays: 3,
    totalSales: 12,
  };

  const allArtTypes = [
    'Painter', 'Photographer', 'Illustrator', 'Digital', 
    'Mixed Media', 'Printmaker', 'Collage', 'Sculptor'
  ];

  return (
    <div>
      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 border-4 border-neutral-200 dark:border-neutral-700">
              <img
                src={artist.avatar}
                alt={artist.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-3xl mb-2">{artist.name}</h1>
                <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{artist.location}</span>
                </div>
              </div>
              
              {isOwnProfile && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Status Badge */}
            {artist.openToNew && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-sm mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Open to new placements
              </div>
            )}

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Active Displays:</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-50">{artist.activeDisplays}</span>
              </div>
              <div>
                <span className="text-neutral-600 dark:text-neutral-400">Total Sales:</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-50">{artist.totalSales}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <h2 className="text-xl mb-3">About</h2>
        <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">{artist.bio}</p>
      </div>

      {/* Art Types */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-6">
        <h2 className="text-xl mb-4">Art Types</h2>
        <div className="flex flex-wrap gap-2">
          {allArtTypes.map((type) => (
            <LabelChip
              key={type}
              label={type}
              selected={artist.artTypes.includes(type)}
              role="artist"
            />
          ))}
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">Portfolio</h2>
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {mockArtworks.length} artworks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockArtworks.map((artwork) => (
            <button
              key={artwork.id}
              onClick={() => onViewArtwork?.(artwork.id)}
              className="bg-white dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 hover:shadow-lg transition-all group text-left"
            >
              <div className="aspect-square bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {artwork.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    ${artwork.price}
                  </span>
                  {artwork.status === 'active' && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full">
                      On display
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {mockArtworks.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-xl mb-2">No portfolio pieces yet</h3>
            <p className="text-neutral-600 dark:text-neutral-300">
              {isOwnProfile ? 'Upload your first artwork to get started' : 'This artist hasn\'t added any work yet'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isOwnProfile && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700">
          <div className="flex flex-wrap gap-3">
            {currentUser.role === 'venue' && (
              <button
                onClick={onInviteToApply}
                className="flex-1 px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-400 transition-colors"
              >
                Invite to Apply
              </button>
            )}
            <button className="flex items-center gap-2 px-6 py-3 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Report</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
