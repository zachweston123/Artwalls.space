import { useEffect, useState, useRef } from 'react';
import { User, Mail, Phone, Link as LinkIcon, DollarSign, Edit, Save, X, Upload, Loader2, Camera, AlertCircle } from 'lucide-react';
import { PlanBadge } from '../pricing/PlanBadge';
import { CitySelect } from '../shared/CitySelect';
import { ProfileCompletenessWidget, ProfileIncompleteAlert } from './ProfileCompletenessWidget';
import { supabase } from '../../lib/supabase';
import { uploadProfilePhoto } from '../../lib/storage';
import { compressImage, formatFileSize } from '../../lib/imageCompression';

interface ArtistProfileProps {
  onNavigate: (page: string) => void;
}

export function ArtistProfile({ onNavigate }: ArtistProfileProps) {
  const editFormRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleScrollToEdit = () => {
    setIsEditing(true);
    setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [artTypes, setArtTypes] = useState<string[]>([]);
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [cityPrimary, setCityPrimary] = useState('');
  const [citySecondary, setCitySecondary] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'growth' | 'pro'>('free');
  const [avatar, setAvatar] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Demo values for summary (would come from orders on real data)
  const [totalEarnings] = useState(0);
  const [pendingPayout] = useState(0);

  const allArtTypes = [
    'Painter', 'Photographer', 'Illustrator', 'Digital', 
    'Mixed Media', 'Printmaker', 'Collage', 'Sculptor',
    'Street Artist', 'Installation', 'Textile Artist', 'Ceramicist'
  ];

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        const user = sessionData.session?.user;
        if (!user) throw new Error('Not signed in');

        // Load artist row; create if missing
        const { data: artistRows, error: selErr } = await supabase
          .from('artists')
          .select('*')
          .eq('id', user.id)
          .limit(1);
        if (selErr) throw selErr;

        if (!artistRows || artistRows.length === 0) {
          const defaults = {
            id: user.id,
            email: user.email,
            name: (user.user_metadata?.name as string | undefined) || 'Artist',
            role: 'artist',
            subscription_tier: 'free',
            subscription_status: 'inactive',
          };
          const { error: upErr } = await supabase.from('artists').upsert(defaults, { onConflict: 'id' });
          if (upErr) throw upErr;
          setName(defaults.name || 'Artist');
          setEmail(defaults.email || '');
          setPhone(((user.user_metadata?.phone as string) || '').trim());
          setCurrentPlan('free');
          setCityPrimary('');
          setCitySecondary('');
          setAvatar((user.user_metadata?.avatar as string) || (row?.profile_photo_url as string) || '');
        } else {
          const row = artistRows[0] as any;
          setName(row.name || (user.user_metadata?.name as string) || 'Artist');
          setEmail(row.email || user.email || '');
          setPhone((row.phone_number as string) || ((user.user_metadata?.phone as string) || ''));
          setCityPrimary((row.city_primary as string) || '');
          setCitySecondary((row.city_secondary as string) || '');
          setBio((row.bio as string) || '');
          setArtTypes((row.art_types as string[]) || []);
          setInstagramHandle((row.instagram_handle as string) || '');
          const tier = (row.subscription_tier as 'free' | 'starter' | 'growth' | 'pro') || 'free';
          setCurrentPlan(tier);
          setAvatar((row?.profile_photo_url as string) || (user.user_metadata?.avatar as string) || '');
        }

        // Portfolio URL from auth metadata
        setPortfolioUrl(((user.user_metadata?.portfolioUrl as string) || '').trim());
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load profile');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handlePhotoUpload(file?: File) {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);
      
      // Validate file type first
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Only JPG, PNG, and WebP images are allowed');
      }
      
      // Compress image for artist profile (with 5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024;
      let fileToUpload = file;
      
      try {
        const { file: compressedFile, sizeReduction } = await compressImage(
          file, 
          500, 
          500, 
          0.8,
          MAX_SIZE
        );
        fileToUpload = compressedFile;
        
        // Check if compressed file is still too large
        if (fileToUpload.size > MAX_SIZE) {
          throw new Error(
            `File size must be less than 5MB (compressed: ${(fileToUpload.size / (1024 * 1024)).toFixed(1)}MB)`
          );
        }
      } catch (compressErr) {
        const err = compressErr as any;
        if (err?.message?.includes('must be less than')) {
          throw compressErr;
        }
        console.warn('Image compression failed, will try original:', compressErr);
        // Still try with original if compression fails
        if (file.size > MAX_SIZE) {
          throw new Error('File size must be less than 5MB even after compression');
        }
      }
      
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error('Not signed in');
      
      const url = await uploadProfilePhoto(userId, fileToUpload, 'artist');
      
      // Save the photo URL to the database
      const { error: updateErr } = await supabase
        .from('artists')
        .update({ profile_photo_url: url })
        .eq('id', userId);
      
      if (updateErr) throw updateErr;
      
      setAvatar(url);
    } catch (err: any) {
      // Provide helpful error messages
      let errorMsg = err?.message || 'Upload failed';
      
      if (errorMsg.includes('Bucket not found') || errorMsg.includes('bucket')) {
        errorMsg = 'Storage buckets not configured. Please create "artist-profiles" bucket in Supabase Storage and set it to Public.';
      } else if (errorMsg.includes('Permission denied') || errorMsg.includes('403')) {
        errorMsg = 'Permission denied. Make sure the storage bucket is set to Public in Supabase.';
      }
      
      setUploadError(errorMsg);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Not signed in');

      // Update via API (server/worker) to avoid client-side schema/permission issues
      const { apiPost } = await import('../../lib/api');
      await apiPost('/api/artists', {
        name,
        email,
        phoneNumber: phone,
        cityPrimary: cityPrimary || null,
        citySecondary: citySecondary || null,
        subscriptionTier: currentPlan,
        bio: bio || null,
        artTypes: artTypes.length > 0 ? artTypes : null,
        instagramHandle: instagramHandle || null,
      });

      // Update bio, art_types, instagram, and cities in Supabase directly
      await supabase
        .from('artists')
        .update({ 
          bio: bio || null,
          art_types: artTypes.length > 0 ? artTypes : [],
          instagram_handle: instagramHandle || null,
          city_primary: cityPrimary || null,
          city_secondary: citySecondary || null,
        })
        .eq('id', user.id);

      // Update metadata and email in auth
      const { error: metaErr } = await supabase.auth.updateUser({ data: { portfolioUrl, phone, cityPrimary, citySecondary }, email });
      if (metaErr) throw metaErr;

      setInfo('Profile updated successfully');
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Artist Profile</h1>
        <p className="text-[var(--text-muted)]">Manage your account information and settings</p>
      </div>

      {/* Profile Completeness Widget */}
      <ProfileCompletenessWidget
        profile={{
          name,
          email,
          bio,
          artTypes,
          profilePhoto: avatar,
          phone,
          primaryCity: cityPrimary,
          secondaryCity: citySecondary,
          portfolioUrl,
          instagramHandle,
        }}
        onEditProfile={() => setIsEditing(true)}
        onScrollToEdit={handleScrollToEdit}
      />

      {/* Incomplete Profile Alert */}
      <ProfileIncompleteAlert
        profile={{
          name,
          email,
          bio,
          artTypes,
          profilePhoto: avatar,
          phone,
          primaryCity: cityPrimary,
          secondaryCity: citySecondary,
          portfolioUrl,
          instagramHandle,
        }}
        onEditProfile={() => setIsEditing(true)}
        onScrollToEdit={handleScrollToEdit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center overflow-hidden">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-[var(--blue)]" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl mb-1 text-[var(--text)]">{name || 'Artist'}</h2>
                  <PlanBadge plan={currentPlan} size="sm" showUpgrade onUpgrade={() => onNavigate('plans-pricing')} />
                </div>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button disabled={saving} onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-[var(--green)] hover:brightness-95 text-[var(--accent-contrast)] rounded-lg transition-colors disabled:opacity-60">
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving…' : 'Save'}</span>
                  </button>
                  <button disabled={saving} onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
            {(error || info) && (
              <div className={'mb-4 rounded-lg border px-4 py-3 text-sm ' + (error ? 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--danger)]' : 'bg-[var(--surface-1)] border-[var(--border)] text-[var(--text)]')}>
                {error || info}
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-4">
                {bio && (
                  <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm text-[var(--text-muted)] mb-1">Bio</label>
                      <p className="text-[var(--text)] whitespace-pre-wrap">{bio}</p>
                    </div>
                  </div>
                )}

                {artTypes.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm text-[var(--text-muted)] mb-2">Art Types</label>
                      <div className="flex flex-wrap gap-2">
                        {artTypes.map((type) => (
                          <span key={type} className="px-3 py-1 bg-[var(--blue-muted)] text-[var(--blue)] text-sm rounded-full">
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                  <Mail className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm text-[var(--text-muted)] mb-1">Email Address</label>
                    <p className="text-[var(--text)]">{email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                  <Phone className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm text-[var(--text-muted)] mb-1">Phone Number</label>
                    <p className="text-[var(--text)]">{phone || 'Not set'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                  <LinkIcon className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm text-[var(--text-muted)] mb-1">Portfolio Website</label>
                    {portfolioUrl ? (
                      <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--blue)] hover:text-[var(--blue-hover)] underline">
                        {portfolioUrl}
                      </a>
                    ) : (
                      <p className="text-[var(--text-muted)]">Not set</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm text-[var(--text-muted)] mb-1">Primary City</label>
                      <p className="text-[var(--text)]">{cityPrimary || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg">
                    <div className="flex-1">
                      <label className="block text-sm text-[var(--text-muted)] mb-1">Secondary City</label>
                      <p className="text-[var(--text)]">{citySecondary || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div ref={editFormRef} className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-3">Profile Photo</label>
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-[var(--surface-3)] border-4 border-[var(--border)]">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => document.getElementById('artist-photo-input')?.click()}
                      disabled={uploading}
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-3)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Photo
                        </>
                      )}
                    </button>
                    <input
                      id="artist-photo-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                      disabled={uploading}
                    />
                  </div>
                  {uploadError && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-600">
                        <p className="font-medium">Upload Failed</p>
                        <p className="mt-1">{uploadError}</p>
                        {uploadError.includes('Bucket not found') || uploadError.includes('not configured') ? (
                          <p className="mt-2 text-xs text-red-500">
                            💡 Create &quot;artist-profiles&quot; bucket in Supabase Storage and set it to Public. See setup guide for details.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  {avatar && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { data } = await supabase.auth.getUser();
                          const userId = data.user?.id;
                          if (!userId) return;
                          
                          // Update database to remove photo URL
                          await supabase
                            .from('artists')
                            .update({ profile_photo_url: null })
                            .eq('id', userId);
                          
                          setAvatar('');
                        } catch (err) {
                          console.error('Failed to remove photo:', err);
                        }
                      }}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] mt-2 underline"
                    >
                      Remove photo
                    </button>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    JPG, PNG, or WebP. Max 5MB. Square images work best.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Display Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Phone Number</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" placeholder="e.g. +15551234567" />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Sale notifications will be sent to this number.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <CitySelect
                      label="Primary City"
                      value={cityPrimary}
                      onChange={setCityPrimary}
                      placeholder="Select or search city..."
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Used to recommend venues within 50 miles of your city.</p>
                  </div>
                  <div>
                    <CitySelect
                      label="Secondary City (Optional)"
                      value={citySecondary}
                      onChange={setCitySecondary}
                      placeholder="Select or search city..."
                    />
                    <p className="text-xs text-[var(--text-muted)] mt-1">Optional. You can work in a second city too.</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Portfolio Website</label>
                  <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" placeholder="https://your-portfolio.example" />
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell venues about yourself, your art style, and what makes your art special..." className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)] resize-none" rows={4} maxLength={500} />
                  <p className="text-xs text-[var(--text-muted)] mt-1">{bio.length}/500 characters • More info helps venues understand your work</p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-3">Art Types</label>
                  <p className="text-xs text-[var(--text-muted)] mb-3">Select your art types so venues can find you more easily</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allArtTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setArtTypes(prev =>
                            prev.includes(type)
                              ? prev.filter(t => t !== type)
                              : [...prev, type]
                          );
                        }}
                        className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                          artTypes.includes(type)
                            ? 'border-[var(--blue)] bg-[var(--blue-muted)] text-[var(--blue)]'
                            : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--blue)]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Instagram Handle</label>
                  <input value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" placeholder="@yourinstagram" />
                  <p className="text-xs text-[var(--text-muted)] mt-1">Venues can find and follow your work</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] p-6">
            <h3 className="text-lg mb-4 text-[var(--text)]">Account Settings</h3>
            <div className="space-y-3">
              <button onClick={() => onNavigate('artist-password-security')} className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors">
                <p className="text-[var(--text)] mb-1">Password & Security</p>
                <p className="text-sm text-[var(--text-muted)]">Change your password and security settings</p>
              </button>
              <button onClick={() => onNavigate('artist-notifications')} className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors">
                <p className="text-[var(--text)] mb-1">Notification Preferences</p>
                <p className="text-sm text-[var(--text-muted)]">Manage email and push notifications</p>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Summary Card */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[var(--green)]" />
              </div>
              <h3 className="text-lg text-[var(--text)]">Earnings Summary</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Total Earnings</p>
                <p className="text-2xl text-[var(--text)]">${totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Pending Payout</p>
                <p className="text-xl text-[var(--green)]">${pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Processed monthly on the 15th</p>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('artist-sales')}
              className="w-full mt-4 px-4 py-2 bg-[var(--surface-2)] text-[var(--blue)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
            >
              View Sales History
            </button>
          </div>

          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-3 text-[var(--text)]">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('artist-artworks')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Manage Artworks
              </button>
              <button 
                onClick={() => onNavigate('artist-venues')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Browse Venues
              </button>
              <button 
                onClick={() => onNavigate('plans-pricing')}
                className="w-full text-left px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--surface-3)] transition-colors border border-[var(--border)]"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
