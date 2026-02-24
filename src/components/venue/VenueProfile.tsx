import { useEffect, useState, useRef } from 'react';
import { Store, Mail, Phone, MapPin, Clock, DollarSign, Instagram, ExternalLink, Edit2, X, Check } from 'lucide-react';
import { VenueProfileEdit, type VenueProfileData } from './VenueProfileEdit';
import { apiPost, getVenueSchedule } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { PageHeroHeader } from '../PageHeroHeader';
import { formatCurrency } from '../../utils/format';
import { SocialLinks } from '../shared/SocialLinks';

interface VenueProfileProps {
  onNavigate: (page: string) => void;
  startInEdit?: boolean;
}

export function VenueProfile({ onNavigate, startInEdit = false }: VenueProfileProps) {
  const [isEditing, setIsEditing] = useState(startInEdit);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [venueId, setVenueId] = useState<string | null>(null);
  const bioSectionRef = useRef<HTMLDivElement>(null);

  const formatTime = (time: string) => {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr || '0', 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const normalizedHour = hour % 12 || 12;
    return `${normalizedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  };

  // Profile data - loaded from database on mount
  const [profile, setProfile] = useState<{
    name: string;
    type: string;
    email: string;
    phoneNumber: string;
    address: string;
    addressLat?: number;
    addressLng?: number;
    instagram: string;
    website: string;
    coverPhoto: string;
    city?: string;
    bio: string;
    labels: string[];
    totalEarnings: number;
    wallSpaces: number;
    activeDisplays: number;
    isParticipating: boolean;
    installWindow: { day: string; time: string };
  }>({
    name: '',
    type: '',
    email: '',
    phoneNumber: '',
    address: '',
    addressLat: undefined,
    addressLng: undefined,
    instagram: '',
    website: '',
    coverPhoto: '',
    city: '',
    bio: '',
    labels: [],
    totalEarnings: 0,
    wallSpaces: 0,
    activeDisplays: 0,
    isParticipating: false,
    installWindow: {
      day: 'Not set',
      time: 'Add your install window in Settings',
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setVenueId(user.id);
      const role = user.user_metadata?.role;
      if (role !== 'venue') return;
      
      setProfile((prev) => ({
        ...prev,
        email: user.email || prev.email,
        name: user.user_metadata?.name || prev.name,
        type: user.user_metadata?.type || prev.type,
        phoneNumber: (user.user_metadata?.phone as string | undefined) || prev.phoneNumber,
      }));

      // Load cover photo, city, bio, labels, and address from database
      try {
        const { data: venueData } = await supabase
          .from('venues')
          .select('cover_photo_url, city, bio, labels, address, address_lat, address_lng, is_participating')
          .eq('id', user.id)
          .single();

        // Attempt to load social fields (may not exist if migration hasn't run)
        let socialData: { website?: string; instagram_handle?: string } = {};
        try {
          const { data: social } = await supabase
            .from('venues')
            .select('website, instagram_handle')
            .eq('id', user.id)
            .single();
          if (social) socialData = social;
        } catch { /* columns may not exist yet */ }
        
        if (venueData) {
          setProfile((prev) => ({
            ...prev,
            coverPhoto: venueData.cover_photo_url || prev.coverPhoto,
            city: venueData.city || prev.city,
            bio: venueData.bio || prev.bio,
            labels: venueData.labels || prev.labels,
            address: venueData.address || prev.address,
            addressLat: venueData.address_lat || prev.addressLat,
            addressLng: venueData.address_lng || prev.addressLng,
            website: socialData.website || prev.website,
            instagram: socialData.instagram_handle || prev.instagram,
            isParticipating: Boolean(venueData.is_participating),
          }));
        }

        try {
          const { schedule } = await getVenueSchedule(user.id);
          if (schedule) {
            const interval = schedule.installSlotIntervalMinutes ?? schedule.slotMinutes ?? 60;
            setProfile((prev) => ({
              ...prev,
              installWindow: {
                day: schedule.dayOfWeek,
                time: `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)} (${interval}-minute slots)`,
              },
            }));
          }
        } catch (err) {
          console.warn('Failed to load venue schedule:', err);
        }
      } catch (err) {
        console.warn('Failed to load venue data:', err);
      }
    });
  }, []);

  const handleSave = async (data: VenueProfileData) => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Not signed in');

      try {
        await apiPost('/api/venues', {
          venueId: userId,
          name: data.name,
          type: data.type,
          labels: data.labels,
          phoneNumber: data.phoneNumber,
          email: data.email,
          city: data.city,
          bio: data.bio,
          coverPhoto: data.coverPhoto,
          address: data.address,
          addressLat: data.addressLat,
          addressLng: data.addressLng,
          website: data.website,
          instagramHandle: data.instagramHandle,
        });
      } catch (apiErr) {
        console.warn('API update failed, falling back to direct database update:', apiErr);
      }

      // Save fields to database directly using upsert (creates row if missing)
      const updateData: any = {
        id: userId, // Required for upsert
        name: data.name,
        type: data.type,
        email: data.email,
        phone_number: data.phoneNumber,
        labels: data.labels,
        // suspended is NOT NULL — always provide a safe default for upsert
        suspended: false,
        updated_at: new Date().toISOString()
      };

      // Always include cover photo (null clears it, truthy URL sets it)
      updateData.cover_photo_url = data.coverPhoto || null;

      if (data.city) {
        updateData.city = data.city;
      }
      if (data.bio !== undefined) {
        updateData.bio = data.bio;
      }
      if (data.address !== undefined) {
        updateData.address = data.address;
      }
      if (data.addressLat !== undefined) {
        updateData.address_lat = data.addressLat;
      }
      if (data.addressLng !== undefined) {
        updateData.address_lng = data.addressLng;
      }
      // website and instagram_handle are saved via the worker API above;
      // omit them from the direct upsert to avoid schema-cache errors
      // if the migration hasn't been applied yet.
      if (data.isParticipating !== undefined) {
        updateData.is_participating = data.isParticipating;
      }
      // Auto-compute city_slug from city
      if (data.city) {
        updateData.city_slug = data.city
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('venues')
          .upsert(updateData, { onConflict: 'id' });
        
        if (updateError) {
          console.error('Direct database update failed:', updateError);
          throw new Error(updateError.message || 'Failed to save to database');
        }
      }

      // Optional: also backfill auth metadata so refreshes keep the same display values.
      await supabase.auth.updateUser({
        data: {
          name: data.name,
          type: data.type,
          phone: data.phoneNumber,
          city: data.city,
        },
        email: data.email,
      });

      // Update local state with all saved data
      setProfile((prev) => ({
        ...prev,
        name: data.name,
        type: data.type,
        email: data.email || prev.email,
        phoneNumber: data.phoneNumber || prev.phoneNumber,
        city: data.city || prev.city,
        bio: data.bio || prev.bio,
        labels: data.labels || prev.labels,
        coverPhoto: data.coverPhoto || prev.coverPhoto,
        address: data.address || prev.address,
        addressLat: data.addressLat || prev.addressLat,
        addressLng: data.addressLng || prev.addressLng,
        website: data.website || prev.website,
        instagram: data.instagramHandle || prev.instagram,
        isParticipating: data.isParticipating ?? prev.isParticipating,
      }));
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save venue profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasCompleteBio = (profile.bio || '').trim().length >= 100;
  const hasAddress = !!(profile.address && profile.address.trim());
  const hasCity = !!(profile.city && profile.city.trim());
  const profileStatus = hasCompleteBio && hasAddress && hasCity
    ? { label: 'Live', tone: 'success' as const }
    : hasAddress || hasCity
      ? { label: 'Needs setup', tone: 'warn' as const }
      : { label: 'Draft', tone: 'muted' as const };

  const installWindowLabel = profile.installWindow.day === 'Not set'
    ? profile.installWindow.time
    : `${profile.installWindow.day}s, ${profile.installWindow.time}`;

  const statusToneStyles = {
    success: 'bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]',
    warn: 'bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]',
    muted: 'bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]',
  } as const;

  const statusDotStyles = {
    success: 'bg-[var(--green)]',
    warn: 'bg-[var(--focus)]',
    muted: 'bg-[var(--text-muted)]',
  } as const;

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <PageHeroHeader
        breadcrumb="Manage / Venue Profile"
        title="Venue profile"
        subtitle={isEditing ? 'Edit your venue information below' : 'Manage your venue information and settings'}
        actions={
          isEditing ? (
            <button
              type="button"
              onClick={() => { setIsEditing(false); setSaveError(null); }}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] disabled:opacity-60"
            >
              Cancel editing
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setIsEditing(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)]"
            >
              Edit profile
            </button>
          )
        }
      />

      {isEditing ? (
        <VenueProfileEdit
          initialData={{
            name: profile.name,
            type: profile.type,
            email: profile.email,
            phoneNumber: profile.phoneNumber,
            city: profile.city,
            coverPhoto: profile.coverPhoto,
            bio: profile.bio,
            labels: profile.labels,
            address: profile.address,
            addressLat: profile.addressLat,
            addressLng: profile.addressLng,
            website: profile.website,
            instagramHandle: profile.instagram,
            isParticipating: profile.isParticipating,
          }}
          onSave={handleSave}
          onCancel={() => { setIsEditing(false); setSaveError(null); }}
          isSaving={isSaving}
          saveError={saveError}
        />
      ) : (
      <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            if (!venueId) return;
            window.location.href = `/venues/${venueId}`;
          }}
          disabled={!venueId}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors disabled:opacity-60"
        >
          <Store className="w-4 h-4" />
          <span>Preview as Visitor</span>
        </button>
      </div>

      {/* Bio Encouragement Banner */}
      {!hasCompleteBio && (
        <div className="mb-6 p-4 bg-gradient-to-r from-[var(--surface-2)] to-[var(--surface-1)] border border-[var(--border)] rounded-xl">
          <div className="flex items-start gap-3">
            <div className="text-xl">✨</div>
            <div className="flex-1">
              <p className="font-semibold text-[var(--text)] mb-1">Tell Artists Your Story</p>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                A compelling venue bio helps talented artists discover and choose your space. Share what makes your venue special, your support for local artists, and your unique atmosphere.
              </p>
              <button
                onClick={() => {
                  setSaveError(null);
                  setEditedBio(profile.bio || '');
                  setIsEditingBio(true);
                  setTimeout(() => {
                    bioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="text-sm text-[var(--blue)] hover:underline"
              >
                Update your bio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
          {/* Cover Photo Banner */}
          {profile.coverPhoto ? (
            <div className="relative h-48 sm:h-56 w-full">
              <img
                src={profile.coverPhoto}
                alt="Venue cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          ) : (
            <div className="h-32 sm:h-40 w-full bg-gradient-to-br from-[var(--green-muted)] to-[var(--surface-2)] flex items-center justify-center">
              <Store className="w-16 h-16 text-[var(--green)] opacity-50" />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl mb-2">{profile.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex px-3 py-1 rounded-full text-sm bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]">
                    Venue Account
                  </span>
                  <span className="inline-flex px-3 py-1 rounded-full text-sm bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]">
                    {profile.type}
                  </span>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusToneStyles[profileStatus.tone]}`}>
                    <span className={`h-2 w-2 rounded-full ${statusDotStyles[profileStatus.tone]}`} aria-hidden="true" />
                    <span className="font-medium">{profileStatus.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {saveError && (
              <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--danger)]" role="alert">
                {saveError}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                <Mail className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Contact Email</label>
                  <p className="text-[var(--text)]">{profile.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                <Phone className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Phone Number</label>
                  <p className="text-[var(--text)]">{profile.phoneNumber || 'Not set'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                <MapPin className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Venue Address</label>
                  <p className="text-[var(--text)]">{profile.address}</p>
                </div>
              </div>

              <div ref={bioSectionRef} className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                <Store className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-[var(--text-muted)]">Venue description</label>
                      {!isEditingBio && (
                        <button
                          onClick={() => {
                            setEditedBio(profile.bio || '');
                            setIsEditingBio(true);
                          }}
                          className="text-xs text-[var(--blue)] hover:underline flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                    {isEditingBio ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedBio}
                          onChange={(e) => setEditedBio(e.target.value)}
                          rows={6}
                          maxLength={600}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
                          placeholder="Describe your venue, atmosphere, mission, and why you support local artists..."
                          autoFocus
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--text-muted)]">
                            {editedBio.length}/600 characters
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setIsEditingBio(false);
                                setEditedBio('');
                              }}
                              className="px-3 py-1.5 text-sm bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const { data: userData } = await supabase.auth.getUser();
                                  const userId = userData.user?.id;
                                  if (!userId) throw new Error('Not signed in');

                                  await apiPost('/api/venues', {
                                    venueId: userId,
                                    bio: editedBio,
                                  });

                                  const { error: updateError } = await supabase
                                    .from('venues')
                                    .upsert({
                                      id: userId,
                                      bio: editedBio,
                                      suspended: false, // NOT NULL column — always provide safe default
                                      updated_at: new Date().toISOString(),
                                    });

                                  if (updateError) throw updateError;

                                  setProfile(prev => ({ ...prev, bio: editedBio }));
                                  setIsEditingBio(false);
                                  setEditedBio('');
                                } catch (err: any) {
                                  setSaveError(err?.message || 'Failed to update bio.');
                                }
                              }}
                              className="px-3 py-1.5 text-sm bg-[var(--green)] text-[var(--accent-contrast)] rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[var(--text)] leading-relaxed">
                        {profile.bio?.trim() ? profile.bio : 'Add a short story about your venue to help artists understand your vibe.'}
                      </p>
                    )}
                  </div>
                  {!!(profile.labels && profile.labels.length) && (
                    <div className="space-y-1">
                      <p className="text-sm text-[var(--text-muted)]">Highlights</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.labels.map((label) => (
                          <span key={label} className="inline-flex px-3 py-1 rounded-full text-xs bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)]">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {(profile.instagram || profile.website) && (
                <div className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                  <Instagram className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm text-[var(--text-muted)] mb-1">Social &amp; Web</label>
                    <SocialLinks
                      instagramHandle={profile.instagram}
                      websiteUrl={profile.website}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                <Clock className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Install Window</label>
                  <p className="text-[var(--text)]">{installWindowLabel}</p>
                  <button 
                    onClick={() => onNavigate('venue-settings')}
                    className="text-sm text-[var(--blue)] hover:underline mt-1"
                  >
                    Update schedule
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold mb-4">Wall Space Guidelines</h3>
            <div className="space-y-3">
              <div className="p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)] mb-2">
                  <strong className="text-[var(--text)]">Artwork Requirements:</strong>
                </p>
                <ul className="text-sm text-[var(--text-muted)] space-y-1 list-disc list-inside">
                  <li>Must be gallery-wrapped or framed</li>
                  <li>Professional presentation required</li>
                  <li>Family-friendly content only</li>
                </ul>
              </div>
              <button 
                onClick={() => onNavigate('venue-settings')}
                className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]"
              >
                <p className="text-[var(--text)] mb-1">Manage Guidelines</p>
                <p className="text-sm text-[var(--text-muted)]">Customize your venue's artwork preferences</p>
              </button>
            </div>
          </div>

          <div className="border-t border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
            <div className="space-y-3">
              <button onClick={() => onNavigate('venue-password-security')} className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]">
                <p className="text-[var(--text)] mb-1">Password & Security</p>
                <p className="text-sm text-[var(--text-muted)]">Change your password and security settings</p>
              </button>
              <button onClick={() => onNavigate('venue-notifications')} className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]">
                <p className="text-[var(--text)] mb-1">Notification Preferences</p>
                <p className="text-sm text-[var(--text-muted)]">Manage email and push notifications</p>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings & Quick Stats */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--green-muted)] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[var(--green)]" />
              </div>
              <h3 className="text-lg font-semibold">Commission Earnings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Total Commission (15%)</p>
                <p className="text-2xl text-[var(--text)]">{formatCurrency(profile.totalEarnings)}</p>
              </div>
              
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="text-2xl text-[var(--text)]">{profile.wallSpaces}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Wall Spaces</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="text-2xl text-[var(--green)]">{profile.activeDisplays}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Active displays</p>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('venue-sales')}
              className="w-full mt-4 px-4 py-2 bg-[var(--green-muted)] text-[var(--green)] rounded-lg hover:opacity-90 transition-opacity"
            >
              View Sales Report
            </button>
          </div>

          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('venue-walls')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Manage Wall Spaces
              </button>
              <button 
                onClick={() => onNavigate('venue-applications')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Review Applications
              </button>
              <button 
                onClick={() => onNavigate('venue-current')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Current Artwork
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
