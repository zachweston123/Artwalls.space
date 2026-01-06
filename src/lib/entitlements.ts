export type PlanId = 'free' | 'starter' | 'growth' | 'pro';

export interface Entitlements {
  artworksLimit: number; // Max active/published listings (excluding sold)
  activeDisplays: number | 'unlimited';
}

export function entitlementsFor(plan: PlanId, isActive: boolean): Entitlements {
  const effectivePlan: PlanId = isActive ? plan : 'free';
  switch (effectivePlan) {
    case 'free':
      return { artworksLimit: 1, activeDisplays: 1 };
    case 'starter':
      return { artworksLimit: 10, activeDisplays: 4 };
    case 'growth':
      return { artworksLimit: 30, activeDisplays: 10 };
    case 'pro':
      return { artworksLimit: Number.POSITIVE_INFINITY, activeDisplays: 'unlimited' };
    default:
      return { artworksLimit: 1, activeDisplays: 1 };
  }
}
