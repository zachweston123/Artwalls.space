import { useEffect, useState } from 'react';
import { MapPin, Edit, Flag, CheckCircle, Calendar } from 'lucide-react';
import { VenuePayoutsCard } from './VenuePayoutsCard';
import { LabelChip } from '../LabelChip';
import { VENUE_HIGHLIGHTS } from '../../data/highlights';
import { apiGet, getVenueSchedule } from '../../lib/api';
import type { User } from '../../App';
import { supabase } from '../../lib/supabase';
import { SocialLinks } from '../shared/SocialLinks';
import { VenueArtGuidelines } from './VenueArtGuidelines';

interface VenueProfileViewProps {
  isOwnProfile: boolean;
  venueId?: string;
  onEdit?: () => void;
  onViewWallspaces?: () => void;
  onNavigate?: (page: string) => void;
  currentUser: User;
}

type WallSpace = { id: string; name: string; width?: number; height?: number; available: boolean; photos?: string[] };

type VenueProfileData = {
  id?: string;
  name: string;
  coverPhoto: string;
  location: string;
  bio: string;
  labels: string[];
  foundedYear: number;
  wallSpaces: number;
  currentArtists: number;
  installWindow: string;
  verified: boolean;
  website: string;
  instagramHandle: string;
};

export function VenueProfileView({ 
  isOwnProfile, 
  venueId,
  onEdit, 
  onViewWallspaces,
  onNavigate,
  currentUser 
}: VenueProfileViewProps) {
  const [venue, setVenue] = useState<VenueProfileData>({
    id: venueId,
    name: '',
    coverPhoto: '',
    location: '',
    bio: '',
    labels: [],
    foundedYear: new Date().getFullYear(),
    wallSpaces: 0,
    currentArtists: 0,
    installWindow: 'Install window not set yet',
    verified: false,
    website: '',
    instagramHandle: '',
  });

  const formatTime = (time: string) => {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr || '0', 10);
    const minute = parseInt(minuteStr || '0', 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  // Show only highlights the venue has selected (filtered to known highlights)
  const selectedLabels = (venue.labels ?? []).filter((l) => VENUE_HIGHLIGHTS.includes(l));

  const yearsInBusiness = venue.foundedYear ? Math.max(0, new Date().getFullYear() - venue.foundedYear) : 0;
  const [walls, setWalls] = useState<WallSpace[]>([]);

  // Pull latest venue and walls, and resubscribe so other users see updates live
  useEffect(() => {
    let mounted = true;
    if (!venueId) return undefined;

    const fetchVenue = async () => {
      try {
        const [venueResp, scheduleResp] = await Promise.all([
          supabase
            .from('venues')
            .select('id,name,cover_photo_url,address,city,bio,labels,verified,founded_year,website,instagram_handle')
            .eq('id', venueId)
            .single(),
          getVenueSchedule(venueId).catch(() => ({ schedule: null })),
        ]);

        if (!mounted) return;

        const venueRow = venueResp?.data;
        setVenue((prev) => ({
          ...prev,
          id: venueId,
          name: venueRow?.name || prev.name,
          coverPhoto: venueRow?.cover_photo_url || prev.coverPhoto,
          location: venueRow?.city || venueRow?.address || prev.location,
          bio: venueRow?.bio || prev.bio,
          labels: venueRow?.labels || prev.labels,
          verified: Boolean(venueRow?.verified ?? prev.verified),
          foundedYear: venueRow?.founded_year || prev.foundedYear,
          website: venueRow?.website || prev.website,
          instagramHandle: venueRow?.instagram_handle || prev.instagramHandle,
        }));

        if (scheduleResp?.schedule) {
          const interval = scheduleResp.schedule.installSlotIntervalMinutes ?? scheduleResp.schedule.slotMinutes ?? 60;
          setVenue((prev) => ({
            ...prev,
            installWindow: `${scheduleResp.schedule.dayOfWeek}, ${formatTime(scheduleResp.schedule.startTime)} - ${formatTime(scheduleResp.schedule.endTime)} (${interval}-minute slots)`,
          }));
        }
      } catch (err) {
        console.warn('Failed to load venue profile', err);
      }
    };

    const fetchWalls = async () => {
      if (!venueId) return;
      try {
        const items = await apiGet<WallSpace[]>(`/api/venues/${venueId}/wallspaces`);
        if (!mounted) return;
        setWalls(items);
        setVenue((prev) => ({ ...prev, wallSpaces: items.length }));
      } catch {
        setWalls([]);
      }
    };

    fetchVenue();
    fetchWalls();

    const channel = supabase.channel(`venue-profile-view-${venueId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues', filter: `id=eq.${venueId}` }, (payload) => {
        const v: any = payload.new || payload.old;
        setVenue((prev) => ({
          ...prev,
          name: v?.name ?? prev.name,
          coverPhoto: v?.cover_photo_url ?? prev.coverPhoto,
          location: v?.city ?? v?.address ?? prev.location,
          bio: v?.bio ?? prev.bio,
          labels: v?.labels ?? prev.labels,
          verified: typeof v?.verified === 'boolean' ? v.verified : prev.verified,
          foundedYear: v?.founded_year ?? prev.foundedYear,
          website: v?.website ?? prev.website,
          instagramHandle: v?.instagram_handle ?? prev.instagramHandle,
        }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallspaces', filter: `venue_id=eq.${venueId}` }, () => {
        fetchWalls();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [venueId]);

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      {/* Cover Photo & Header */}
      <div className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] mb-6">
        {/* Cover Photo */}
        <div className="h-64 bg-[var(--surface-2)] overflow-hidden">
          {venue.coverPhoto ? (
            <img
              src={venue.coverPhoto}
              alt={venue.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn(`[VenueProfileView] Image failed for venue ${venue.id}:`, venue.coverPhoto);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)] flex items-center justify-center">
              <MapPin className="w-12 h-12 text-[var(--text-muted)] opacity-40" />
            </div>
          )}
        </div>

        {/* Header Info */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl">{venue.name}</h1>
                {venue.verified && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-[var(--text-muted)] mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{venue.location}</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Established {venue.foundedYear} • {yearsInBusiness} years in business
              </p>
            </div>
            
            {isOwnProfile && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-6 text-sm pt-4 border-t border-[var(--border)]">
            <div>
              <span className="text-[var(--text-muted)]">Wall Spaces:</span>
              <span className="ml-2 text-[var(--text)]">{venue.wallSpaces}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">Current Artists:</span>
              <span className="ml-2 text-[var(--text)]">{venue.currentArtists}</span>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <h2 className="text-xl mb-3">About</h2>
        <p className="text-[var(--text-muted)] leading-relaxed">{venue.bio}</p>

        {/* Social links (deduplicated) */}
        {(venue.instagramHandle || venue.website) && (
          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <SocialLinks
              instagramHandle={venue.instagramHandle}
              websiteUrl={venue.website}
            />
          </div>
        )}
      </div>

      {/* Venue Labels */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <h2 className="text-xl mb-4">Venue Highlights</h2>
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((label) => (
            <LabelChip
              key={label}
              label={label}
              selected
              role="venue"
            />
          ))}
        </div>
      </div>

      {/* Artwork Preferences / Guidelines — visible to artists browsing this venue */}
      <VenueArtGuidelines
        venueId={venueId ?? null}
        editable={false}
        variant="section"
      />

      {/* Install Window */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <h2 className="text-xl mb-4">Installation Schedule</h2>
        <div className="flex items-start gap-3 p-4 bg-[var(--green-muted)] rounded-lg border border-[var(--border)]">
          <Calendar className="w-5 h-5 text-[var(--green)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm mb-1">
              <span className="text-[var(--text)]">Artwork Installation & Pickup:</span>
            </p>
            <p className="text-sm text-[var(--text-muted)]">{venue.installWindow}</p>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Please coordinate with venue staff for installations outside this window.
        </p>
      </div>

      {/* Wall Spaces Gallery */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl">Wall Spaces</h2>
          <span className="text-sm text-[var(--text-muted)]">
            {walls.length} spaces
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {walls.slice(0, 3).map((wall) => (
            <div
              key={wall.id}
              className="bg-[var(--surface-1)] rounded-xl overflow-hidden border border-[var(--border)] hover:shadow-lg transition-all group"
            >
              <div className="aspect-video bg-[var(--surface-2)] overflow-hidden">
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
                    <span className="text-xs px-2 py-1 bg-[var(--green-muted)] text-[var(--green)] rounded-full">
                      Available
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-[var(--surface-2)] text-[var(--text-muted)] rounded-full">
                      Occupied
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)]">
                  {wall.width}" × {wall.height}"
                </p>
              </div>
            </div>
          ))}
        </div>

        {walls.length > 3 && (
          <div className="mt-4 text-center">
            <button
              onClick={onViewWallspaces}
              className="px-6 py-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              View all {walls.length} wall spaces →
            </button>
          </div>
        )}

        {walls.length === 0 && (
          <div className="text-center py-16 bg-[var(--surface-1)] rounded-xl border border-[var(--border)]">
            <h3 className="text-xl mb-2">No wall spaces yet</h3>
            <p className="text-[var(--text-muted)]">
              {isOwnProfile ? 'Add your first wall space to get started' : 'This venue hasn\'t added any wall spaces yet'}
            </p>
          </div>
        )}
      </div>

      {/* Payouts setup (venue owner only) */}
      {isOwnProfile && (
        <div className="mb-6">
          <VenuePayoutsCard user={currentUser} />
        </div>
      )}

      {/* Actions */}
      <div className="bg-[var(--surface-1)] rounded-xl p-6 border border-[var(--border)]">
        <div className="flex flex-wrap gap-3">
          {!isOwnProfile && (
            <button
              onClick={onViewWallspaces}
              className="flex-1 px-6 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
            >
              View Open Wallspaces
            </button>
          )}
          {isOwnProfile && (
            <button
              onClick={() => onNavigate?.('venue-find-artists')}
              className="flex-1 px-6 py-3 bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity"
            >
              Find Artists to Invite
            </button>
          )}
          {!isOwnProfile && (
            <button className="flex items-center gap-2 px-6 py-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
              <Flag className="w-4 h-4" />
              <span className="text-sm">Report</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
