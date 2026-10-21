/**
 * useOrders - Type-safe hooks for order management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type PaginationParams } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type {
  Order,
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderStats,
} from '../schemas';
import type { PaginatedResponse } from '../schemas/api/responses';

/**
 * Hook to fetch all orders with pagination (admin)
 */
export function useOrders(params?: PaginationParams) {
  return useQuery<PaginatedResponse<Order>, Error>({
    queryKey: [...queryKeys.orders.list(), params],
    queryFn: () => api.orders.getAll(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Hook to fetch all orders without pagination (legacy support)
 */
export function useOrdersLegacy() {
  return useQuery<Order[], Error>({
    queryKey: queryKeys.orders.list(),
    queryFn: () => api.orders.getAllLegacy(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook to fetch a single order by ID
 */
export function useOrder(id: string | undefined) {
  return useQuery<Order, Error>({
    queryKey: queryKeys.orders.byId(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Order ID is required');
      return api.orders.getById(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to fetch order stats
 */
export function useOrderStats() {
  return useQuery<OrderStats, Error>({
    queryKey: queryKeys.orders.stats(),
    queryFn: () => api.orders.getStats(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to create a public order
 */
export function useCreatePublicOrder(slug: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrderInput) => {
      if (!slug) throw new Error('Store slug is required');
      return api.publicOrders.create(slug, data);
    },
    onSuccess: () => {
      // Invalidate orders if admin is viewing
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

/**
 * Hook to update order status
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderStatusInput }) =>
      api.orders.updateStatus(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.byId(variables.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });
}

/**
 * Hook to delete an order
 */
export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.orders.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });
}

/**
 * Hook for all order mutations
 */
export function useOrderMutations() {
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrderStatusInput }) =>
      api.orders.updateStatus(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.byId(variables.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: (id: string) => api.orders.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.stats() });
    },
  });

  return {
    updateStatus,
    delete: deleteOrder,
    isLoading: updateStatus.isPending || deleteOrder.isPending,
  };
}
