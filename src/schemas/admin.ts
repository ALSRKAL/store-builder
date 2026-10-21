/**
 * Admin Schema - Zod validation for Admin profile data
 * Matches API response from workers/api/routes/admin.js
 */

import { z } from 'zod';

// Admin profile schema - matches formatAdmin() in admin.js
export const adminProfileSchema = z.object({
  id: z.string(),
  email: z.string(),
  storeName: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  whatsappApiKey: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  storeLogo: z.string().optional().nullable(), // Alias for logo
  subscriptionCode: z.string().optional().nullable(),
  subscriptionStart: z.string().optional().nullable(),
  subscriptionEnd: z.string().optional().nullable(),
  subscriptionMonths: z.number().optional().nullable(),
  planId: z.string().optional().nullable(),
  isTrial: z.boolean().optional(),
  trialUsed: z.boolean().optional(),
  dashboardIsActive: z.boolean().optional(),
  storeIsActive: z.boolean().optional(),
  hideUpgradeUI: z.boolean().optional(),
  codeHistory: z.array(z.unknown()).optional().nullable(),
  lastLogin: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  // Additional fields
  name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  storeSlug: z.string().optional().nullable(), // Alias for slug
});

// Admin creation schema
export const createAdminSchema = z.object({
  storeName: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
});

// Admin update schema
export const updateAdminSchema = z.object({
  storeName: z.string().optional(),
  whatsapp: z.string().optional(),
  logo: z.string().optional(),
  whatsappApiKey: z.string().optional(),
});

// Admin stats schema - matches getAdminStats() response
export const adminStatsSchema = z.object({
  products: z.number().optional(),
  categories: z.number().optional(),
  // Additional fields that might be added
  totalProducts: z.number().optional(),
  totalCategories: z.number().optional(),
  totalOrders: z.number().optional(),
  pendingOrders: z.number().optional(),
  totalRevenue: z.number().optional(),
  todayOrders: z.number().optional(),
  weekOrders: z.number().optional(),
  monthOrders: z.number().optional(),
});

// Global stats schema - matches getGlobalStats() response
export const globalStatsSchema = z.object({
  total: z.number().optional(),
  active: z.number().optional(),
  expired: z.number().optional(),
  totalProducts: z.number().optional(),
  totalStores: z.number().optional(),
  // Additional fields
  totalOrders: z.number().optional(),
  totalRevenue: z.number().optional(),
  activeStores: z.number().optional(),
});

// Subscriber schema - matches formatAdmin() for subscribers
export const subscriberSchema = z.object({
  id: z.string(),
  email: z.string(),
  storeName: z.string().optional().nullable(),
  storeId: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
  subscriptionEnd: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  storeIsActive: z.boolean().optional(),
  dashboardIsActive: z.boolean().optional(),
  hideUpgradeUI: z.boolean().optional(),
  createdAt: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
});

export const subscriberListSchema = z.array(subscriberSchema);

// Export types
export type AdminProfile = z.infer<typeof adminProfileSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;
export type AdminStats = z.infer<typeof adminStatsSchema>;
export type GlobalStats = z.infer<typeof globalStatsSchema>;
export type Subscriber = z.infer<typeof subscriberSchema>;
