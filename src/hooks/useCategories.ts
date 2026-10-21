/**
 * useCategories - Type-safe hooks for category management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../schemas';

/**
 * Hook to fetch all categories (admin)
 */
export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: queryKeys.categories.list(),
    queryFn: () => api.categories.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single category by ID
 */
export function useCategory(id: string | undefined) {
  return useQuery<Category, Error>({
    queryKey: queryKeys.categories.byId(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Category ID is required');
      return api.categories.getById(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook for category mutations (create, update, delete)
 */
export function useCategoryMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryInput) => api.categories.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      api.categories.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.byId(variables.id) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
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
 * Hook to create a category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryInput) => api.categories.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}

/**
 * Hook to update a category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      api.categories.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.byId(variables.id) });
    },
  });
}

/**
 * Hook to delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.categories.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
    },
  });
}
