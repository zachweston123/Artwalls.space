import { useEffect, useState } from 'react';
import { Store, Mail, MapPin, Clock, DollarSign, Edit, Instagram } from 'lucide-react';
import { Store, Mail, Phone, MapPin, Clock, DollarSign, Edit, Instagram } from 'lucide-react';
import { VenueProfileEdit, type VenueProfileData } from './VenueProfileEdit';
import { apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface VenueProfileProps {
  onNavigate: (page: string) => void;
}

export function VenueProfile({ onNavigate }: VenueProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Mock data - in production this would come from user state
  const [profile, setProfile] = useState({
    name: 'Brew & Palette Café',
    type: 'Coffee Shop',
    email: 'contact@brewpalette.com',
    phoneNumber: '',
    address: '123 Arts District, Portland, OR 97209',
    instagram: '@brewpalettecafe',
    totalEarnings: 487.5,
    wallSpaces: 3,
    activeDisplays: 2,
    installWindow: {
      day: 'Monday',
      time: '9:00 AM - 11:00 AM',
    },
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      const role = user.user_metadata?.role;
      if (role !== 'venue') return;
      setProfile((prev) => ({
        ...prev,
        email: user.email || prev.email,
        name: user.user_metadata?.name || prev.name,
        type: user.user_metadata?.type || prev.type,
        phoneNumber: (user.user_metadata?.phone as string | undefined) || prev.phoneNumber,
      }));
    });
  }, []);

  const handleSave = async (data: VenueProfileData) => {
    setSaveError(null);
    try {
      await apiPost('/api/venues', {
        name: data.name,
        type: data.type,
        labels: data.labels,
        phoneNumber: data.phoneNumber,
        email: data.email,
      });

      // Optional: also backfill auth metadata so refreshes keep the same display values.
      await supabase.auth.updateUser({
        data: {
          name: data.name,
          type: data.type,
          phone: data.phoneNumber,
        },
        email: data.email,
      });

      setProfile((prev) => ({
        ...prev,
        name: data.name,
        type: data.type,
        email: data.email || prev.email,
        phoneNumber: data.phoneNumber || prev.phoneNumber,
      }));
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save venue profile.');
    }
  };

  return (
    <div className="bg-[var(--bg)] text-[var(--text)]">
      <div className="mb-8">
        <h1 className="text-3xl mb-2">Venue Profile</h1>
        <p className="text-[var(--text-muted)]">Manage your venue information and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[var(--green-muted)] rounded-full flex items-center justify-center">
                  <Store className="w-10 h-10 text-[var(--green)]" />
                </div>
                <div>
                  <h2 className="text-2xl mb-1">{profile.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex px-3 py-1 rounded-full text-sm bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]">
                      Venue Account
                    </span>
                    <span className="inline-flex px-3 py-1 rounded-full text-sm bg-[var(--green-muted)] text-[var(--green)] border border-[var(--border)]">
                      {profile.type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSaveError(null);
                  setIsEditing(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-3)] transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
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

              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors group"
                >
                  <Instagram className="w-5 h-5 text-[var(--text-muted)] mt-0.5 group-hover:text-[var(--blue)]" />
                  <div className="flex-1">
                    <label className="block text-sm text-[var(--text-muted)] mb-1">Instagram</label>
                    <p className="text-[var(--text)] group-hover:text-[var(--blue)]">{profile.instagram}</p>
                  </div>
                </a>
              )}

              <div className="flex items-start gap-3 p-4 bg-[var(--surface-1)] rounded-lg border border-[var(--border)]">
                <Clock className="w-5 h-5 text-[var(--text-muted)] mt-0.5" />
                <div className="flex-1">
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Install Window</label>
                  <p className="text-[var(--text)]">
                    {profile.installWindow.day}s, {profile.installWindow.time}
                  </p>
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
            <h3 className="text-lg mb-4">Wall Space Guidelines</h3>
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
            <h3 className="text-lg mb-4">Account Settings</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]">
                <p className="text-[var(--text)] mb-1">Password & Security</p>
                <p className="text-sm text-[var(--text-muted)]">Change your password and security settings</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] rounded-lg transition-colors border border-[var(--border)]">
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
              <h3 className="text-lg">Commission Earnings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Total Commission (10%)</p>
                <p className="text-2xl text-[var(--text)]">${profile.totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="pt-4 border-t border-[var(--border)]">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="text-2xl text-[var(--text)]">{profile.wallSpaces}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Wall Spaces</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <p className="text-2xl text-[var(--green)]">{profile.activeDisplays}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">Active</p>
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
            <h3 className="text-lg mb-3">Quick Actions</h3>
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

      {isEditing && (
        <VenueProfileEdit
          initialData={{ name: profile.name, type: profile.type, email: profile.email, phoneNumber: profile.phoneNumber }}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
