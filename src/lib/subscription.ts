export type ArtistTier = 'free' | 'starter' | 'growth' | 'pro';

interface SubscriptionInput {
  subscription_tier?: string | null;
  subscription_status?: string | null;
  pro_until?: string | null;
}

export function resolveArtistSubscription(input: SubscriptionInput) {
  const proUntil = input?.pro_until ? new Date(input.pro_until).getTime() : 0;
  const hasProOverride = !!proUntil && proUntil > Date.now();
  const tier = (hasProOverride ? 'pro' : (input?.subscription_tier || 'free')).toLowerCase() as ArtistTier;
  const status = (hasProOverride ? 'active' : (input?.subscription_status || 'inactive')).toLowerCase();
  const isActive = status === 'active';
  return { tier, status, isActive, hasProOverride };
}
