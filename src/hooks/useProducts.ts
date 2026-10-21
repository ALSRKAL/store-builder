/**
 * useProducts - Type-safe hooks for product management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type PaginationParams } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type { Product, CreateProductInput, UpdateProductInput } from '../schemas';
import type { PaginatedResponse } from '../schemas/api/responses';

/**
 * Hook to fetch all products with pagination (admin)
 */
export function useProducts(params?: PaginationParams) {
  return useQuery<PaginatedResponse<Product>, Error>({
    queryKey: [...queryKeys.products.list(), params],
    queryFn: () => api.products.getAll(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch all products without pagination (legacy support)
 */
export function useProductsLegacy() {
  return useQuery<Product[], Error>({
    queryKey: queryKeys.products.list(),
    queryFn: () => api.products.getAllLegacy(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single product by ID
 */
export function useProduct(id: string | undefined) {
  return useQuery<Product, Error>({
    queryKey: queryKeys.products.byId(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Product ID is required');
      return api.products.getById(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook for product mutations (create, update, delete)
 */
export function useProductMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateProductInput) => api.products.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      api.products.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.byId(variables.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
    isLoading:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

/**
 * Hook to create a product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => api.products.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      api.products.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.byId(variables.id) });
    },
  });
}

/**
 * Hook to delete a product
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.products.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
