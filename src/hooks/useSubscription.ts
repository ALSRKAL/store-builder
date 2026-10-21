/**
 * useSubscription - Type-safe hooks for subscription management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type {
  SubscriptionStatus,
  SubscriptionCode,
  GenerateCodeRequest,
} from '../schemas';

/**
 * Hook to fetch subscription status
 */
export function useSubscriptionStatus(enabled = true) {
  return useQuery<SubscriptionStatus, Error>({
    queryKey: queryKeys.subscription.status(),
    queryFn: () => api.subscriptions.getStatus(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Hook to fetch all subscription codes (super admin)
 */
export function useSubscriptionCodes(enabled = true) {
  return useQuery<SubscriptionCode[], Error>({
    queryKey: queryKeys.subscription.codes(),
    queryFn: () => api.subscriptions.getAllCodes(),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to verify a subscription code
 */
export function useVerifyCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => api.subscriptions.verify(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });
}

/**
 * Hook to start trial
 */
export function useStartTrial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.subscriptions.startTrial(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });
}

/**
 * Hook to renew subscription
 */
export function useRenewSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => api.subscriptions.renew(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });
}

/**
 * Hook to generate subscription codes (super admin)
 */
export function useGenerateCodes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateCodeRequest) => api.subscriptions.generateCode(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.codes() });
    },
  });
}

/**
 * Hook for all subscription mutations
 */
export function useSubscriptionMutations() {
  const queryClient = useQueryClient();

  const verify = useMutation({
    mutationFn: (code: string) => api.subscriptions.verify(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });

  const startTrial = useMutation({
    mutationFn: () => api.subscriptions.startTrial(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });

  const renew = useMutation({
    mutationFn: (code: string) => api.subscriptions.renew(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.profile() });
    },
  });

  const generateCodes = useMutation({
    mutationFn: (data: GenerateCodeRequest) => api.subscriptions.generateCode(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.subscription.codes() });
    },
  });

  return {
    verify,
    startTrial,
    renew,
    generateCodes,
    isLoading:
      verify.isPending ||
      startTrial.isPending ||
      renew.isPending ||
      generateCodes.isPending,
  };
}

/**
 * Helper hook to check if subscription is active
 */
export function useIsSubscriptionActive() {
  const { data: status, isLoading } = useSubscriptionStatus();

  return {
    isActive: status?.isActive ?? false,
    isTrial: status?.isTrial ?? false,
    daysRemaining: status?.daysRemaining ?? 0,
    isLoading,
  };
}
