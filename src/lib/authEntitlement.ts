import type { AdminProfile } from '../schemas';

export type EntitlementState =
  | 'eligible'
  | 'trial-active'
  | 'trial-expired'
  | 'trial-used'
  | 'paid-active'
  | 'paid-expired';

export interface Entitlement {
  state: EntitlementState;
  active: boolean;
  canStartTrial: boolean;
  isTrial: boolean;
}

/** One routing policy for login, verification, setup and dashboard guards. */
export function getEntitlement(profile: AdminProfile | null, timestamp = Date.now()): Entitlement {
  const end = profile?.subscriptionEnd ? Date.parse(profile.subscriptionEnd) : NaN;
  const active = Number.isFinite(end) && end > timestamp;
  // Paid evidence wins over legacy/default trial flags.
  const paid = !!profile && (
    (profile.subscriptionMonths ?? 0) > 0 ||
    !!profile.subscriptionCode ||
    (!!profile.planId && profile.planId !== 'trial') ||
    (profile.isTrial === false && !!profile.subscriptionEnd)
  );
  const trial = !paid && !!profile && (
    profile.isTrial === true || profile.planId === 'trial'
  );

  if (paid) {
    return { state: active ? 'paid-active' : 'paid-expired', active, canStartTrial: false, isTrial: false };
  }
  if (trial && profile?.subscriptionEnd) {
    return { state: active ? 'trial-active' : 'trial-expired', active, canStartTrial: false, isTrial: true };
  }
  if (profile?.trialUsed) {
    return { state: 'trial-used', active: false, canStartTrial: false, isTrial: false };
  }
  return { state: 'eligible', active: false, canStartTrial: true, isTrial: false };
}

export function getEntitlementRoute(profile: AdminProfile | null, timestamp = Date.now()): string {
  if (!getEntitlement(profile, timestamp).active) return '/admin/verify';
  if (profile?.dashboardIsActive === false) return '/admin/blocked';
  return profile?.storeName ? '/admin/dashboard' : '/admin/setup';
}
