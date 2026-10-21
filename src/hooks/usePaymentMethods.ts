/**
 * usePaymentMethods - Type-safe hooks for payment methods management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type {
  PaymentMethod,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  PaymentReceipt,
  SubmitReceiptInput,
} from '../schemas';

/**
 * Hook to fetch all payment methods (admin)
 */
export function usePaymentMethods() {
  return useQuery<PaymentMethod[], Error>({
    queryKey: queryKeys.payments.list(),
    queryFn: () => api.payments.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch payment receipts (admin)
 */
export function usePaymentReceipts() {
  return useQuery<PaymentReceipt[], Error>({
    queryKey: queryKeys.payments.receipts(),
    queryFn: () => api.payments.getReceipts(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to create a payment method
 */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePaymentMethodInput) => api.payments.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

/**
 * Hook to update a payment method
 */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentMethodInput }) =>
      api.payments.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

/**
 * Hook to toggle payment method status
 */
export function useTogglePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.payments.toggle(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

/**
 * Hook to delete a payment method
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.payments.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

/**
 * Hook to reorder payment methods
 */
export function useReorderPaymentMethods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: string[]) => api.payments.reorder(orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });
}

/**
 * Hook to update receipt status
 */
export function useUpdateReceiptStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      adminNotes?: string;
    }) => api.payments.updateReceiptStatus(id, status, adminNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.receipts() });
    },
  });
}

/**
 * Hook for all payment method mutations
 */
export function usePaymentMethodMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: CreatePaymentMethodInput) => api.payments.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentMethodInput }) =>
      api.payments.update(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  const toggle = useMutation({
    mutationFn: (id: string) => api.payments.toggle(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.payments.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => api.payments.reorder(orderedIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
  });

  return {
    create,
    update,
    toggle,
    delete: remove,
    reorder,
    isLoading:
      create.isPending ||
      update.isPending ||
      toggle.isPending ||
      remove.isPending ||
      reorder.isPending,
  };
}

// ===== Public Payment Hooks =====

/**
 * Hook to submit a payment receipt (public)
 */
export function useSubmitReceipt(slug: string | undefined) {
  return useMutation({
    mutationFn: (data: SubmitReceiptInput) => {
      if (!slug) throw new Error('Store slug is required');
      return api.publicPayments.submitReceipt(slug, data);
    },
  });
}
