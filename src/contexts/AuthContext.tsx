/**
 * AuthContext - Cloudflare D1 Version
 * Uses Firebase Auth + Cloudflare D1 for data storage
 * Type-safe implementation with strict types
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { auth, googleProvider, googlePopupResolver } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from 'firebase/auth';
import { api } from '../services/api';
import {
  getPlanByMonths,
  checkLimits,
  type Plan,
  type CurrentCounts,
  type PlanLimits,
} from '../config/plans';
import type { AdminProfile, UpdateAdminInput } from '../schemas';
import { getEntitlement, type Entitlement } from '../lib/authEntitlement';

// Auth context value interface
interface AuthContextValue {
  user: FirebaseUser | null;
  adminData: AdminProfile | null;
  loading: boolean;
  profileError: string | null;
  entitlement: Entitlement;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  register: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<FirebaseUser>;
  resetPassword: (email: string) => Promise<void>;
  updateAdminData: (data: UpdateAdminInput) => Promise<void>;
  createAdminProfile: (data: Partial<AdminProfile>) => Promise<void>;
  setAdminData: React.Dispatch<React.SetStateAction<AdminProfile | null>>;
  isDashboardActive: boolean;
  isStoreActive: boolean;
  hideUpgradeUI: boolean;
  currentPlan: Plan;
  isTrial: boolean;
  getLimits: (currentCounts: CurrentCounts) => PlanLimits;
  trackUsage: (action: string, details?: Record<string, unknown>) => Promise<void>;
  initTrialAccount: () => Promise<void>;
  refreshAdminData: () => Promise<AdminProfile | null>;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Custom hook with type safety
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Props interface
interface AuthProviderProps {
  children: ReactNode;
}

// Plan ID to months mapping
const PLAN_MONTHS_MAP: Record<string, number> = {
  trial: 0,
  monthly: 1,
  semiAnnual: 6,
  annual: 12,
};

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [adminData, setAdminData] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const identity = useRef<FirebaseUser | null>(null);
  const mounted = useRef(false);
  const generation = useRef(0);
  const inFlight = useRef<{ generation: number; promise: Promise<AdminProfile | null> } | null>(null);

  // A failed request is not a missing profile. Only a successful null response
  // clears it. Generations also invalidate requests on logout/account changes.
  const fetchAdminData = useCallback((): Promise<AdminProfile | null> => {
    const owner = identity.current;
    const requestGeneration = generation.current;
    if (!owner) return Promise.resolve(null);
    if (inFlight.current?.generation === requestGeneration) return inFlight.current.promise;

    const promise = (async () => {
      try {
        const data = await api.admin.getProfile();
        if (!mounted.current || generation.current !== requestGeneration) return null;
        setAdminData(data);
        setProfileError(null);
        return data;
      } catch (error) {
        if (mounted.current && generation.current === requestGeneration) {
          setProfileError('تعذّر تحميل بيانات الحساب. تحقّق من الاتصال وأعد المحاولة.');
        }
        throw error;
      } finally {
        if (mounted.current && generation.current === requestGeneration) setLoading(false);
        if (inFlight.current?.generation === requestGeneration) inFlight.current = null;
      }
    })();
    inFlight.current = { generation: requestGeneration, promise };
    return promise;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const refresh = (): void => {
      if (identity.current && document.visibilityState === 'visible') {
        void fetchAdminData().catch(() => { /* Keep the last authoritative profile. */ });
      }
    };
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      const changed = identity.current?.uid !== firebaseUser?.uid;
      if (changed) {
        generation.current += 1;
        inFlight.current = null;
        setAdminData(null);
        setProfileError(null);
      }
      identity.current = firebaseUser;
      setUser(firebaseUser);
      if (firebaseUser) {
        if (changed) setLoading(true);
        void fetchAdminData().catch(() => { /* Render a retry state, never start a trial. */ });
      } else {
        setLoading(false);
      }
    });
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      mounted.current = false;
      generation.current += 1;
      inFlight.current = null;
      unsubscribeAuth();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [fetchAdminData]);

  const login = async (email: string, password: string): Promise<FirebaseUser> => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const register = async (email: string, password: string): Promise<FirebaseUser> => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const logout = async (): Promise<void> => {
    await signOut(auth);
  };

  const loginWithGoogle = async (): Promise<FirebaseUser> => {
    const result = await signInWithPopup(auth, googleProvider, googlePopupResolver);
    return result.user;
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const adoptProfile = (profile: AdminProfile, owner: FirebaseUser): void => {
    if (!mounted.current || identity.current !== owner) return;
    generation.current += 1;
    inFlight.current = null;
    setAdminData(profile);
    setProfileError(null);
    setLoading(false);
  };

  const updateAdminData = async (data: UpdateAdminInput): Promise<void> => {
    const owner = identity.current;
    if (!owner) throw new Error('User not authenticated');
    const profile = await api.admin.updateProfile(data);
    adoptProfile(profile, owner);
  };

  const createAdminProfile = async (data: Partial<AdminProfile>): Promise<void> => {
    const owner = identity.current;
    if (!owner) throw new Error('User not authenticated');
    const profile = await api.admin.createProfile({
      storeName: data.storeName ?? undefined,
      storeId: data.storeId ?? undefined,
      slug: data.slug ?? undefined,
      whatsapp: data.whatsapp ?? undefined,
      logo: data.logo ?? undefined,
    });
    // Never replace the entitlement with locally fabricated setup fields.
    adoptProfile(profile, owner);
  };

  const entitlement = getEntitlement(adminData);

  // Check dashboard and store status
  const isDashboardActive = adminData?.dashboardIsActive !== false;
  const isStoreActive = adminData?.storeIsActive !== false;
  const hideUpgradeUI = adminData?.hideUpgradeUI === true;

  // Get current plan
  const getCurrentPlan = (): Plan => {
    if (!entitlement.active) return getPlanByMonths(0);

    // Check planId first
    if (entitlement.state === 'trial-active') return getPlanByMonths(0);
    if (adminData?.planId && adminData.planId !== 'trial') {
      const months = PLAN_MONTHS_MAP[adminData.planId];
      if (months !== undefined) {
        return getPlanByMonths(months);
      }
    }

    return getPlanByMonths(adminData?.subscriptionMonths ?? 0);
  };

  const currentPlan = getCurrentPlan();
  const isTrial = entitlement.state === 'trial-active';

  // Check limits
  const getLimits = (currentCounts: CurrentCounts): PlanLimits => {
    return checkLimits(currentPlan, currentCounts);
  };

  // Track usage
  const trackUsage = async (
    _action: string,
    _details: Record<string, unknown> = {}
  ): Promise<void> => {
    // Usage tracking can be implemented via API if needed
    // Currently a no-op placeholder
  };

  // Initialize trial account
  const initTrialAccount = async (): Promise<void> => {
    const owner = identity.current;
    if (!owner || profileError || !entitlement.canStartTrial) {
      throw new Error('Trial is not available');
    }
    await api.subscriptions.startTrial();
    if (identity.current === owner) {
      generation.current += 1;
      inFlight.current = null;
      await fetchAdminData();
    }
  };

  // Refresh admin data manually
  const refreshAdminData = useCallback((): Promise<AdminProfile | null> => {
    // Explicit refresh follows mutations (activation/setup); a GET started
    // before that mutation is not authoritative for the new entitlement.
    generation.current += 1;
    inFlight.current = null;
    return fetchAdminData();
  }, [fetchAdminData]);

  const value: AuthContextValue = {
    user,
    adminData,
    loading,
    profileError,
    entitlement,
    login,
    register,
    logout,
    loginWithGoogle,
    resetPassword,
    updateAdminData,
    createAdminProfile,
    setAdminData,
    isDashboardActive,
    isStoreActive,
    hideUpgradeUI,
    currentPlan,
    isTrial,
    getLimits,
    trackUsage,
    initTrialAccount,
    refreshAdminData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
