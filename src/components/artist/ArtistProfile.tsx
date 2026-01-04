import { supabase } from "../../lib/supabase";
import { useEffect, useState } from 'react';
import { User, Mail, Link as LinkIcon, DollarSign, Edit, Save, X } from 'lucide-react';
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
  const [currentPlan, setCurrentPlan] = useState<'free' | 'starter' | 'growth' | 'pro'>('free');

  const [totalEarnings] = useState(0);
  const [pendingPayout] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) throw sessionErr;
        const user = sessionData.session?.user;
        if (!user) throw new Error('Not signed in');

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
          setCurrentPlan('free');
        } else {
          const row = artistRows[0] as any;
          setName(row.name || (user.user_metadata?.name as string) || 'Artist');
          setEmail(row.email || user.email || '');
          const tier = (row.subscription_tier as 'free' | 'starter' | 'growth' | 'pro') || 'free';
          setCurrentPlan(tier);
        }

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
      
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Not signed in');

      const { error: upErr } = await supabase
        .from('artists')
        .upsert({ id: user.id, name, email, subscription_tier: currentPlan }, { onConflict: 'id' });
      if (upErr) throw upErr;

      const { error: metaErr } = await supabase.auth.updateUser({ data: { portfolioUrl } });
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
    <div>
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-neutral-900">Artist Profile</h1>
        <p className="text-neutral-600">Manage your account information and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information Card */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl mb-1 text-neutral-900">{name || 'Artist'}</h2>
                  <PlanBadge plan={currentPlan} size="sm" showUpgrade onUpgrade={() => onNavigate('plans-pricing')} />
                </div>
              </div>
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button disabled={saving} onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-60">
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving…' : 'Save'}</span>
                  </button>
                  <button disabled={saving} onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>

            {(error || info) && (
              <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${error ? 'bg-neutral-50 border-neutral-200 text-red-600' : 'bg-neutral-50 border-neutral-200 text-neutral-900'}`}>
                {error || info}
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
                  <Mail className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm text-neutral-500 mb-1">Email Address</label>
                    <p className="text-neutral-900">{email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
                  <LinkIcon className="w-5 h-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1">
                    <label className="block text-sm text-neutral-500 mb-1">Portfolio Website</label>
                    {portfolioUrl ? (
                      <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {portfolioUrl}
                      </a>
                    ) : (
                      <p className="text-neutral-500">Not set</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-600 mb-1">Display Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm text-neutral-600 mb-1">Portfolio Website</label>
                  <input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://your-portfolio.example" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-neutral-200 p-6">
            <h3 className="text-lg mb-4 text-neutral-900">Account Settings</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors">
                <p className="text-neutral-900 mb-1">Password & Security</p>
                <p className="text-sm text-neutral-500">Change your password and security settings</p>
              </button>
              <button className="w-full text-left px-4 py-3 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition-colors">
                <p className="text-neutral-900 mb-1">Notification Preferences</p>
                <p className="text-sm text-neutral-500">Manage email and push notifications</p>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Summary Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg text-neutral-900">Earnings Summary</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Total Earnings</p>
                <p className="text-2xl text-neutral-900">${totalEarnings.toFixed(2)}</p>
              </div>
              
              <div className="pt-4 border-t border-neutral-200">
                <p className="text-sm text-neutral-500 mb-1">Pending Payout</p>
                <p className="text-xl text-blue-600">${pendingPayout.toFixed(2)}</p>
                <p className="text-xs text-neutral-500 mt-1">Processed monthly on the 15th</p>
              </div>
            </div>

            <button 
              onClick={() => onNavigate('artist-sales')}
              className="w-full mt-4 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              View Sales History
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <h3 className="text-lg mb-3 text-neutral-900">Quick Actions</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('artist-artworks')}
                className="w-full text-left px-4 py-2 bg-neutral-50 text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                Manage Artworks
              </button>
              <button 
                onClick={() => onNavigate('artist-venues')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                Browse Venues
              </button>
              <button 
                onClick={() => onNavigate('plans-pricing')}
                className="w-full text-left px-4 py-2 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
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
