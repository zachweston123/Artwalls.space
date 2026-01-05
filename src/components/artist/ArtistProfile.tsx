import { useEffect, useState } from 'react';
import { User, Mail, Phone, Link as LinkIcon, DollarSign, Edit, Save, X } from 'lucide-react';
import { PlanBadge } from '../pricing/PlanBadge';

interface ArtistProfileProps {
  onNavigate: (page: string) => void;
}

export function ArtistProfile({ onNavigate }: ArtistProfileProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'growth' | 'pro'>('free');

  // Demo values for summary (would come from orders on real data)
  const [totalEarnings] = useState(0);
  const [pendingPayout] = useState(0);

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
        } else {
          const row = artistRows[0] as any;
          setName(row.name || (user.user_metadata?.name as string) || 'Artist');
          setEmail(row.email || user.email || '');
          setPhone((row.phone_number as string) || ((user.user_metadata?.phone as string) || ''));
          const tier = (row.subscription_tier as 'free' | 'starter' | 'growth' | 'pro') || 'free';
          setCurrentPlan(tier);
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

  async function handleSave() {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Not signed in');

      // Update artists table (name only; email matches auth)
      const { error: upErr } = await supabase
        .from('artists')
        .upsert({ id: user.id, name, email, phone_number: phone, subscription_tier: currentPlan }, { onConflict: 'id' });
      if (upErr) throw upErr;

      // Update metadata and email in auth
      const { error: metaErr } = await supabase.auth.updateUser({ data: { portfolioUrl, phone }, email });
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-[var(--surface-1)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-[var(--surface-2)] border border-[var(--border)] rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-[var(--blue)]" />
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
              </div>
            ) : (
              <div className="space-y-4">
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
                <div>
                  <label className="block text-sm text-[var(--text-muted)] mb-1">Portfolio Website</label>
                  <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]" placeholder="https://your-portfolio.example" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] p-6">
            <h3 className="text-lg mb-4 text-[var(--text)]">Account Settings</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors">
                <p className="text-[var(--text)] mb-1">Password & Security</p>
                <p className="text-sm text-[var(--text-muted)]">Change your password and security settings</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border border-[var(--border)] rounded-lg transition-colors">
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
