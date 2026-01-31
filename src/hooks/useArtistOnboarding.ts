import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { calculateProfileCompleteness } from '../lib/profileCompleteness';
import type { PlanId } from '../lib/entitlements';

export interface ArtistOnboardingProfile {
  displayName: string;
  city: string;
  bio: string;
  mediums: string[];
  styleTags: string[];
  instagramUrl?: string;
  websiteUrl?: string;
  acceptsCommissions?: boolean;
  priceRange?: string;
  availabilityNotes?: string;
  framingNotes?: string;
}

export interface ArtistOnboardingState {
  loading: boolean;
  step: number;
  completed: boolean;
  profile: ArtistOnboardingProfile;
  artworkCount: number;
  payoutsReady: boolean;
  plan: PlanId | null;
  skippedPlanSelection: boolean;
  requirementsMet: {
    basics: boolean;
    style: boolean;
    artworks: boolean;
  };
}

const defaultProfile: ArtistOnboardingProfile = {
  displayName: '',
  city: '',
  bio: '',
  mediums: [],
  styleTags: [],
  instagramUrl: '',
  websiteUrl: '',
  acceptsCommissions: false,
  priceRange: '',
  availabilityNotes: '',
  framingNotes: '',
};

function uniqueSteps(existing: any, step: number) {
  const steps = Array.isArray(existing) ? existing.slice() : [];
  if (!steps.includes(step)) steps.push(step);
  return steps.sort((a, b) => Number(a) - Number(b));
}

