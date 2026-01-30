export type PlanId = 'free' | 'starter' | 'growth' | 'pro';

export interface Entitlements {
  artworksLimit: number; // Max active/published listings (excluding sold)
  activeDisplays: number | 'unlimited';
}

export const TIER_LIMITS: Record<PlanId, { artworks: number; activeDisplays: number | 'unlimited' }> = {
  free: { artworks: 1, activeDisplays: 1 },
  starter: { artworks: 10, activeDisplays: 4 },
  growth: { artworks: 30, activeDisplays: 10 },
  pro: { artworks: Number.POSITIVE_INFINITY, activeDisplays: 'unlimited' },
};

export function entitlementsFor(plan: PlanId, isActive: boolean): Entitlements {
  const effectivePlan: PlanId = isActive ? plan : 'free';
  const limits = TIER_LIMITS[effectivePlan] || TIER_LIMITS.free;
  return {
    artworksLimit: limits.artworks,
    activeDisplays: limits.activeDisplays,
  };
}

export function getArtworkLimit(plan: PlanId, isActive: boolean): number {
  return entitlementsFor(plan, isActive).artworksLimit;
}
