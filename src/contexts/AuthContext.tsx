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
  type ReactNode,
} from 'react';
import { auth, googleProvider } from '../config/firebase';
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

// Auth context value interface
interface AuthContextValue {
  user: FirebaseUser | null;
  adminData: AdminProfile | null;
  loading: boolean;
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

// Polling interval for admin data updates (15 seconds)
const POLLING_INTERVAL = 15000;

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

  // Fetch admin data from Cloudflare API
  const fetchAdminData = useCallback(async (): Promise<AdminProfile | null> => {
    if (!user) return null;

    try {
      const data = await api.admin.getProfile();
      setAdminData(data);
      return data;
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setAdminData(null);
      return null;
    }
  }, [user]);

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Fetch admin data
        void (async () => {
          try {
            const data = await api.admin.getProfile();
            setAdminData(data);
          } catch {
            // Admin profile not found - user needs to complete setup
            setAdminData(null);
          }
          setLoading(false);
        })();

        // Set up polling for real-time updates
        pollInterval = setInterval(() => {
          void (async () => {
            try {
              const data = await api.admin.getProfile();
              setAdminData(data);
            } catch {
              // Silently fail on polling errors
            }
          })();
        }, POLLING_INTERVAL);
      } else {
        setUser(null);
        setAdminData(null);
        setLoading(false);

        if (pollInterval) {
          clearInterval(pollInterval);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, []);

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
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  const resetPassword = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateAdminData = async (data: UpdateAdminInput): Promise<void> => {
    if (user) {
      await api.admin.updateProfile(data);
      setAdminData((prev) => {
        if (!prev) return null;
        // Merge only defined properties
        const updated: AdminProfile = { ...prev };
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) {
            (updated as Record<string, unknown>)[key] = value;
          }
        }
        return updated;
      });
    }
  };

  const createAdminProfile = async (data: Partial<AdminProfile>): Promise<void> => {
    if (user) {
      const fullData: AdminProfile = {
        id: data.id ?? '',
        email: user.email ?? '',
        storeIsActive: true,
        dashboardIsActive: true,
        hideUpgradeUI: data.hideUpgradeUI ?? false,
        trialUsed: data.trialUsed ?? false,
        ...data,
      };

      await api.admin.createProfile({
        storeName: fullData.storeName ?? undefined,
        storeId: fullData.storeId ?? undefined,
        slug: fullData.slug ?? undefined,
        whatsapp: fullData.whatsapp ?? undefined,
        logo: fullData.logo ?? undefined,
      });
      setAdminData(fullData);
    }
  };

  // Check dashboard and store status
  const isDashboardActive = adminData?.dashboardIsActive !== false;
  const isStoreActive = adminData?.storeIsActive !== false;
  const hideUpgradeUI = adminData?.hideUpgradeUI === true;

  // Get current plan
  const getCurrentPlan = (): Plan => {
    if (!adminData?.subscriptionEnd) {
      return getPlanByMonths(0); // Trial
    }
    const endDate = new Date(adminData.subscriptionEnd);
    if (endDate < new Date()) {
      return getPlanByMonths(0); // Expired = trial
    }

    // Check planId first
    if (adminData.planId) {
      const months = PLAN_MONTHS_MAP[adminData.planId];
      if (months !== undefined) {
        return getPlanByMonths(months);
      }
    }

    return getPlanByMonths(adminData.subscriptionMonths ?? 0);
  };

  const currentPlan = getCurrentPlan();
  const isTrial = currentPlan.id === 'trial';

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
    if (user && !adminData?.subscriptionEnd) {
      try {
        await api.subscriptions.startTrial();
        await fetchAdminData();
      } catch (error) {
        console.error('Error starting trial:', error);
      }
    }
  };

  // Refresh admin data manually
  const refreshAdminData = useCallback((): Promise<AdminProfile | null> => {
    return fetchAdminData();
  }, [fetchAdminData]);

  const value: AuthContextValue = {
    user,
    adminData,
    loading,
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
