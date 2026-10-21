/**
 * useStores - Type-safe hooks for store management
 * Uses TanStack Query v5 with Zod validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type {
  Store,
  CreateStoreInput,
  UpdateStoreInput,
  Theme,
  Announcement,
  Location,
  SocialLinks,
} from '../schemas';

/**
 * Hook to fetch all stores (admin)
 */
export function useStores() {
  return useQuery<Store[], Error>({
    queryKey: queryKeys.store.all,
    queryFn: () => api.stores.get(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single store by ID
 */
export function useStore(id: string | undefined) {
  return useQuery<Store, Error>({
    queryKey: ['store', 'byId', id],
    queryFn: () => {
      if (!id) throw new Error('Store ID is required');
      return api.stores.getById(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Hook to create a store
 */
export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoreInput) => api.stores.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
    },
  });
}

/**
 * Hook to update a store
 */
export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStoreInput }) =>
      api.stores.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });
}

/**
 * Hook to update store theme
 */
export function useUpdateStoreTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, theme }: { id: string; theme: Theme }) =>
      api.stores.updateTheme(id, theme),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });
}

/**
 * Hook to update store announcement
 */
export function useUpdateStoreAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, announcement }: { id: string; announcement: Announcement }) =>
      api.stores.updateAnnouncement(id, announcement),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });
}

/**
 * Hook to update store location
 */
export function useUpdateStoreLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, location }: { id: string; location: Location }) =>
      api.stores.updateLocation(id, location),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });
}

/**
 * Hook to update store social links
 */
export function useUpdateStoreSocialLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, socialLinks }: { id: string; socialLinks: SocialLinks }) =>
      api.stores.updateSocialLinks(id, socialLinks),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });
}

/**
 * Hook to delete a store
 */
export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.stores.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
    },
  });
}

/**
 * Hook for all store mutations
 */
export function useStoreMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: CreateStoreInput) => api.stores.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStoreInput }) =>
      api.stores.update(id, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });

  const updateTheme = useMutation({
    mutationFn: ({ id, theme }: { id: string; theme: Theme }) =>
      api.stores.updateTheme(id, theme),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });

  const updateAnnouncement = useMutation({
    mutationFn: ({ id, announcement }: { id: string; announcement: Announcement }) =>
      api.stores.updateAnnouncement(id, announcement),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });

  const updateLocation = useMutation({
    mutationFn: ({ id, location }: { id: string; location: Location }) =>
      api.stores.updateLocation(id, location),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });

  const updateSocialLinks = useMutation({
    mutationFn: ({ id, socialLinks }: { id: string; socialLinks: SocialLinks }) =>
      api.stores.updateSocialLinks(id, socialLinks),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
      void queryClient.invalidateQueries({ queryKey: ['store', 'byId', variables.id] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.stores.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.store.all });
    },
  });

  return {
    create,
    update,
    updateTheme,
    updateAnnouncement,
    updateLocation,
    updateSocialLinks,
    delete: remove,
    isLoading:
      create.isPending ||
      update.isPending ||
      updateTheme.isPending ||
      updateAnnouncement.isPending ||
      updateLocation.isPending ||
      updateSocialLinks.isPending ||
      remove.isPending,
  };
}
