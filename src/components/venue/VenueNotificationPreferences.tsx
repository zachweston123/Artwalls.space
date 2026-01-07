import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VenueNotificationPreferencesProps {
  onBack: () => void;
}

interface NotificationSettings {
  emailNotifications: boolean;
  applicationAlerts: boolean;
  artistInquiries: boolean;
  wallspaceUpdates: boolean;
  monthlyReport: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
}

export function VenueNotificationPreferences({ onBack }: VenueNotificationPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    applicationAlerts: true,
    artistInquiries: true,
    wallspaceUpdates: true,
    monthlyReport: false,
    pushNotifications: true,
    inAppNotifications: true,
  });

  const [originalSettings, setOriginalSettings] = useState<NotificationSettings>(settings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('venueNotificationPreferences');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setOriginalSettings(parsed);
      } catch (err) {
        console.warn('Failed to load notification preferences');
      }
    }
    setLoading(false);
  }, []);

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Not signed in');

      // Save to localStorage (in production, would save to database)
      localStorage.setItem('venueNotificationPreferences', JSON.stringify(settings));

      // Optionally update user metadata in Supabase
      await supabase.auth.updateUser({
        data: {
          venueNotificationPreferences: settings,
        },
      });

      setOriginalSettings(settings);
      setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[var(--surface-2)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl mb-1">Notification Preferences</h1>
          <p className="text-[var(--text-muted)]">Manage how you receive venue notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {message && (
            <div
              className={`p-4 rounded-lg border flex items-start gap-3 ${
                message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={message.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Email Notifications */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-[var(--blue)]" />
              </div>
              <div>
                <h2 className="text-xl mb-1">Email Notifications</h2>
                <p className="text-sm text-[var(--text-muted)]">Receive updates via email</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">Email Notifications</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Receive important venue updates via email</p>
                </div>
                <button
                  onClick={() => handleToggle('emailNotifications')}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    settings.emailNotifications ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.emailNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Application Alerts */}
              <div
                className={`flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors ${
                  !settings.emailNotifications ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">Application Alerts</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Get notified about new artist applications</p>
                </div>
                <button
                  onClick={() => handleToggle('applicationAlerts')}
                  disabled={!settings.emailNotifications}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
                    settings.applicationAlerts ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.applicationAlerts ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Artist Inquiries */}
              <div
                className={`flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors ${
                  !settings.emailNotifications ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">Artist Inquiries</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Receive messages from artists interested in your venue</p>
                </div>
                <button
                  onClick={() => handleToggle('artistInquiries')}
                  disabled={!settings.emailNotifications}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
                    settings.artistInquiries ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.artistInquiries ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Wallspace Updates */}
              <div
                className={`flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors ${
                  !settings.emailNotifications ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">Wallspace Updates</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Get notified when artwork is added to your wall spaces</p>
                </div>
                <button
                  onClick={() => handleToggle('wallspaceUpdates')}
                  disabled={!settings.emailNotifications}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
                    settings.wallspaceUpdates ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.wallspaceUpdates ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Monthly Report */}
              <div
                className={`flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors ${
                  !settings.emailNotifications ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">Monthly Report</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Receive a summary of venue activity each month</p>
                </div>
                <button
                  onClick={() => handleToggle('monthlyReport')}
                  disabled={!settings.emailNotifications}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
                    settings.monthlyReport ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.monthlyReport ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-[var(--green)]" />
              </div>
              <div>
                <h2 className="text-xl mb-1">In-App Notifications</h2>
                <p className="text-sm text-[var(--text-muted)]">Notifications within the application</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">Push Notifications</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">Get notified in real-time while browsing</p>
                </div>
                <button
                  onClick={() => handleToggle('pushNotifications')}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    settings.pushNotifications ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.pushNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* In-App Notifications Toggle */}
              <div className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-[var(--text)]">In-App Messages</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">See notifications in the notification center</p>
                </div>
                <button
                  onClick={() => handleToggle('inAppNotifications')}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    settings.inAppNotifications ? 'bg-[var(--blue)]' : 'bg-[var(--surface-3)]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      settings.inAppNotifications ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-[var(--blue)] hover:bg-[var(--blue-hover)] text-[var(--on-blue)] rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
              <button
                onClick={() => {
                  setSettings(originalSettings);
                  setMessage(null);
                }}
                className="flex-1 px-4 py-3 bg-[var(--surface-2)] text-[var(--text)] rounded-lg border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-4">About Notifications</h3>
            <div className="space-y-3 text-sm text-[var(--text-muted)]">
              <p>
                Control how and when you receive notifications about applications, artists, and venue updates.
              </p>
              <p>
                We respect your preferences and will only contact you about the activities you care about most.
              </p>
            </div>
          </div>

          <div className="bg-[var(--surface-1)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg mb-4">Email Frequency</h3>
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-muted)]">
                <strong className="text-[var(--text)]">Applications & Inquiries:</strong> Immediately
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                <strong className="text-[var(--text)]">Updates:</strong> Within 24 hours
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                <strong className="text-[var(--text)]">Monthly Report:</strong> First day of month
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
