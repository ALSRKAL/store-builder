/**
 * Category Schema - Zod validation for Category data
 * Matches API response from workers/api/routes/categories.js
 */

import { z } from 'zod';

// Category schema - matches formatCategory() in categories.js
export const categorySchema = z.object({
  id: z.string(),
  storeId: z.string(),
  name: z.string(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
  productCount: z.number().optional().nullable(),
  // Additional fields
  image: z.string().optional().nullable(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

// Category creation schema
export const createCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
});

// Category update schema
export const updateCategorySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
});

// Category list response schema
export const categoryListSchema = z.array(categorySchema);

// Export types
export type Category = z.infer<typeof categorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
