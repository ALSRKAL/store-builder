/**
 * TanStack Query Client Configuration
 * Centralized query client setup with default options
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DefaultOptions } from '@tanstack/react-query';

// Default query options
const defaultOptions: DefaultOptions = {
  queries: {
    // Stale time: 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache time: 30 minutes
    gcTime: 30 * 60 * 1000,
    // Retry failed requests 3 times
    retry: 3,
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch on window focus
    refetchOnWindowFocus: true,
    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
    // Refetch on reconnect
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry mutations once
    retry: 1,
    // Retry delay
    retryDelay: 1000,
  },
};

// Create query client instance
export const queryClient = new QueryClient({
  defaultOptions,
});

// Query keys factory for type-safe query keys
export const queryKeys = {
  // Store queries
  store: {
    all: ['store'] as const,
    bySlug: (slug: string) => ['store', slug] as const,
    products: (slug: string) => ['store', slug, 'products'] as const,
    categories: (slug: string) => ['store', slug, 'categories'] as const,
    paymentMethods: (slug: string) => ['store', slug, 'payment-methods'] as const,
  },
  
  // Admin queries
  admin: {
    all: ['admin'] as const,
    profile: () => ['admin', 'profile'] as const,
    stats: () => ['admin', 'stats'] as const,
    subscribers: () => ['admin', 'subscribers'] as const,
    globalStats: () => ['admin', 'global-stats'] as const,
  },
  
  // Products queries
  products: {
    all: ['products'] as const,
    list: () => ['products', 'list'] as const,
    byId: (id: string) => ['products', id] as const,
  },
  
  // Categories queries
  categories: {
    all: ['categories'] as const,
    list: () => ['categories', 'list'] as const,
    byId: (id: string) => ['categories', id] as const,
  },
  
  // Orders queries
  orders: {
    all: ['orders'] as const,
    list: () => ['orders', 'list'] as const,
    byId: (id: string) => ['orders', id] as const,
    stats: () => ['orders', 'stats'] as const,
  },
  
  // Payment methods queries
  payments: {
    all: ['payments'] as const,
    list: () => ['payments', 'list'] as const,
    byId: (id: string) => ['payments', id] as const,
    receipts: () => ['payments', 'receipts'] as const,
  },
  
  // Subscription queries
  subscription: {
    all: ['subscription'] as const,
    status: () => ['subscription', 'status'] as const,
    codes: () => ['subscription', 'codes'] as const,
  },
} as const;

// Re-export QueryClientProvider for convenience
export { QueryClientProvider };
