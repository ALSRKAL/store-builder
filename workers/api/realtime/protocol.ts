export const PUBLIC_RESOURCES = ['store', 'products', 'categories', 'payments'] as const;
export type PublicResource = typeof PUBLIC_RESOURCES[number];

export interface StoreRevision {
  storeId: string;
  slug: string;
  revision: number;
  versions: Record<PublicResource, number>;
  deleted: boolean;
  isActive: boolean;
  isAnnualPlan: boolean;
  subscriptionEnd: string | null;
}

/** Compare resource counters, not arrival order; DO events may be duplicated. */
export function changedResources(previous: StoreRevision | null, next: StoreRevision): PublicResource[] {
  if (!previous || previous.storeId !== next.storeId) return [...PUBLIC_RESOURCES];
  const changes = PUBLIC_RESOURCES.filter(resource => next.versions[resource] > previous.versions[resource]);
  if (previous.slug !== next.slug || previous.deleted !== next.deleted || previous.isActive !== next.isActive ||
      previous.isAnnualPlan !== next.isAnnualPlan || previous.subscriptionEnd !== next.subscriptionEnd) {
    if (!changes.includes('store')) changes.push('store');
    if (!changes.includes('payments')) changes.push('payments');
  }
  return changes;
}
