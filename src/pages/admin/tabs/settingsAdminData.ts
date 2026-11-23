import type { AdminProfile } from '../../../schemas';

/** Shape consumed by the settings screen; keeps optional fields truly optional. */
export interface SettingsAdminData {
  uid: string;
  storeName: string;
  email?: string;
  whatsapp?: string;
  logo?: string;
  storeId?: string;
  slug?: string;
  subscriptionEnd?: string;
}

/**
 * Maps the authenticated profile to settings props without dropping the public
 * slug. The merchant needs the current domain here after a rename.
 */
export function buildSettingsAdminData(profile: AdminProfile, uid: string): SettingsAdminData {
  return {
    uid,
    storeName: profile.storeName ?? '',
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.whatsapp ? { whatsapp: profile.whatsapp } : {}),
    ...(profile.logo ?? profile.storeLogo
      ? { logo: profile.logo ?? profile.storeLogo ?? '' }
      : {}),
    ...(profile.storeId ? { storeId: profile.storeId } : {}),
    ...(profile.slug ? { slug: profile.slug } : {}),
    ...(profile.subscriptionEnd ? { subscriptionEnd: profile.subscriptionEnd } : {}),
  };
}
