import { useEffect, useState } from 'react';
import { 
  User, 
  CreditCard, 
  Palette, 
  Check, 
  Loader2, 
  ExternalLink, 
  AlertCircle,
  Monitor,
  Sun,
  Moon,
  Mail,
  Phone,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import type { ThemePreference } from '../../lib/theme';
import { applyThemePreference, getStoredThemePreference } from '../../lib/theme';
import { PlanBadge } from '../pricing/PlanBadge';

interface SettingsProps {
  onNavigate: (page: string) => void;
}

type SettingsSection = 'profile' | 'billing' | 'appearance';

export function Settings({ onNavigate }: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');

  // Subscription state
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'growth' | 'pro'>('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('inactive');
  const [managingPortal, setManagingPortal] = useState(false);

  // Theme state
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        const user = sessionData.session?.user;
        if (!user) throw new Error('Not signed in');

        // Load artist data
        const { data: artistRows, error: selErr } = await supabase
          .from('artists')
          .select('*')
          .eq('id', user.id)
          .limit(1);
        if (selErr) throw selErr;

        if (artistRows && artistRows.length > 0) {
          const row = artistRows[0] as any;
          setName(row.name || user.user_metadata?.name || '');
          setOriginalName(row.name || user.user_metadata?.name || '');
          setEmail(row.email || user.email || '');
          setPhone(row.phone_number || user.user_metadata?.phone || '');
          setOriginalPhone(row.phone_number || user.user_metadata?.phone || '');
          setCurrentPlan(row.subscription_tier || 'free');
          setSubscriptionStatus(row.subscription_status || 'inactive');
        } else {
          setName(user.user_metadata?.name || '');
          setOriginalName(user.user_metadata?.name || '');
          setEmail(user.email || '');
          setPhone(user.user_metadata?.phone || '');
          setOriginalPhone(user.user_metadata?.phone || '');
        }

        // Load theme preference
        setThemePreference(getStoredThemePreference());
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load settings');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const hasProfileChanges = name !== originalName || phone !== originalPhone;

  async function saveProfile() {
    if (!hasProfileChanges) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Not signed in');

      // Update in Supabase
      const { error: updateErr } = await supabase
        .from('artists')
        .update({
          name: name.trim(),
          phone_number: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (updateErr) throw updateErr;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          phone: phone.trim(),
        },
      });

      setOriginalName(name.trim());
      setOriginalPhone(phone.trim());
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function openBillingPortal() {
    setError(null);
    setManagingPortal(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError('Please sign in to manage your subscription.');
        return;
      }
      const { url } = await apiPost<{ url: string }>(
        '/api/stripe/billing/create-portal-session',
        {}
      );
      window.location.href = url;
    } catch (e: any) {
      let userMessage = 'Unable to open Billing Portal';
      if (e.message?.includes('CORS') || e.message?.includes('Failed to fetch')) {
        userMessage = 'Connection issue. Please refresh the page and try again.';
      } else if (e.message) {
        userMessage = e.message;
      }
      setError(userMessage);
    } finally {
      setManagingPortal(false);
    }
  }

  function handleThemeChange(preference: ThemePreference) {
    setThemePreference(preference);
    applyThemePreference(preference);
  }

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-[var(--text)]">Settings</h1>
        <p className="text-[var(--text-muted)]">
          Manage your account, subscription, and preferences
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-[var(--danger-muted)] border border-[var(--danger)] text-[var(--danger)] p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-6 bg-[var(--green-muted)] border border-[var(--green)] text-[var(--green)] p-4 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="lg:w-56 shrink-0">
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-2 lg:sticky lg:top-24">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-[var(--blue)] text-[var(--on-blue)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{section.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-[var(--text)] mb-6">Profile Information</h2>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full pl-11 pr-4 py-3 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                      />
                    </div>
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full pl-11 pr-4 py-3 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg text-[var(--text-muted)] cursor-not-allowed opacity-60"
                      />
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Email cannot be changed here. Contact support if you need to update it.
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full pl-11 pr-4 py-3 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={saveProfile}
                    disabled={!hasProfileChanges || saving}
                    className="px-6 py-3 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  {hasProfileChanges && (
                    <span className="text-sm text-[var(--text-muted)]">You have unsaved changes</span>
                  )}
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => onNavigate('artist-profile')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <span>Edit Full Profile</span>
                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                  <button
                    onClick={() => onNavigate('artist-password-security')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <span>Password & Security</span>
                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                  <button
                    onClick={() => onNavigate('artist-notifications')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <span>Notification Preferences</span>
                    <ChevronRight className="w-5 h-5 text-[var(--text-muted)]" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeSection === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-[var(--text)] mb-6">Current Subscription</h2>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[var(--blue)]/10 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-[var(--blue)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-[var(--text)] capitalize">{currentPlan} Plan</span>
                        <PlanBadge plan={currentPlan} />
                      </div>
                      <p className="text-sm text-[var(--text-muted)] capitalize">
                        Status: {subscriptionStatus}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('plans-pricing')}
                    className="px-4 py-2 bg-[var(--blue)] text-[var(--on-blue)] rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    {currentPlan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </button>
                </div>
              </div>

              {/* Manage Subscription */}
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Manage Subscription</h3>
                <p className="text-[var(--text-muted)] mb-6">
                  Access the Stripe billing portal to manage your payment methods, view invoices, or cancel your subscription.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={openBillingPortal}
                    disabled={managingPortal}
                    className="w-full sm:w-auto px-6 py-3 bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] rounded-lg font-medium hover:bg-[var(--surface-2)] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {managingPortal ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening Portal...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Manage Billing & Payments
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-[var(--text-muted)]">
                    You'll be redirected to Stripe's secure portal. From there you can update payment methods, download invoices, or cancel your subscription.
                  </p>
                </div>
              </div>

              {/* Billing Info */}
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Billing Support</h3>
                <p className="text-[var(--text-muted)] mb-4">
                  Have questions about billing or need help with your subscription?
                </p>
                <button
                  onClick={() => onNavigate('support')}
                  className="text-[var(--blue)] hover:underline text-sm font-medium"
                >
                  Contact Support →
                </button>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-[var(--text)] mb-2">Theme</h2>
                <p className="text-[var(--text-muted)] mb-6">
                  Choose how Artwalls looks to you. Select a theme or let the app follow your system settings.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* System */}
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      themePreference === 'system'
                        ? 'border-[var(--blue)] bg-[var(--blue)]/5'
                        : 'border-[var(--border)] bg-[var(--surface-3)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg flex items-center justify-center">
                      <Monitor className="w-6 h-6 text-[var(--text)]" />
                    </div>
                    <p className="font-medium text-[var(--text)] text-center">System</p>
                    <p className="text-xs text-[var(--text-muted)] text-center mt-1">
                      Match device settings
                    </p>
                    {themePreference === 'system' && (
                      <div className="mt-3 flex justify-center">
                        <Check className="w-5 h-5 text-[var(--blue)]" />
                      </div>
                    )}
                  </button>

                  {/* Light */}
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      themePreference === 'light'
                        ? 'border-[var(--blue)] bg-[var(--blue)]/5'
                        : 'border-[var(--border)] bg-[var(--surface-3)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                      <Sun className="w-6 h-6 text-amber-500" />
                    </div>
                    <p className="font-medium text-[var(--text)] text-center">Light</p>
                    <p className="text-xs text-[var(--text-muted)] text-center mt-1">
                      Always use light mode
                    </p>
                    {themePreference === 'light' && (
                      <div className="mt-3 flex justify-center">
                        <Check className="w-5 h-5 text-[var(--blue)]" />
                      </div>
                    )}
                  </button>

                  {/* Dark */}
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      themePreference === 'dark'
                        ? 'border-[var(--blue)] bg-[var(--blue)]/5'
                        : 'border-[var(--border)] bg-[var(--surface-3)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                      <Moon className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="font-medium text-[var(--text)] text-center">Dark</p>
                    <p className="text-xs text-[var(--text-muted)] text-center mt-1">
                      Always use dark mode
                    </p>
                    {themePreference === 'dark' && (
                      <div className="mt-3 flex justify-center">
                        <Check className="w-5 h-5 text-[var(--blue)]" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">About Theme Settings</h3>
                <p className="text-sm text-[var(--text-muted)]">
                  Your theme preference is saved locally on this device. When set to "System", the app will automatically switch between light and dark mode based on your device or browser settings.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
