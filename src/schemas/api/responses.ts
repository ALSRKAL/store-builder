/**
 * API Response Schemas - Zod validation for API responses
 */

import { z } from 'zod';

// Generic success response
export const successResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});

// Generic error response
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// Pagination metadata schema
export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
  nextPage: z.number().nullable(),
  prevPage: z.number().nullable(),
});

// API response wrapper
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
  });
}

// Paginated response wrapper
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: paginationMetaSchema,
  });
}

// Health check response
export const healthCheckResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().optional(),
  version: z.string().optional(),
});

// Export types
export type SuccessResponse = z.infer<typeof successResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// Generic paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
