/**
 * Product Schema - Zod validation for Product data
 * Matches API response from workers/api/routes/products.js
 */

import { z } from 'zod';

// Product variant schema
export const productVariantSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.string(),
  price: z.number().optional(),
  stock: z.number().optional(),
});

// Product image schema
export const productImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string().optional(),
  order: z.number().optional(),
});

// Product schema - matches formatProduct() in products.js
export const productSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  name: z.string(),
  price: z.number(),
  description: z.string().optional().nullable(),
  images: z.array(z.string()).default([]),
  categoryId: z.string().optional().nullable(),
  colors: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  discount: z.number().optional().nullable(),
  inStock: z.boolean().optional(),
  // Additional fields that might exist
  originalPrice: z.number().optional().nullable(),
  variants: z.array(productVariantSchema).optional(),
  stock: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  order: z.number().optional(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

// Product creation schema
export const createProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0).optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  categoryId: z.string().optional().nullable(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  discount: z.number().optional(),
  inStock: z.boolean().optional(),
});

// Product update schema
export const updateProductSchema = z.object({
  name: z.string().optional(),
  price: z.number().optional(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  categoryId: z.string().optional().nullable(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  discount: z.number().optional(),
  inStock: z.boolean().optional(),
});

// Product list response schema
export const productListSchema = z.array(productSchema);

// Export types
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
