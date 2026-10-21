/**
 * usePublicStore - Type-safe hook for public store data
 * Uses TanStack Query v5 with Zod validation
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { queryKeys } from '../lib/queryClient';
import type { Store, Product, Category, PaymentMethod } from '../schemas';

/**
 * Hook to fetch public store data by slug
 */
export function usePublicStore(slug: string | undefined) {
  return useQuery<Store, Error>({
    queryKey: queryKeys.store.bySlug(slug ?? ''),
    queryFn: () => {
      if (!slug) throw new Error('Store slug is required');
      return api.public.getStore(slug);
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch public store products
 */
export function usePublicProducts(slug: string | undefined) {
  return useQuery<Product[], Error>({
    queryKey: queryKeys.store.products(slug ?? ''),
    queryFn: () => {
      if (!slug) throw new Error('Store slug is required');
      return api.public.getProducts(slug);
    },
    enabled: Boolean(slug),
    staleTime: 2 * 60 * 1000,
    retry: 1,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch public store categories
 */
export function usePublicCategories(slug: string | undefined) {
  return useQuery<Category[], Error>({
    queryKey: queryKeys.store.categories(slug ?? ''),
    queryFn: () => {
      if (!slug) throw new Error('Store slug is required');
      return api.public.getCategories(slug);
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook to fetch public store payment methods
 */
export function usePublicPaymentMethods(slug: string | undefined) {
  return useQuery<PaymentMethod[], Error>({
    queryKey: queryKeys.store.paymentMethods(slug ?? ''),
    queryFn: () => {
      if (!slug) throw new Error('Store slug is required');
      return api.publicPayments.getByStore(slug);
    },
    enabled: Boolean(slug),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Combined hook for all public store data
 */
export function usePublicStoreData(slug: string | undefined) {
  const storeQuery = usePublicStore(slug);
  const productsQuery = usePublicProducts(slug);
  const categoriesQuery = usePublicCategories(slug);

  const isLoading = storeQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading;
  const isError = storeQuery.isError || productsQuery.isError || categoriesQuery.isError;
  const error = storeQuery.error ?? productsQuery.error ?? categoriesQuery.error;

  return {
    store: storeQuery.data,
    products: productsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading,
    isError,
    error,
    refetch: () => {
      void storeQuery.refetch();
      void productsQuery.refetch();
      void categoriesQuery.refetch();
    },
  };
}
