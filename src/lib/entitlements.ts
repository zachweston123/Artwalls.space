export type PlanId = 'free' | 'starter' | 'growth' | 'pro';

export interface Entitlements {
  artworksLimit: number; // Max active/published listings (excluding sold)
  activeDisplays: number | 'unlimited';
  curatedSets: number; // Max curated sets per tier
  applicationsPerMonth: number; // Monthly venue application + waitlist quota (Infinity = unlimited)
}

export const TIER_LIMITS: Record<PlanId, { artworks: number; activeDisplays: number | 'unlimited'; curatedSets: number; applicationsPerMonth: number }> = {
  free: { artworks: 1, activeDisplays: 1, curatedSets: 0, applicationsPerMonth: 2 },
  starter: { artworks: 10, activeDisplays: 4, curatedSets: 1, applicationsPerMonth: 5 },
  growth: { artworks: 30, activeDisplays: 10, curatedSets: 3, applicationsPerMonth: Number.POSITIVE_INFINITY },
  pro: { artworks: Number.POSITIVE_INFINITY, activeDisplays: 'unlimited', curatedSets: 6, applicationsPerMonth: Number.POSITIVE_INFINITY },
};

export function entitlementsFor(plan: PlanId, isActive: boolean): Entitlements {
  const effectivePlan: PlanId = isActive ? plan : 'free';
  const limits = TIER_LIMITS[effectivePlan] || TIER_LIMITS.free;
  return {
    artworksLimit: limits.artworks,
    activeDisplays: limits.activeDisplays,
    curatedSets: limits.curatedSets,
    applicationsPerMonth: limits.applicationsPerMonth,
  };
}

export function getArtworkLimit(plan: PlanId, isActive: boolean): number {
  return entitlementsFor(plan, isActive).artworksLimit;
}

export function getCuratedSetLimit(plan: PlanId, isActive: boolean): number {
  return entitlementsFor(plan, isActive).curatedSets;
}
