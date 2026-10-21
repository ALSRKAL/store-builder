/**
 * API Error Schemas - Zod validation for API errors
 */

import { z } from 'zod';

// Error codes enum
export const errorCodeSchema = z.enum([
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'BAD_REQUEST',
  'SUBSCRIPTION_EXPIRED',
  'LIMIT_EXCEEDED',
  'INVALID_CODE',
  'CODE_ALREADY_USED',
  'STORE_INACTIVE',
  'DASHBOARD_INACTIVE',
]);

// API error schema
export const apiErrorSchema = z.object({
  error: z.string(),
  code: errorCodeSchema.optional(),
  statusCode: z.number().optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().optional(),
});

// Validation error schema
export const validationErrorSchema = z.object({
  error: z.literal('Validation Error'),
  code: z.literal('VALIDATION_ERROR'),
  details: z.record(z.string(), z.array(z.string())),
});

// Custom API Error class
export class ApiError extends Error {
  public readonly code: z.infer<typeof errorCodeSchema> | undefined;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;

  constructor(
    message: string,
    statusCode = 500,
    code?: z.infer<typeof errorCodeSchema>,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON(): z.infer<typeof apiErrorSchema> {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

// Helper to parse API errors
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  if (typeof error === 'string') {
    return new ApiError(error);
  }

  // Try to parse as API error response
  const parsed = apiErrorSchema.safeParse(error);
  if (parsed.success) {
    return new ApiError(
      parsed.data.error,
      parsed.data.statusCode,
      parsed.data.code,
      parsed.data.details
    );
  }

  return new ApiError('حدث خطأ غير متوقع');
}

// Export types
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
export type ValidationErrorResponse = z.infer<typeof validationErrorSchema>;
