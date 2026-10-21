/**
 * useAdminProfile - Type-safe hooks for admin profile management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type {
  AdminProfile,
  CreateAdminInput,
  UpdateAdminInput,
  AdminStats,
  GlobalStats,
  Subscriber,
} from '../schemas';

/**
 * Hook to fetch admin profile
 */
export function useAdminProfile(enabled = true) {
  return useQuery<AdminProfile, Error>({
    queryKey: queryKeys.admin.profile(),
    queryFn: () => api.admin.getProfile(),
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 15 * 1000, // Poll every 15 seconds
  });
}

/**
 * Hook to fetch admin stats
 */
export function useAdminStats(enabled = true) {
  return useQuery<AdminStats, Error>({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => api.admin.getStats(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create admin profile
 */
export function useCreateAdminProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAdminInput) => api.admin.createProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
    },
  });
}

/**
 * Hook to update admin profile
 */
export function useUpdateAdminProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAdminInput) => api.admin.updateProfile(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });
}

/**
 * Hook to update last login
 */
export function useUpdateLastLogin() {
  return useMutation({
    mutationFn: () => api.admin.updateLastLogin(),
  });
}

// ===== Super Admin Hooks =====

/**
 * Hook to fetch all subscribers (super admin)
 */
export function useSubscribers(enabled = true) {
  return useQuery<Subscriber[], Error>({
    queryKey: queryKeys.admin.subscribers(),
    queryFn: () => api.admin.getSubscribers(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch global stats (super admin)
 */
export function useGlobalStats(enabled = true) {
  return useQuery<GlobalStats, Error>({
    queryKey: queryKeys.admin.globalStats(),
    queryFn: () => api.admin.getGlobalStats(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook for subscriber management mutations (super admin)
 */
export function useSubscriberMutations() {
  const queryClient = useQueryClient();

  const updateStoreStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.updateStoreStatus(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscribers() });
    },
  });

  const updateDashboardStatus = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.admin.updateDashboardStatus(id, isActive),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscribers() });
    },
  });

  const updateHideUpgradeUI = useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      api.admin.updateHideUpgradeUI(id, hide),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscribers() });
    },
  });

  const deleteSubscriber = useMutation({
    mutationFn: (id: string) => api.admin.deleteSubscriber(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.subscribers() });
    },
  });

  return {
    updateStoreStatus,
    updateDashboardStatus,
    updateHideUpgradeUI,
    deleteSubscriber,
    isLoading:
      updateStoreStatus.isPending ||
      updateDashboardStatus.isPending ||
      updateHideUpgradeUI.isPending ||
      deleteSubscriber.isPending,
  };
}
