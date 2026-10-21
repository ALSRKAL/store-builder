/**
 * Rate Limiter Utility
 * حماية الـ API من الطلبات المفرطة
 */

import type { Env, RateLimitResult } from '../types';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// إعدادات Rate Limiting حسب نوع الـ endpoint
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  public: { maxRequests: 100, windowMs: 60 * 1000 },
  authenticated: { maxRequests: 200, windowMs: 60 * 1000 },
  write: { maxRequests: 30, windowMs: 60 * 1000 },
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  verify: { maxRequests: 5, windowMs: 60 * 60 * 1000 },
};

/**
 * الحصول على IP العميل
 */
export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
         request.headers.get('X-Real-IP') ||
         'unknown';
}

/**
 * تحديد نوع الـ Rate Limit حسب المسار والـ method
 */
function getRateLimitType(path: string, method: string): string {
  if (path.includes('/subscriptions/verify') || path.includes('/subscriptions/renew')) {
    return 'verify';
  }
  
  if (path.includes('/admin/profile') && method === 'POST') {
    return 'auth';
  }
  
  if (path.startsWith('/api/public/')) {
    return 'public';
  }
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return 'write';
  }
  
  return 'authenticated';
}

/**
 * إنشاء معرف فريد للـ Rate Limit
 */
function createRateLimitId(ip: string, endpoint: string): string {
  const simplifiedEndpoint = endpoint
    .replace(/\/[a-f0-9-]{36}/gi, '/:id')
    .replace(/\/[\w-]+$/g, '/:id')
    .replace(/\?.*$/, '');
  
  return `${ip}:${simplifiedEndpoint}`;
}

interface DBRateLimitRecord {
  id: string;
  request_count: number;
  window_start: string;
}

/**
 * فحص Rate Limit
 */
export async function checkRateLimit(request: Request, env: Env): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  const path = new URL(request.url).pathname;
  const method = request.method;
  
  if (method === 'OPTIONS') {
    return { allowed: true, remaining: -1 };
  }
  
  const limitType = getRateLimitType(path, method);
  const limits = RATE_LIMITS[limitType];
  const rateLimitId = createRateLimitId(ip, path);
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - limits.windowMs);
  const windowStartStr = windowStart.toISOString();
  
  try {
    const existing = await env.DB.prepare(`
      SELECT * FROM rate_limits 
      WHERE id = ? AND window_start > ?
    `).bind(rateLimitId, windowStartStr).first<DBRateLimitRecord>();
    
    if (existing) {
      const newCount = existing.request_count + 1;
      
      if (newCount > limits.maxRequests) {
        const resetAt = new Date(new Date(existing.window_start).getTime() + limits.windowMs);
        const retryAfter = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
        
        return {
          allowed: false,
          remaining: 0,
          resetAt: resetAt.toISOString(),
          retryAfter,
          limitType,
        };
      }
      
      await env.DB.prepare(`
        UPDATE rate_limits 
        SET request_count = ?, updated_at = ?
        WHERE id = ?
      `).bind(newCount, now.toISOString(), rateLimitId).run();
      
      return {
        allowed: true,
        remaining: limits.maxRequests - newCount,
        resetAt: new Date(new Date(existing.window_start).getTime() + limits.windowMs).toISOString(),
        limitType,
      };
    } else {
      await env.DB.prepare(`
        INSERT OR REPLACE INTO rate_limits (id, ip, endpoint, request_count, window_start, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?)
      `).bind(rateLimitId, ip, path, now.toISOString(), now.toISOString(), now.toISOString()).run();
      
      return {
        allowed: true,
        remaining: limits.maxRequests - 1,
        resetAt: new Date(now.getTime() + limits.windowMs).toISOString(),
        limitType,
      };
    }
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: -1, error: (error as Error).message };
  }
}

/**
 * إضافة Rate Limit headers للـ response
 */
export function addRateLimitHeaders(response: Response, rateLimitResult: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  
  if (rateLimitResult.remaining !== -1) {
    headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    if (rateLimitResult.resetAt) {
      headers.set('X-RateLimit-Reset', rateLimitResult.resetAt);
    }
    if (rateLimitResult.limitType) {
      headers.set('X-RateLimit-Type', rateLimitResult.limitType);
    }
  }
  
  if (rateLimitResult.retryAfter) {
    headers.set('Retry-After', String(rateLimitResult.retryAfter));
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * تنظيف السجلات القديمة
 */
export async function cleanupOldRecords(env: Env): Promise<{ deleted: number } | { error: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  try {
    const result = await env.DB.prepare(`
      DELETE FROM rate_limits WHERE window_start < ?
    `).bind(oneHourAgo).run();
    
    return { deleted: result.meta?.changes || 0 };
  } catch (error) {
    console.error('Cleanup error:', error);
    return { error: (error as Error).message };
  }
}
