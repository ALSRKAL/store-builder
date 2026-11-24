/**
 * Store Schema - Zod validation for Store data
 * Matches API response from workers/api/routes/stores.js
 */

import { z } from 'zod';

// Theme schema - matches ThemeInput in themeUtils.ts
export const themeSchema = z.object({
  // Primary theme colors
  primary: z.string().optional(),
  secondary: z.string().optional(),
  accent: z.string().optional(),
  // Header
  headerBg: z.string().optional(),
  headerText: z.string().optional(),
  // Body
  bodyBg: z.string().optional(),
  // Card
  cardBg: z.string().optional(),
  // Footer
  footerBg: z.string().optional(),
  footerText: z.string().optional(),
  // Border radius
  buttonRadius: z.string().optional(),
  cardRadius: z.string().optional(),
  // Display mode
  displayMode: z.enum(['grid', 'story']).optional(),
  // Legacy fields (for backward compatibility)
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  fontFamily: z.string().optional(),
  borderRadius: z.string().optional(),
  // Theme name
  name: z.string().optional(),
  minPlan: z.string().optional(),
}).passthrough(); // Allow additional fields

// Social links schema
// يقبل الشكل الحالي المحفوظ من لوحة التحكم `{ enabled, links }` مع دعم
// الحقول المسطّحة القديمة حتى لا تُحذف الروابط عند التحقق.
export const socialLinksSchema = z.object({
  enabled: z.boolean().optional(),
  links: z.object({
    instagram: z.string().optional().nullable(),
    twitter: z.string().optional().nullable(),
    facebook: z.string().optional().nullable(),
    tiktok: z.string().optional().nullable(),
    snapchat: z.string().optional().nullable(),
    youtube: z.string().optional().nullable(),
    telegram: z.string().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    linkedin: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
  }).optional().nullable(),
  // الحقول المسطّحة (legacy)
  instagram: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  tiktok: z.string().optional().nullable(),
  snapchat: z.string().optional().nullable(),
  youtube: z.string().optional().nullable(),
  telegram: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
}).passthrough();

// Location schema
// لوحة التحكم تحفظ `{ lat, lng, address, description }`؛ ونحتفظ بأسماء
// `latitude/longitude` القديمة للتوافق مع بيانات سابقة.
export const locationSchema = z.object({
  enabled: z.boolean().optional(),
  lat: z.number().finite().min(-90).max(90).optional().nullable(),
  lng: z.number().finite().min(-180).max(180).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
  latitude: z.number().finite().min(-90).max(90).optional().nullable(),
  longitude: z.number().finite().min(-180).max(180).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  googleMapsUrl: z.string().optional().nullable(),
}).passthrough();

// Announcement schema
export const announcementSchema = z.object({
  enabled: z.boolean().optional(),
  message: z.string().optional().nullable(),
  // الاسم القديم للتوافق
  text: z.string().optional().nullable(),
  backgroundColor: z.string().optional().nullable(),
  textColor: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  isScrolling: z.boolean().optional(),
  canClose: z.boolean().optional(),
  link: z.string().optional().nullable(),
  linkText: z.string().optional().nullable(),
}).passthrough();

// Store schema - matches formatStore() in stores.js
export const storeSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  whatsapp: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  adminId: z.string().optional().nullable(),
  theme: themeSchema.optional().nullable(),
  currency: z.string().optional().nullable(),
  location: locationSchema.optional().nullable(),
  announcement: announcementSchema.optional().nullable(),
  socialLinks: socialLinksSchema.optional().nullable(),
  isActive: z.boolean().optional(),
  isAnnualPlan: z.boolean().optional(),
  description: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

// Store creation schema
export const createStoreSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().max(300).optional(),
  whatsapp: z.string().optional(),
  logo: z.string().optional(),
});

// Store update schema
export const updateStoreSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().max(300).optional(),
  whatsapp: z.string().optional(),
  logo: z.string().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Export types
export type Theme = z.infer<typeof themeSchema>;
export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type Location = z.infer<typeof locationSchema>;
export type Announcement = z.infer<typeof announcementSchema>;
export type Store = z.infer<typeof storeSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