export function useArtistOnboarding(userId?: string) {
  const [state, setState] = useState<ArtistOnboardingState>({
    loading: true,
    step: 1,
    completed: false,
    profile: defaultProfile,
    artworkCount: 0,
    payoutsReady: false,
    plan: null,
    skippedPlanSelection: false,
    requirementsMet: { basics: false, style: false, artworks: false },
  });
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setError(null);
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { data: artist, error: artistErr } = await supabase
        .from('artists')
        .select(
          [
            'name',
            'display_name',
            'city',
            'city_primary',
            'bio',
            'art_types',
            'style_tags',
            'mediums',
            'instagram_handle',
            'instagram_url',
            'website_url',
            'onboarding_completed',
            'onboarding_step',
            'profile_completion_percent',
            'stripe_payouts_enabled',
            'stripe_account_id',
            'stripe_onboarding_status',
            'subscription_tier',
            'accepts_commissions',
            'price_range',
            'availability_notes',
            'framing_notes',
            'selected_plan',
            'plan_selected_at',
          ].join(',')
        )
        .eq('id', userId)
        .single();

      if (artistErr) throw artistErr;

      const { count: artworkCount = 0 } = await supabase
        .from('artworks')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', userId);

      const { data: onboardingRow, error: obErr } = await supabase
        .from('artist_onboarding')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      if (obErr && obErr.code !== 'PGRST116') throw obErr;

      if (!onboardingRow) {
        await supabase.from('artist_onboarding').upsert({ user_id: userId });
      }

      const profile: ArtistOnboardingProfile = {
        displayName: artist.display_name || artist.name || '',
        city: artist.city || artist.city_primary || '',
        bio: artist.bio || '',
        mediums: artist.mediums || artist.art_types || [],
        styleTags: artist.style_tags || [],
        instagramUrl: artist.instagram_url || artist.instagram_handle || '',
        websiteUrl: artist.website_url || '',
        acceptsCommissions: artist.accepts_commissions ?? false,
        priceRange: artist.price_range || '',
        availabilityNotes: artist.availability_notes || '',
        framingNotes: artist.framing_notes || '',
      };

      const stepFromArtist = artist.onboarding_step || 1;
      const stepFromRow = onboardingRow?.current_step || stepFromArtist;
      const selectedPlan = (artist.selected_plan || artist.subscription_tier || 'free') as PlanId;

      const basics = !!(profile.displayName && profile.city && profile.bio);
      const style = (profile.mediums?.length || 0) > 0 && (profile.styleTags?.length || 0) > 0;
      const artworksReady = artworkCount >= 3;

      setState({
        loading: false,
        step: stepFromRow,
        completed: !!artist.onboarding_completed,
        profile,
        artworkCount,
        payoutsReady: !!artist.stripe_payouts_enabled,
        plan: selectedPlan,
        skippedPlanSelection: !!onboardingRow?.skipped_plan_selection,
        requirementsMet: { basics, style, artworks: artworksReady },
      });
    } catch (err: any) {
      console.error('load onboarding failed', err);
      setError(err?.message || 'Unable to load onboarding');
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(
    async (updates: Partial<ArtistOnboardingProfile>, nextStep?: number) => {
      if (!userId) return;
      setError(null);
      const profile = { ...state.profile, ...updates };
      const completeness = calculateProfileCompleteness({
        name: profile.displayName,
        bio: profile.bio,
        artTypes: profile.mediums,
        primaryCity: profile.city,
        instagramHandle: profile.instagramUrl,
        portfolioUrl: profile.websiteUrl,
      });
      const { error: upErr } = await supabase
        .from('artists')
        .update({
          display_name: profile.displayName,
          name: profile.displayName,
          city: profile.city,
          city_primary: profile.city,
          bio: profile.bio,
          mediums: profile.mediums,
          art_types: profile.mediums,
          style_tags: profile.styleTags,
          instagram_url: profile.instagramUrl,
          instagram_handle: profile.instagramUrl,
          website_url: profile.websiteUrl,
          accepts_commissions: profile.acceptsCommissions,
          price_range: profile.priceRange,
          availability_notes: profile.availabilityNotes,
          framing_notes: profile.framingNotes,
          onboarding_step: nextStep ? Math.max(state.step, nextStep) : state.step,
          profile_completion_percent: completeness.percentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (upErr) throw upErr;

      const stepToPersist = nextStep || state.step;
      const { error: obErr } = await supabase
        .from('artist_onboarding')
        .upsert({
          user_id: userId,
          current_step: stepToPersist,
          steps_completed: uniqueSteps(state.step, stepToPersist),
          updated_at: new Date().toISOString(),
        });

      if (obErr) throw obErr;

      setState((prev) => ({
        ...prev,
        profile,
        step: stepToPersist,
        requirementsMet: {
          basics: !!(profile.displayName && profile.city && profile.bio),
          style: (profile.mediums?.length || 0) > 0 && (profile.styleTags?.length || 0) > 0,
          artworks: prev.requirementsMet.artworks,
        },
      }));
    },
    [state.profile, state.step, userId]
  );

  const updateStep = useCallback(
    async (step: number, extras?: Partial<{ skippedPlanSelection: boolean; selectedPlan: PlanId | null }>) => {
      if (!userId) return;
      const nextStep = Math.max(1, step);
      const { error: artistErr } = await supabase
        .from('artists')
        .update({ onboarding_step: nextStep })
        .eq('id', userId);
      if (artistErr) throw artistErr;

      const { error: obErr } = await supabase
        .from('artist_onboarding')
        .upsert({
          user_id: userId,
          current_step: nextStep,
          steps_completed: uniqueSteps(state.step, nextStep),
          skipped_plan_selection: extras?.skippedPlanSelection ?? state.skippedPlanSelection,
          selected_plan: extras?.selectedPlan ?? state.plan,
          updated_at: new Date().toISOString(),
        });
      if (obErr) throw obErr;

      setState((prev) => ({
        ...prev,
        step: nextStep,
        skippedPlanSelection: extras?.skippedPlanSelection ?? prev.skippedPlanSelection,
        plan: (extras?.selectedPlan ?? prev.plan) as PlanId,
      }));
    },
    [state.plan, state.skippedPlanSelection, state.step, userId]
  );

  const updateArtworkCount = useCallback((count: number) => {
    setState((prev) => ({
      ...prev,
      artworkCount: count,
      requirementsMet: { ...prev.requirementsMet, artworks: count >= 3 },
    }));
  }, []);

  const logEvent = useCallback(
    async (eventType: string, metadata?: Record<string, any>) => {
      if (!userId) return;
      try {
        await supabase.from('events').insert({
          event_type: eventType,
          user_id: userId,
          metadata: metadata || {},
        });
      } catch (err) {
        console.warn('onboarding event log failed', err);
      }
    },
    [userId]
  );

  const complete = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    await supabase
      .from('artists')
      .update({ onboarding_completed: true, onboarding_step: Math.max(state.step, 6), updated_at: now })
      .eq('id', userId);
    await supabase
      .from('artist_onboarding')
      .upsert({ user_id: userId, current_step: 6, completed_at: now, updated_at: now });
    setState((prev) => ({ ...prev, completed: true, step: 6 }));
  }, [state.step, userId]);

  const requirementsSatisfied = useMemo(() => {
    return state.requirementsMet.basics && state.requirementsMet.style && state.requirementsMet.artworks;
  }, [state.requirementsMet]);

  return {
    state,
    error,
    refresh,
    updateProfile,
    updateStep,
    updateArtworkCount,
    logEvent,
    complete,
    requirementsSatisfied,
  };
}
