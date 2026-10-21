/**
 * Helper utilities for Cloudflare Workers
 */

// CORS headers
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Create error response
 */
export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message, success: false }, status);
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate subscription code (XXXX-XXXX-XXXX format)
 */
export function generateSubscriptionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Parse request body as JSON
 */
export async function parseBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : ({} as T);
  } catch {
    return {} as T;
  }
}

/**
 * Get query parameters from URL
 */
export function getQueryParams(request: Request): Record<string, string> {
  const url = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    params[key] = value;
  }
  return params;
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, unknown>, fields: string[]): boolean {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
  return true;
}

/**
 * Sanitize string for SQL
 */
export function sanitize(str: unknown): unknown {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''");
}

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function keysToCamelCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(keysToCamelCase) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as object).reduce((acc, key) => {
      (acc as Record<string, unknown>)[toCamelCase(key)] = keysToCamelCase(
        (obj as Record<string, unknown>)[key]
      );
      return acc;
    }, {} as T);
  }
  return obj;
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function keysToSnakeCase<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(keysToSnakeCase) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as object).reduce((acc, key) => {
      (acc as Record<string, unknown>)[toSnakeCase(key)] = keysToSnakeCase(
        (obj as Record<string, unknown>)[key]
      );
      return acc;
    }, {} as T);
  }
  return obj;
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Calculate subscription end date
 */
export function calculateEndDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}
