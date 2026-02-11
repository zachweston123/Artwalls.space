import { MapPin, Edit, Flag, Eye, Instagram } from 'lucide-react';
import { LabelChip } from '../LabelChip';
import { mockArtworks } from '../../data/mockData';
import type { User } from '../../App';
import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';

interface ArtistProfileViewProps {
  artistId?: string;
  isOwnProfile: boolean;
  onEdit?: () => void;
  onInviteToApply?: () => void;
  onViewArtwork?: (artworkId: string) => void;
  currentUser: User;
}

interface ArtistViewData {
  id: string;
  name: string;
  avatar: string;
  location: string;
  bio: string;
  instagram: string;
  artTypes: string[];
  openToNew: boolean;
  activeDisplays: number;
  totalSales: number;
}

export function ArtistProfileView({ 
  artistId,
  isOwnProfile, 
  onEdit, 
  onInviteToApply,
  onViewArtwork,
  currentUser 
}: ArtistProfileViewProps) {
  // Fetch artist data from API
  const [artist, setArtist] = useState<ArtistViewData>({
    id: '1',
    name: 'Artist',
    avatar: '',
    location: '',
    bio: '',
    instagram: '',
    artTypes: [],
    openToNew: true,
    activeDisplays: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadArtistProfile() {
      if (!artistId) {
        setLoading(false);
        return;
      }
      try {
        const profile = await apiGet<{
          id: string;
          name?: string | null;
          profile_photo_url?: string | null;
          city_primary?: string | null;
          bio?: string | null;
          instagram_handle?: string | null;
          open_to_placements?: boolean | null;
        }>(`/api/artists/${artistId}`);
        
        if (isMounted && profile) {
          setArtist({
            id: profile.id,
            name: profile.name || 'Artist',
            avatar: profile.profile_photo_url || '',
            location: profile.city_primary || '',
            bio: profile.bio || '',
            instagram: profile.instagram_handle || '',
            artTypes: [],
            openToNew: profile.open_to_placements ?? true,
            activeDisplays: 0,
            totalSales: 0,
          });
        }
      } catch (error) {
        console.error('Failed to load artist profile:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadArtistProfile();
    return () => {
      isMounted = false;
    };
  }, [artistId]);

  const allArtTypes = [
    'Painter', 'Photographer', 'Illustrator', 'Digital', 
    'Mixed Media', 'Printmaker', 'Collage', 'Sculptor'
  ];

  if (loading) {
    return (
      <div className="bg-[var(--bg)] text-[var(--text)] flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--border)] border-t-[var(--blue)] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Profile Header */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-[var(--surface-2)] border-4 border-[var(--border)]">
              {artist.avatar ? (
                <img
                  src={artist.avatar}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--surface-3)] text-[var(--text-muted)] text-3xl font-bold">
                  {artist.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h1 className="text-3xl mb-2">{artist.name}</h1>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{artist.location}</span>
                  </div>
                  {artist.instagram && (
                    <a
                      href={`https://instagram.com/${artist.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--blue)] transition-colors"
                    >
                      <Instagram className="w-4 h-4" />
                      <span className="text-sm">{artist.instagram}</span>
                    </a>
                  )}
                </div>
              </div>
              
              {isOwnProfile && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg hover:bg-[var(--blue-hover)] transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

            {/* Status Badge */}
            {artist.openToNew && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--green-muted)] text-[var(--green)] rounded-full text-sm mb-4 border border-[var(--border)]">
                <div className="w-2 h-2 bg-[var(--green)] rounded-full"></div>
                Open to new placements
              </div>
            )}

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">Active Displays:</span>
                <span className="ml-2 text-[var(--text)]">{artist.activeDisplays}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">Total Sales:</span>
                <span className="ml-2 text-[var(--text)]">{artist.totalSales}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <h2 className="text-xl mb-3">About</h2>
        <p className="text-[var(--text-muted)] leading-relaxed">{artist.bio}</p>
      </div>

      {/* Art Types */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
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
          <span className="text-sm text-[var(--text-muted)]">
            {mockArtworks.length} artworks
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockArtworks.map((artwork) => (
            <button
              key={artwork.id}
              onClick={() => onViewArtwork?.(artwork.id)}
              className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-all group text-left"
            >
              <div className="aspect-square bg-[var(--surface-2)] overflow-hidden">
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-1 group-hover:text-[var(--blue)] transition-colors">
                  {artwork.title}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">
                    ${artwork.price}
                  </span>
                  {artwork.status === 'active' && (
                    <span className="text-xs px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full border border-[var(--border)]">
                      On display
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {mockArtworks.length === 0 && (
          <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
            <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl mb-2">No portfolio pieces yet</h3>
            <p className="text-[var(--text-muted)]">
              {isOwnProfile ? 'Upload your first artwork to get started' : 'This artist hasn\'t added any work yet'}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isOwnProfile && (
        <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
          <div className="flex flex-wrap gap-3">
            {currentUser.role === 'venue' && (
              <button
                onClick={onInviteToApply}
                className="flex-1 px-6 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-colors"
              >
                Invite to Apply
              </button>
            )}
            <button className="flex items-center gap-2 px-6 py-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Report</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
