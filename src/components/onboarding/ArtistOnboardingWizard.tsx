import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Upload,
  Wallet,
  Zap,
} from 'lucide-react';
import type { User } from '../../App';
import { getErrorMessage } from '../../lib/errors';
import { CitySelect } from '../shared/CitySelect';
import { LabelChip } from '../LabelChip';
import { ArtistPayoutsCard } from '../artist/ArtistPayoutsCard';
import { uploadArtworkImage } from '../../lib/storage';
import { apiPost } from '../../lib/api';
import { useArtistOnboarding } from '../../hooks/useArtistOnboarding';
import { supabase } from '../../lib/supabase';

interface ArtistOnboardingWizardProps {
  user: User;
  onComplete: () => void;
  onSkip: () => void;
}

const MEDIUM_OPTIONS = [
  'Painter',
  'Photographer',
  'Illustrator',
  'Digital',
  'Mixed Media',
  'Printmaker',
  'Collage',
  'Sculptor',
  'Street Artist',
  'Installation',
  'Textile Artist',
  'Ceramicist',
];

const STYLE_OPTIONS = [
  'Abstract',
  'Figurative',
  'Surreal',
  'Minimalist',
  'Pop Art',
  'Realism',
  'Landscape',
  'Portrait',
  'Conceptual',
  'Street / Urban',
  'Mixed Style',
];

const PLAN_CARDS = [
  { id: 'free', title: 'Free', pct: 60, price: '$0', popular: false },
  { id: 'starter', title: 'Starter', pct: 80, price: '$9', popular: false },
  { id: 'growth', title: 'Growth', pct: 83, price: '$19', popular: true },
  { id: 'pro', title: 'Pro', pct: 85, price: '$39', popular: false },
] as const;

type PlanId = (typeof PLAN_CARDS)[number]['id'];

type ArtworkDraft = {
  title: string;
  price: string;
  width: string;
  height: string;
  unit: 'in' | 'cm';
  imageUrl: string;
};

