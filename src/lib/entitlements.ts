export type PlanId = 'free' | 'starter' | 'growth' | 'pro';

export interface Entitlements {
  artworksLimit: number; // Max active/published listings (excluding sold)
  activeDisplays: number | 'unlimited';
  curatedSets: number; // Max curated sets per tier
}

export const TIER_LIMITS: Record<PlanId, { artworks: number; activeDisplays: number | 'unlimited'; curatedSets: number }> = {
  free: { artworks: 1, activeDisplays: 1, curatedSets: 0 },
  starter: { artworks: 10, activeDisplays: 4, curatedSets: 1 },
  growth: { artworks: 30, activeDisplays: 10, curatedSets: 3 },
  pro: { artworks: Number.POSITIVE_INFINITY, activeDisplays: 'unlimited', curatedSets: 6 },
};

export function entitlementsFor(plan: PlanId, isActive: boolean): Entitlements {
  const effectivePlan: PlanId = isActive ? plan : 'free';
  const limits = TIER_LIMITS[effectivePlan] || TIER_LIMITS.free;
  return {
    artworksLimit: limits.artworks,
    activeDisplays: limits.activeDisplays,
    curatedSets: limits.curatedSets,
  };
}

export function getArtworkLimit(plan: PlanId, isActive: boolean): number {
  return entitlementsFor(plan, isActive).artworksLimit;
}

export function getCuratedSetLimit(plan: PlanId, isActive: boolean): number {
  return entitlementsFor(plan, isActive).curatedSets;
}
