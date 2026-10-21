/**
 * Advanced Cache System
 * نظام تخزين مؤقت متقدم مع Edge Caching و Stale-While-Revalidate
 */

// ===== Types =====
interface CacheResult<T> {
  data: T;
  fromCache: boolean;
  age?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ===== Constants =====
export const CACHE_TTL: Record<string, number> = {
  // Public endpoints - كاش طويل
  publicStore: 10 * 60,        // 10 دقائق
  publicProducts: 5 * 60,      // 5 دقائق
  publicCategories: 10 * 60,   // 10 دقائق
  publicPaymentMethods: 10 * 60,
  // Private endpoints - كاش قصير
  userProducts: 2 * 60,        // 2 دقيقة
  userOrders: 30,              // 30 ثانية
  userStats: 2 * 60,
  settings: 15 * 60,
  plans: 60 * 60,              // ساعة
};

// Stale-While-Revalidate TTLs
export const STALE_TTL: Record<string, number> = {
  publicStore: 30 * 60,        // يمكن استخدام كاش قديم لـ 30 دقيقة
  publicProducts: 15 * 60,
  publicCategories: 30 * 60,
  publicPaymentMethods: 30 * 60,
};

export const CACHE_PREFIX = 'store-api-v2';

// In-memory cache للـ hot data (يعيش طول عمر الـ Worker instance)
const memoryCache = new Map<string, CacheEntry<unknown>>();
const MAX_MEMORY_CACHE_SIZE = 100;

// ===== Memory Cache Functions =====
function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInMemory<T>(key: string, data: T, ttlSeconds: number): void {
  // تنظيف الكاش إذا امتلأ
  if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds,
  });
}

// ===== Core Functions =====
export function createCacheKey(type: string, identifier: string, params: Record<string, string | number> = {}): string {
  const baseKey = `${CACHE_PREFIX}:${type}:${identifier}`;
  const paramKeys = Object.keys(params).sort();
  if (paramKeys.length > 0) {
    const paramString = paramKeys.map(k => `${k}=${params[k]}`).join('&');
    return `${baseKey}?${paramString}`;
  }
  return baseKey;
}

function getCache(): Cache {
  return caches.default;
}

export async function get<T>(cacheKey: string): Promise<T | null> {
  // أولاً: تحقق من Memory Cache
  const memoryData = getFromMemory<T>(cacheKey);
  if (memoryData !== null) return memoryData;
  
  // ثانياً: تحقق من Edge Cache
  try {
    const cache = getCache();
    const url = new URL(`https://cache.internal/${cacheKey}`);
    const response = await cache.match(url);
    if (!response) return null;
    
    const data = await response.json() as T;
    // احفظ في Memory Cache للطلبات القادمة
    setInMemory(cacheKey, data, 60);
    return data;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

export async function set<T>(cacheKey: string, data: T, ttlSeconds = 60): Promise<boolean> {
  // احفظ في Memory Cache
  setInMemory(cacheKey, data, ttlSeconds);
  
  // احفظ في Edge Cache
  try {
    const cache = getCache();
    const url = new URL(`https://cache.internal/${cacheKey}`);
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
      },
    });
    await cache.put(url, response);
    return true;
  } catch (error) {
    console.error('Cache set error:', error);
    return false;
  }
}

export async function del(cacheKey: string): Promise<boolean> {
  memoryCache.delete(cacheKey);
  try {
    const cache = getCache();
    const url = new URL(`https://cache.internal/${cacheKey}`);
    await cache.delete(url);
    return true;
  } catch (error) {
    console.error('Cache delete error:', error);
    return false;
  }
}

