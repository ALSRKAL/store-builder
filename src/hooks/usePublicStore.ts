/** Public storefront queries share authoritative, abortable resource reads. */
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { queryKeys } from '../lib/queryClient';
import { storeSchema, productSchema, categorySchema, paymentMethodListSchema,
  type Store, type Product, type Category, type PaymentMethod } from '../schemas';
import { readPublicResource } from './realtime/publicResource';

const publicQueryOptions = {
  // Revisions drive updates while visible; mount/refocus is recovery, never a timer.
  staleTime: Infinity,
  refetchOnMount: 'always' as const,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: 1,
};

export function usePublicStore(slug: string | undefined) {
  return useQuery<Store, Error>({
    ...publicQueryOptions,
    queryKey: queryKeys.store.bySlug(slug ?? ''),
    queryFn: ({ signal }) => readPublicResource(slug!, 'store', storeSchema, signal),
    enabled: Boolean(slug),
  });
}

export function usePublicProducts(slug: string | undefined) {
  return useQuery<Product[], Error>({
    ...publicQueryOptions,
    queryKey: queryKeys.store.products(slug ?? ''),
    queryFn: ({ signal }) => readPublicResource(slug!, 'products', z.array(productSchema), signal),
    enabled: Boolean(slug),
  });
}

export function usePublicCategories(slug: string | undefined) {
  return useQuery<Category[], Error>({
    ...publicQueryOptions,
    queryKey: queryKeys.store.categories(slug ?? ''),
    queryFn: ({ signal }) => readPublicResource(slug!, 'categories', z.array(categorySchema), signal),
    enabled: Boolean(slug),
  });
}

export function usePublicPaymentMethods(slug: string | undefined, enabled = true) {
  return useQuery<PaymentMethod[], Error>({
    ...publicQueryOptions,
    queryKey: queryKeys.store.paymentMethods(slug ?? ''),
    queryFn: ({ signal }) => readPublicResource(slug!, 'payments', paymentMethodListSchema, signal),
    enabled: Boolean(slug) && enabled,
  });
}

export function usePublicStoreData(slug: string | undefined) {
  const storeQuery = usePublicStore(slug);
  const productsQuery = usePublicProducts(slug);
  const categoriesQuery = usePublicCategories(slug);
  return {
    store: storeQuery.data,
    products: productsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    isLoading: storeQuery.isLoading || productsQuery.isLoading || categoriesQuery.isLoading,
    isError: storeQuery.isError || productsQuery.isError || categoriesQuery.isError,
    error: storeQuery.error ?? productsQuery.error ?? categoriesQuery.error,
    refetch: () => Promise.all([storeQuery.refetch(), productsQuery.refetch(), categoriesQuery.refetch()]),
  };
}