export function ArtistOnboardingWizard({ user, onComplete, onSkip }: ArtistOnboardingWizardProps) {
  const { state, refresh, updateProfile, updateStep, updateArtworkCount, logEvent, complete, requirementsSatisfied } = useArtistOnboarding(user.id);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [profileDraft, setProfileDraft] = useState(state.profile);
  const [saving, setSaving] = useState(false);
  const [artworks, setArtworks] = useState<Array<{ id: string; title: string; image_url: string | null; status: string }>>([]);
  const [artworkDraft, setArtworkDraft] = useState<ArtworkDraft>({ title: '', price: '', width: '', height: '', unit: 'in', imageUrl: '' });
  const [artworkError, setArtworkError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [planWorking, setPlanWorking] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<PlanId>('free');
  const totalSteps = 6;

  useEffect(() => {
    if (state.step) setActiveStep(state.step);
    if (state.plan) setLocalPlan(state.plan as PlanId);
    setProfileDraft(state.profile);
  }, [state.step, state.plan, state.profile]);

  useEffect(() => {
    refreshArtworks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshArtworks = async () => {
    const { data, count } = await supabase
      .from('artworks')
      .select('id,title,image_url,status', { count: 'exact' })
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);
    const rows = data || [];
    setArtworks(rows as any);
    updateArtworkCount(count || rows.length);
  };

  const progress = useMemo(() => Math.round((activeStep / totalSteps) * 100), [activeStep]);

  const handleBasicsSave = async () => {
    setSaving(true);
    try {
      await updateProfile(profileDraft, 2);
      await updateStep(2);
      await logEvent('onboarding_step_completed', { step: 1 });
      setActiveStep(2);
    } finally {
      setSaving(false);
    }
  };

  const handleStyleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(profileDraft, 3);
      await updateStep(3);
      await logEvent('onboarding_step_completed', { step: 2 });
      setActiveStep(3);
    } finally {
      setSaving(false);
    }
  };

  const handlePricingSave = async () => {
    setSaving(true);
    try {
      await updateProfile(profileDraft, 5);
      await updateStep(5);
      await logEvent('onboarding_step_completed', { step: 4 });
      setActiveStep(5);
    } finally {
      setSaving(false);
    }
  };

  const handlePlanSelect = async (plan: PlanId, action: 'free' | 'upgrade' | 'skip') => {
    setPlanWorking(plan);
    try {
      setLocalPlan(plan);
      await updateStep(6, { selectedPlan: plan, skippedPlanSelection: action === 'skip' });
      if (action === 'upgrade' && plan !== 'free') {
        await logEvent('upgrade_clicked', { plan });
        const { url } = await apiPost<{ url: string }>('/api/stripe/billing/create-subscription-session', { tier: plan, artistId: user.id });
        window.location.href = url;
        return;
      }
      if (action === 'free') {
        await logEvent('plan_selected', { plan: 'free' });
      }
      setActiveStep(6);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Unable to start plan flow');
    } finally {
      setPlanWorking(null);
    }
  };

  const handleComplete = async () => {
    if (!requirementsSatisfied) return;
    setSaving(true);
    try {
      await complete();
      await logEvent('onboarding_finished', { plan: localPlan });
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    await updateStep(activeStep);
    await logEvent('onboarding_skipped', { step: activeStep });
    onSkip();
  };

  const continueFromArtworks = async (finishLater?: boolean) => {
    await updateStep(4);
    await logEvent('onboarding_step_completed', { step: 3, artworkCount: state.artworkCount });
    setActiveStep(4);
    if (finishLater) {
      onSkip();
    }
  };

  const continueFromPayouts = async () => {
    await updateStep(6);
    setActiveStep(6);
  };

  const handleArtworkUpload = async (file?: File) => {
    if (!file) return;
    try {
      setArtworkError(null);
      const url = await uploadArtworkImage(user.id, file);
      setArtworkDraft((prev) => ({ ...prev, imageUrl: url }));
    } catch (err: unknown) {
      setArtworkError(getErrorMessage(err) || 'Upload failed');
    }
  };

  const saveArtwork = async () => {
    setArtworkError(null);
    if (!artworkDraft.title.trim()) {
      setArtworkError('Add a title for this artwork');
      return;
    }
    const priceNumber = Number(artworkDraft.price);
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
      setArtworkError('Add a price to continue');
      return;
    }
    if (!artworkDraft.imageUrl) {
      setArtworkError('Upload at least one photo');
      return;
    }
    const width = Number(artworkDraft.width);
    const height = Number(artworkDraft.height);
    const hasSize = Number.isFinite(width) && Number.isFinite(height);

    const { data, error } = await supabase
      .from('artworks')
      .insert({
        artist_id: user.id,
        artist_name: user.name,
        title: artworkDraft.title,
        price_cents: Math.round(priceNumber * 100),
        currency: 'usd',
        image_url: artworkDraft.imageUrl,
        dimensions_width: hasSize ? width : null,
        dimensions_height: hasSize ? height : null,
        dimensions_unit: artworkDraft.unit,
        status: 'available',
        is_publishable: true,
      })
      .select('id,title,image_url,status');

    if (error) {
      setArtworkError(error.message);
      return;
    }

    await refreshArtworks();
    setArtworkDraft({ title: '', price: '', width: '', height: '', unit: 'in', imageUrl: '' });
    await logEvent('onboarding_artwork_added', { title: artworkDraft.title });
  };

  const renderStep = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Display name</label>
                <input
                  value={profileDraft.displayName}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, displayName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="How should venues see you?"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">City</label>
                <CitySelect
                  value={profileDraft.city}
                  onChange={(city) => setProfileDraft((p) => ({ ...p, city }))}
                  placeholder="Where are you based?"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Short bio</label>
              <textarea
                value={profileDraft.bio}
                onChange={(e) => setProfileDraft((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                maxLength={400}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                placeholder="1–2 sentences about your practice"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Lead with what makes your work unique. {profileDraft.bio.length}/400</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Instagram (optional)</label>
                <input
                  value={profileDraft.instagramUrl || ''}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, instagramUrl: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="https://instagram.com/you"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-muted)] mb-1">Website (optional)</label>
                <input
                  value={profileDraft.websiteUrl || ''}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, websiteUrl: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="https://yourname.com"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button onClick={handleSkip} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)]">Skip for now</button>
              <button onClick={handleBasicsSave} disabled={saving} className="px-6 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] disabled:opacity-60">{saving ? 'Saving…' : 'Save & continue'}</button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">Pick your primary mediums (2–3 works best)</p>
              <div className="flex flex-wrap gap-2">
                {MEDIUM_OPTIONS.map((option) => (
                  <LabelChip
                    key={option}
                    label={option}
                    selected={profileDraft.mediums.includes(option)}
                    onClick={() => {
                      const has = profileDraft.mediums.includes(option);
                      const next = has ? profileDraft.mediums.filter((m) => m !== option) : [...profileDraft.mediums, option].slice(0, 4);
                      setProfileDraft((p) => ({ ...p, mediums: next }));
                    }}
                    role="artist"
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">Style tags help venues match you</p>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map((option) => (
                  <LabelChip
                    key={option}
                    label={option}
                    selected={profileDraft.styleTags.includes(option)}
                    onClick={() => {
                      const has = profileDraft.styleTags.includes(option);
                      const next = has ? profileDraft.styleTags.filter((t) => t !== option) : [...profileDraft.styleTags, option].slice(0, 5);
                      setProfileDraft((p) => ({ ...p, styleTags: next }));
                    }}
                    role="artist"
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button onClick={() => setActiveStep(1)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back</button>
              <button onClick={handleStyleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] disabled:opacity-60">{saving ? 'Saving…' : 'Save & continue'}</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center"><ImageIcon className="w-5 h-5 text-[var(--blue)]" /></div>
                <div className="flex-1">
                  <h3 className="text-lg text-[var(--text)] mb-1">Add at least 3 artworks</h3>
                  <p className="text-sm text-[var(--text-muted)]">Quick add: title, price, size, and one photo. You can polish later.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">{state.artworkCount} added · {Math.max(0, 3 - state.artworkCount)} to go for completion</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--text-muted)]">Title</label>
                <input
                  value={artworkDraft.title}
                  onChange={(e) => setArtworkDraft((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="Sunset Study"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)]">Price (USD)</label>
                <input
                  value={artworkDraft.price}
                  onChange={(e) => setArtworkDraft((p) => ({ ...p, price: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="350"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="text-sm text-[var(--text-muted)]">Width</label>
                <input
                  value={artworkDraft.width}
                  onChange={(e) => setArtworkDraft((p) => ({ ...p, width: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="24"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)]">Height</label>
                <input
                  value={artworkDraft.height}
                  onChange={(e) => setArtworkDraft((p) => ({ ...p, height: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="36"
                />
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)]">Unit</label>
                <select
                  value={artworkDraft.unit}
                  onChange={(e) => setArtworkDraft((p) => ({ ...p, unit: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                >
                  <option value="in">inches</option>
                  <option value="cm">cm</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-[var(--text-muted)]">Photo</label>
                <button
                  onClick={() => document.getElementById('onboarding-artwork-upload')?.click()}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> {artworkDraft.imageUrl ? 'Replace' : 'Upload'}
                </button>
                <input
                  id="onboarding-artwork-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleArtworkUpload(e.target.files?.[0])}
                />
                {artworkDraft.imageUrl && (
                  <img src={artworkDraft.imageUrl} alt="preview" className="mt-2 h-24 w-full object-cover rounded-lg border border-[var(--border)]" />
                )}
              </div>
            </div>
            {artworkError && (
              <div className="p-3 bg-[var(--danger-muted)] border border-[var(--danger)]/30 rounded-lg text-sm text-[var(--danger)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {artworkError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={saveArtwork} className="px-5 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Add artwork
              </button>
              <p className="text-xs text-[var(--text-muted)]">You can keep adding more after onboarding.</p>
            </div>
            {artworks.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {artworks.map((art) => (
                  <div key={art.id} className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface-1)]">
                    {art.image_url ? (
                      <img src={art.image_url} alt={art.title} className="h-28 w-full object-cover" />
                    ) : (
                      <div className="h-28 w-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--text-muted)]">No photo</div>
                    )}
                    <div className="p-2">
                      <p className="text-sm font-semibold text-[var(--text)] line-clamp-1">{art.title}</p>
                      <p className="text-xs text-[var(--text-muted)] capitalize">{art.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button onClick={() => setActiveStep(2)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back</button>
              <div className="flex gap-3">
                <button onClick={() => continueFromArtworks(true)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)]">Save & finish later</button>
                <button onClick={() => continueFromArtworks(false)} className="px-6 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)]">Continue</button>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[var(--text-muted)]">Typical price range</label>
                <input
                  value={profileDraft.priceRange || ''}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, priceRange: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                  placeholder="$300 - $1200"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  id="commissions"
                  type="checkbox"
                  checked={!!profileDraft.acceptsCommissions}
                  onChange={(e) => setProfileDraft((p) => ({ ...p, acceptsCommissions: e.target.checked }))}
                  className="h-4 w-4"
                />
                <label htmlFor="commissions" className="text-sm text-[var(--text)]">I accept commissions</label>
              </div>
            </div>
            <div>
              <label className="text-sm text-[var(--text-muted)]">Availability / framing notes</label>
              <textarea
                value={profileDraft.availabilityNotes || ''}
                onChange={(e) => setProfileDraft((p) => ({ ...p, availabilityNotes: e.target.value, framingNotes: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text)]"
                placeholder="Ready to ship, framing optional, open to rentals..."
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button onClick={() => setActiveStep(3)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back</button>
              <button onClick={handlePricingSave} disabled={saving} className="px-6 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)] hover:bg-[var(--blue-hover)] disabled:opacity-60">{saving ? 'Saving…' : 'Save & continue'}</button>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center"><Wallet className="w-5 h-5 text-[var(--blue)]" /></div>
                <div className="flex-1">
                  <h3 className="text-lg text-[var(--text)] mb-1">Connect payouts (recommended)</h3>
                  <p className="text-sm text-[var(--text-muted)]">Set up Stripe Express to get paid automatically. You can still continue if you need to finish later.</p>
                </div>
              </div>
            </div>
            <ArtistPayoutsCard user={user} />
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <button onClick={() => setActiveStep(4)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back</button>
              <button onClick={continueFromPayouts} className="px-6 py-2 rounded-lg bg-[var(--blue)] text-[var(--on-blue)]">Continue</button>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-3)] flex items-center justify-center"><Zap className="w-5 h-5 text-[var(--accent)]" /></div>
                <div className="flex-1">
                  <h3 className="text-lg text-[var(--text)] mb-1">Boost earnings & visibility (optional)</h3>
                  <p className="text-sm text-[var(--text-muted)]">Pick a plan or stay on Free. Take-home percentages are upfront—no paywall.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {PLAN_CARDS.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-xl p-4 bg-[var(--surface-1)] ${plan.popular ? 'border-[var(--blue)] shadow-md' : 'border-[var(--border)]'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">{plan.price}/mo</p>
                      <h4 className="text-xl font-semibold text-[var(--text)]">{plan.title}</h4>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs bg-[var(--surface-2)]">Take home {plan.pct}%</div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-3">Platform + processing shown separately. Upgrade anytime.</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handlePlanSelect(plan.id, plan.id === 'free' ? 'free' : 'upgrade')}
                      disabled={planWorking === plan.id}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border ${plan.id === localPlan ? 'bg-[var(--blue)] text-[var(--on-blue)] border-[var(--blue)]' : 'bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]'} hover:brightness-105 disabled:opacity-60`}
                    >
                      {planWorking === plan.id ? 'Opening checkout…' : plan.id === 'free' ? 'Continue with Free' : 'See plans / Upgrade'}
                    </button>
                    {plan.id !== 'free' && (
                      <button
                        onClick={() => handlePlanSelect(plan.id, 'skip')}
                        className="w-full px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        Skip / decide later
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <CheckCircle2 className={`w-4 h-4 ${requirementsSatisfied ? 'text-[var(--green)]' : 'text-[var(--text-muted)]'}`} />
                <span>Basics, style, and 3+ artworks are required to finish.</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveStep(5)} className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)]">Back</button>
                <button
                  onClick={handleComplete}
                  disabled={!requirementsSatisfied || saving}
                  className="px-6 py-2 rounded-lg bg-[var(--green)] text-[var(--on-green)] hover:bg-[var(--green-hover)] disabled:opacity-60"
                >
                  {saving ? 'Finishing…' : 'Finish onboarding'}
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--text-muted)]">Artist onboarding</p>
            <h1 className="text-3xl font-bold">Get ready to sell & host</h1>
          </div>
          <button onClick={handleSkip} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">Skip for now</button>
        </div>

        <div>
          <div className="w-full bg-[var(--surface-2)] rounded-full h-2 overflow-hidden">
            <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">Step {activeStep} of {totalSteps}</p>
        </div>

        {error && (
          <div className="p-3 bg-[var(--danger-muted)] border border-[var(--danger)]/30 rounded-lg text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div key={step} className={`p-3 rounded-lg border text-sm ${activeStep === step ? 'border-[var(--blue)] bg-[var(--surface-1)]' : 'border-[var(--border)] bg-[var(--surface-2)]'}`}>
              Step {step}
            </div>
          ))}
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          {renderStep()}
        </div>

        {!requirementsSatisfied && activeStep === 6 && (
          <div className="p-4 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-sm text-[var(--text-muted)] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>Add {Math.max(0, 3 - state.artworkCount)} more artwork(s) to finish onboarding. You can keep exploring meanwhile.</span>
          </div>
        )}
      </div>
    </div>
  );
}