// ===== Advanced Caching with Stale-While-Revalidate =====
export async function cachedWithSWR<T>(
  cacheKey: string,
  ttlSeconds: number,
  staleTtlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<CacheResult<T>> {
  // تحقق من Memory Cache أولاً
  const memoryData = getFromMemory<T>(cacheKey);
  if (memoryData !== null) {
    return { data: memoryData, fromCache: true, age: 0 };
  }
  
  try {
    const cache = getCache();
    const url = new URL(`https://cache.internal/${cacheKey}`);
    const response = await cache.match(url);
    
    if (response) {
      const data = await response.json() as T;
      const cacheDate = response.headers.get('X-Cache-Date');
      const age = cacheDate ? (Date.now() - parseInt(cacheDate)) / 1000 : 0;
      
      // إذا الكاش طازج، استخدمه
      if (age < ttlSeconds) {
        setInMemory(cacheKey, data, ttlSeconds - age);
        return { data, fromCache: true, age };
      }
      
      // إذا الكاش قديم لكن ضمن الـ stale period، استخدمه وجدد في الخلفية
      if (age < staleTtlSeconds) {
        // تجديد في الخلفية (fire and forget)
        fetchFn().then(freshData => {
          set(cacheKey, freshData, ttlSeconds);
        }).catch(console.error);
        
        return { data, fromCache: true, age };
      }
    }
  } catch (error) {
    console.error('Cache SWR error:', error);
  }
  
  // جلب بيانات جديدة
  const freshData = await fetchFn();
  await set(cacheKey, freshData, ttlSeconds);
  return { data: freshData, fromCache: false };
}

export async function cached<T>(cacheKey: string, ttlSeconds: number, fetchFn: () => Promise<T>): Promise<CacheResult<T>> {
  const cachedData = await get<T>(cacheKey);
  if (cachedData !== null) {
    return { data: cachedData, fromCache: true };
  }
  const freshData = await fetchFn();
  await set(cacheKey, freshData, ttlSeconds);
  return { data: freshData, fromCache: false };
}

// ===== Cache Key Helpers =====
export function storeKey(slug: string): string {
  return createCacheKey('public-store', slug);
}

export function storeProductsKey(slug: string, params: Record<string, string | number> = {}): string {
  return createCacheKey('public-products', slug, params);
}

export function storeCategoriesKey(slug: string): string {
  return createCacheKey('public-categories', slug);
}

export function storePaymentMethodsKey(slug: string): string {
  return createCacheKey('public-payments', slug);
}

export function userProductsKey(userId: string, params: Record<string, string | number> = {}): string {
  return createCacheKey('user-products', userId, params);
}

export function userOrdersKey(userId: string, params: Record<string, string | number> = {}): string {
  return createCacheKey('user-orders', userId, params);
}

export function userStatsKey(userId: string): string {
  return createCacheKey('user-stats', userId);
}

// ===== Cache Invalidation Helpers =====
export async function invalidateStore(slug: string): Promise<void> {
  await Promise.all([
    del(storeKey(slug)),
    del(storeProductsKey(slug)),
    del(storeCategoriesKey(slug)),
    del(storePaymentMethodsKey(slug)),
  ]);
}

export async function invalidateProducts(userId: string, slug?: string): Promise<void> {
  const promises = [del(userProductsKey(userId))];
  if (slug) promises.push(del(storeProductsKey(slug)));
  await Promise.all(promises);
}

export async function invalidateOrders(userId: string): Promise<void> {
  await Promise.all([del(userOrdersKey(userId)), del(userStatsKey(userId))]);
}

export async function invalidateCategories(_userId: string, slug?: string): Promise<void> {
  if (slug) await del(storeCategoriesKey(slug));
}

export async function invalidatePaymentMethods(slug?: string): Promise<void> {
  if (slug) await del(storePaymentMethodsKey(slug));
}

// ===== Response Helpers =====
export function addCacheHeaders(response: Response, ttlSeconds: number, isPublic = true): Response {
  const headers = new Headers(response.headers);
  const cacheControl = isPublic
    ? `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`
    : `private, max-age=${ttlSeconds}`;
  
  headers.set('Cache-Control', cacheControl);
  headers.set('X-Cache-TTL', String(ttlSeconds));
  headers.set('X-Cache-Date', String(Date.now()));
  
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function addCacheStatusHeader(response: Response, fromCache: boolean): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Cache-Status', fromCache ? 'HIT' : 'MISS');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ===== Preload/Warmup Functions =====
export async function warmupStoreCache(slug: string, fetchStoreFn: () => Promise<unknown>, fetchProductsFn: () => Promise<unknown>): Promise<void> {
  await Promise.all([
    set(storeKey(slug), await fetchStoreFn(), CACHE_TTL.publicStore),
    set(storeProductsKey(slug), await fetchProductsFn(), CACHE_TTL.publicProducts),
  ]);
}
