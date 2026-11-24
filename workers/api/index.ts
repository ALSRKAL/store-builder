/**
 * Cloudflare Worker - Store API
 * Main entry point
 */

import type { Env, AuthenticatedRequest, FirebaseUser } from './types';
import { healthResponse } from './utils/health';
import { verifyFirebaseToken } from './utils/auth';
import { jsonResponse, errorResponse, corsHeaders } from './utils/helpers';
import { checkRateLimit, addRateLimitHeaders, cleanupOldRecords } from './utils/rateLimiter';
import { initLogger, logApiError, logApiResponse, cleanupOldLogs } from './utils/logger';
import {
  cached,
  storeKey,
  storeProductsKey,
  storeCategoriesKey,
  addCacheStatusHeader,
  CACHE_TTL,
  authoritativePublicResponse
} from './utils/cache';
import { affectedOwner, isPublicMutation, primaryEnv, publishOwnerRevisions, resolveStoreRevision } from './realtime/revisions';
export { StoreRealtime } from './realtime/StoreRealtime';

// Import route handlers
import { handleStores } from './routes/stores';
import { handleProducts } from './routes/products';
import { handleCategories } from './routes/categories';
import { handleSubscriptions } from './routes/subscriptions';
import { handleAdmin } from './routes/admin';
import { handleImages, handleImageUpload } from './routes/images';
import { handlePayments, getPublicPaymentMethods, submitPaymentReceipt } from './routes/payments';
import { handleOrders, createPublicOrder } from './routes/orders';
import { handlePush } from './routes/push';
import { handleSeo } from './routes/seo';

// ===== Types =====

interface DBStore {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  whatsapp: string | null;
  logo: string | null;
  owner_id: string;
  currency: string;
  theme: string | null;
  location: string | null;
  announcement: string | null;
  social_links: string | null;
  is_active: number;
  plan_id?: string;
  subscription_end?: string;
  created_at: string;
  updated_at: string;
}

interface DBProduct {
  id: string;
  store_id: string;
  name: string;
  price: number;
  description: string | null;
  images: string | null;
  category_id: string | null;
  colors: string | null;
  sizes: string | null;
  discount: number;
  in_stock: number;
  created_at: string;
  updated_at: string;
}


interface DBCategory {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface DBAdmin {
  id: string;
  email: string;
  store_name: string;
  store_id: string | null;
  slug: string;
  whatsapp: string | null;
  logo: string | null;
  subscription_code: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  subscription_months: number;
  plan_id: string | null;
  is_trial: number;
  dashboard_is_active: number;
  store_is_active: number;
  hide_upgrade_ui: number;
  code_history: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface DBErrorLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  path: string | null;
  method: string | null;
  user_id: string | null;
  ip: string | null;
  error_name: string | null;
  error_message: string | null;
}

// ===== Main Export =====

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();

    initLogger(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    const health = await healthResponse(request, env);
    if (health) return health;

    const rateLimitResult = await checkRateLimit(request, env);

    if (!rateLimitResult.allowed) {
      const response = errorResponse(
        `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        429
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    try {
      if (path.startsWith('/api/public/')) {
        const response = await handlePublicRoutes(request, env, path);
        logApiResponse(request, response.status, Date.now() - startTime);
        // Never reconstruct a 101 response: that drops its WebSocket endpoint.
        if (response.status === 101) return response;
        return addRateLimitHeaders(response, rateLimitResult);
      }

      if (path.startsWith('/api/push/')) {
        const response = await handlePush(request, env, path);
        logApiResponse(request, response.status, Date.now() - startTime);
        return addRateLimitHeaders(response, rateLimitResult);
      }

      // SEO Routes - Public, no auth required
      if (path.startsWith('/api/seo/')) {
        const response = await handleSeo(request, env, path);
        logApiResponse(request, response.status, Date.now() - startTime);
        return addRateLimitHeaders(response, rateLimitResult);
      }

      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
      }

      if (path === '/api/internal/cleanup-rate-limits') {
        const result = await cleanupOldRecords(env);
        return jsonResponse({ success: true, ...result });
      }

      if (path === '/api/internal/cleanup-logs') {
        const result = await cleanupOldLogs(env);
        return jsonResponse({ success: true, ...result });
      }

      if (path === '/api/internal/logs') {
        const logs = await getRecentLogs(env, url);
        return jsonResponse(logs);
      }

      if (path.startsWith('/api/flutter-admin/')) {
        const response = await handleFlutterAdminRoutes(request, env, path);
        logApiResponse(request, response.status, Date.now() - startTime);
        return addRateLimitHeaders(response, rateLimitResult);
      }


      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return errorResponse('Unauthorized - No token provided', 401);
      }

      const token = authHeader.split('Bearer ')[1];
      const user = await verifyFirebaseToken(token, env);

      if (!user) {
        return errorResponse('Unauthorized - Invalid token', 401);
      }

      const requestWithUser = request as AuthenticatedRequest;
      requestWithUser.user = user as FirebaseUser;

      let response: Response;

      if (path.startsWith('/api/stores')) {
        response = await handleStores(requestWithUser, env, path);
      } else if (path.startsWith('/api/products')) {
        response = await handleProducts(requestWithUser, env, path);
      } else if (path.startsWith('/api/categories')) {
        response = await handleCategories(requestWithUser, env, path);
      } else if (path.startsWith('/api/subscriptions')) {
        response = await handleSubscriptions(requestWithUser, env, path);
      } else if (path.startsWith('/api/admin')) {
        response = await handleAdmin(requestWithUser, env, path);
      } else if (path.startsWith('/api/images')) {
        if (path.startsWith('/api/images/upload/')) {
          const fileKey = decodeURIComponent(path.replace('/api/images/upload/', ''));
          response = await handleImageUpload(requestWithUser, env, fileKey);
        } else {
          response = await handleImages(requestWithUser, env, path);
        }
      } else if (path.startsWith('/api/payments')) {
        response = await handlePayments(requestWithUser, env, path);
      } else if (path.startsWith('/api/orders')) {
        response = await handleOrders(requestWithUser, env, path);
      } else {
        response = errorResponse('Not Found', 404);
      }

      if (response.ok && isPublicMutation(request.method, path)) {
        // D1 triggers are the only revision writer. No client-provided revision,
        // slug or event payload can enter the broadcaster. Failures are repaired
        // by the active-store alarm; a committed mutation must not become a 500.
        _ctx.waitUntil(publishOwnerRevisions(env, affectedOwner(path, user.uid)).catch(error => {
          console.error('Realtime publish deferred to reconciliation:', error);
        }));
      }

      logApiResponse(request, response.status, Date.now() - startTime, user?.uid);

      return addRateLimitHeaders(response, rateLimitResult);

    } catch (err) {
      const authReq = request as AuthenticatedRequest;
      await logApiError(request, err, env, authReq.user?.uid || null);

      const errorMessage = (err as Error).message || 'Internal Server Error';
      const response = errorResponse(errorMessage, 500);

      logApiResponse(request, 500, Date.now() - startTime);

      return response;
    }
  }
};


// ===== Public Routes =====

async function handlePublicRoutes(request: Request, env: Env, path: string): Promise<Response> {
  if (path.match(/^\/api\/public\/store\/[\w-]+\/realtime$/)) {
    if (request.method !== 'GET') return errorResponse('Method not allowed', 405);
    const identifier = path.split('/')[4];
    const row = await resolveStoreRevision(primaryEnv(env), identifier);
    if (!row) return errorResponse('Store not found', 404);
    const stub = env.STORE_REALTIME.get(env.STORE_REALTIME.idFromName(row.store_id));
    return stub.fetch(new Request('https://realtime.internal/connect', {
      method: 'GET', headers: { Upgrade: request.headers.get('Upgrade') ?? '', 'X-Store-Id': row.store_id },
    }));
  }

  if (request.method === 'GET' && path.match(/^\/api\/public\/store\/[\w-]+$/)) {
    const slug = path.split('/').pop()!;
    return authoritativePublicResponse(env, slug, 'store', (session, row) => getPublicStore(session, row.store_id));
  }

  if (request.method === 'GET' && path.match(/^\/api\/public\/store\/[\w-]+\/products$/)) {
    const slug = path.split('/')[4];
    return authoritativePublicResponse(env, slug, 'products', (session, row) => getPublicStoreProducts(session, row.store_id));
  }

  if (request.method === 'GET' && path.match(/^\/api\/public\/store\/[\w-]+\/categories$/)) {
    const slug = path.split('/')[4];
    return authoritativePublicResponse(env, slug, 'categories', (session, row) => getPublicStoreCategories(session, row.store_id));
  }

  if (request.method === 'GET' && path.match(/^\/api\/public\/store\/[\w-]+\/payment-methods$/)) {
    const slug = path.split('/')[4];
    return authoritativePublicResponse(env, slug, 'payments', (session, row) => getPublicPaymentMethods(session, row.store_id));
  }

  if (request.method === 'POST' && path.match(/^\/api\/public\/store\/[\w-]+\/payment-receipt$/)) {
    const slug = path.split('/')[4];
    const body = await request.json() as { paymentMethodId: string; customerName?: string; customerPhone?: string; amount?: number; receiptImage: string; notes?: string };
    return submitPaymentReceipt(env, slug, body);
  }

  if (request.method === 'POST' && path.match(/^\/api\/public\/store\/[\w-]+\/order$/)) {
    const slug = path.split('/')[4];
    const body = await request.json() as { customerName: string; customerPhone: string; customerAddress?: string; customerNotes?: string; items: Array<{ id: string; name: string; price: number; quantity: number; total?: number; selectedColor?: string; selectedSize?: string; image?: string; images?: string[] }>; paymentMethodId: string; receiptImage?: string };
    return createPublicOrder(env, slug, body);
  }

  return errorResponse('Not Found', 404);
}

async function getPublicStore(env: Env, slug: string): Promise<Response> {
  try {
    const cacheKeyStr = storeKey(slug);

    const { data: storeData, fromCache } = await cached(
      cacheKeyStr,
      CACHE_TTL.publicStore,
      async () => {
        const store = await env.DB.prepare(`
          SELECT s.*, a.plan_id, a.subscription_end
          FROM stores s
          LEFT JOIN admins a ON s.owner_id = a.id
          WHERE s.id = ?
        `).bind(slug).first<DBStore>();

        if (!store) {
          return null;
        }

        return {
          id: store.id,
          slug: store.slug,
          name: store.name,
          description: store.description ?? null,
          whatsapp: store.whatsapp,
          logo: store.logo,
          ownerId: store.owner_id,
          currency: store.currency,
          theme: store.theme ? JSON.parse(store.theme) : null,
          location: store.location ? JSON.parse(store.location) : null,
          announcement: store.announcement ? JSON.parse(store.announcement) : null,
          socialLinks: store.social_links ? JSON.parse(store.social_links) : null,
          isActive: store.is_active === 1,
          isAnnualPlan: store.plan_id === 'annual',
          createdAt: store.created_at,
          updatedAt: store.updated_at
        };
      }
    );

    if (!storeData) {
      return errorResponse('Store not found', 404);
    }

    const response = jsonResponse(storeData);
    return addCacheStatusHeader(response, fromCache);
  } catch (error) {
    console.error('Error fetching store:', error);
    return errorResponse('Error fetching store', 500);
  }
}


async function getPublicStoreProducts(env: Env, slug: string): Promise<Response> {
  try {
    const cacheKeyStr = storeProductsKey(slug);

    const { data: result, fromCache } = await cached(
      cacheKeyStr,
      CACHE_TTL.publicProducts,
      async () => {
        const store = await env.DB.prepare(`
          SELECT owner_id FROM stores WHERE id = ?
        `).bind(slug).first<{ owner_id: string }>();

        if (!store) {
          return { error: 'Store not found' };
        }

        const products = await env.DB.prepare(`
          SELECT * FROM products 
          WHERE store_id = ? 
          ORDER BY created_at DESC
        `).bind(store.owner_id).all<DBProduct>();

        return {
          products: products.results.map(p => ({
            id: p.id,
            storeId: p.store_id,
            name: p.name,
            price: p.price,
            description: p.description,
            images: p.images ? JSON.parse(p.images) : [],
            categoryId: p.category_id,
            colors: p.colors ? JSON.parse(p.colors) : [],
            sizes: p.sizes ? JSON.parse(p.sizes) : [],
            discount: p.discount,
            inStock: p.in_stock === 1,
            createdAt: p.created_at,
            updatedAt: p.updated_at
          }))
        };
      }
    );

    if ('error' in result) {
      return errorResponse(result.error as string, 404);
    }

    const response = jsonResponse(result.products);
    return addCacheStatusHeader(response, fromCache);
  } catch (error) {
    console.error('Error fetching products:', error);
    return errorResponse('Error fetching products', 500);
  }
}

async function getPublicStoreCategories(env: Env, slug: string): Promise<Response> {
  try {
    const cacheKeyStr = storeCategoriesKey(slug);

    const { data: result, fromCache } = await cached(
      cacheKeyStr,
      CACHE_TTL.publicCategories,
      async () => {
        const store = await env.DB.prepare(`
          SELECT owner_id FROM stores WHERE id = ?
        `).bind(slug).first<{ owner_id: string }>();

        if (!store) {
          return { error: 'Store not found' };
        }

        const categories = await env.DB.prepare(`
          SELECT * FROM categories 
          WHERE store_id = ? 
          ORDER BY sort_order ASC, name ASC
        `).bind(store.owner_id).all<DBCategory>();

        return {
          categories: categories.results.map(c => ({
            id: c.id,
            storeId: c.store_id,
            name: c.name,
            description: c.description,
            sortOrder: c.sort_order,
            createdAt: c.created_at,
            updatedAt: c.updated_at
          }))
        };
      }
    );

    if ('error' in result) {
      return errorResponse(result.error as string, 404);
    }

    const response = jsonResponse(result.categories);
    return addCacheStatusHeader(response, fromCache);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return errorResponse('Error fetching categories', 500);
  }
}


// ===== Flutter Admin Routes =====

async function handleFlutterAdminRoutes(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;
  const subPath = path.replace('/api/flutter-admin', '');

  if (method === 'GET' && subPath === '/subscribers') {
    return getAllSubscribers(env);
  }

  if (method === 'GET' && subPath === '/stats') {
    return getGlobalStats(env);
  }

  if (method === 'POST' && subPath === '/codes') {
    const body = await request.json();
    return generateCode(env, body as { months: number; planId?: string; expiresAt?: string });
  }

  if (method === 'GET' && subPath === '/codes') {
    return getAllCodes(env);
  }

  if (method === 'PUT' && subPath.match(/^\/subscribers\/[\w-]+\/store-status$/)) {
    const subscriberId = subPath.split('/')[2];
    const body = await request.json();
    return updateStoreStatus(env, subscriberId, body as { isActive: boolean });
  }

  if (method === 'PUT' && subPath.match(/^\/subscribers\/[\w-]+\/dashboard-status$/)) {
    const subscriberId = subPath.split('/')[2];
    const body = await request.json();
    return updateDashboardStatus(env, subscriberId, body as { isActive: boolean });
  }

  if (method === 'PUT' && subPath.match(/^\/subscribers\/[\w-]+\/hide-upgrade$/)) {
    const subscriberId = subPath.split('/')[2];
    const body = await request.json();
    return updateHideUpgradeUI(env, subscriberId, body as { hide: boolean });
  }

  if (method === 'DELETE' && subPath.match(/^\/subscribers\/[\w-]+$/)) {
    const subscriberId = subPath.split('/').pop()!;
    return deleteSubscriber(env, subscriberId);
  }

  if (method === 'GET' && subPath === '/settings') {
    return getSettings(env);
  }

  if (method === 'PUT' && subPath === '/settings') {
    const body = await request.json();
    return updateSettings(env, body as { adminWhatsApp?: string });
  }

  return errorResponse('Not Found', 404);
}

async function getAllSubscribers(env: Env): Promise<Response> {
  try {
    const subscribers = await env.DB.prepare(`
      SELECT a.*, s.name as store_display_name, s.is_active as store_active
      FROM admins a
      LEFT JOIN stores s ON a.store_id = s.id
      ORDER BY a.created_at DESC
    `).all<DBAdmin & { store_display_name?: string; store_active?: number }>();

    const formattedSubscribers = subscribers.results.map(admin => ({
      id: admin.id,
      email: admin.email,
      storeName: admin.store_name,
      storeId: admin.store_id,
      slug: admin.slug,
      whatsapp: admin.whatsapp,
      logo: admin.logo,
      subscriptionCode: admin.subscription_code,
      subscriptionStart: admin.subscription_start,
      subscriptionEnd: admin.subscription_end,
      subscriptionMonths: admin.subscription_months,
      planId: admin.plan_id,
      isTrial: admin.is_trial === 1,
      dashboardIsActive: admin.dashboard_is_active === 1,
      storeIsActive: admin.store_is_active === 1,
      hideUpgradeUI: admin.hide_upgrade_ui === 1,
      codeHistory: admin.code_history ? JSON.parse(admin.code_history) : [],
      lastLogin: admin.last_login,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at
    }));

    return jsonResponse(formattedSubscribers);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return errorResponse('Error fetching subscribers', 500);
  }
}


async function getGlobalStats(env: Env): Promise<Response> {
  try {
    const totalAdmins = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM admins
    `).first<{ count: number }>();

    const activeSubscriptions = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM admins 
      WHERE subscription_end > datetime('now')
    `).first<{ count: number }>();

    const expiredSubscriptions = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM admins 
      WHERE subscription_end <= datetime('now') OR subscription_end IS NULL
    `).first<{ count: number }>();

    const totalProducts = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM products
    `).first<{ count: number }>();

    const totalStores = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM stores
    `).first<{ count: number }>();

    return jsonResponse({
      total: totalAdmins?.count || 0,
      active: activeSubscriptions?.count || 0,
      expired: expiredSubscriptions?.count || 0,
      totalProducts: totalProducts?.count || 0,
      totalStores: totalStores?.count || 0
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    return errorResponse('Error fetching stats', 500);
  }
}

async function generateCode(
  env: Env,
  data: { months: number; planId?: string; expiresAt?: string }
): Promise<Response> {
  try {
    const { months, planId, expiresAt } = data;

    if (months === undefined) {
      return errorResponse('Months is required', 400);
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const timestamp = new Date().toISOString();
    const finalPlanId = planId || (months === 0 ? 'trial' : months === 1 ? 'monthly' : months <= 6 ? 'semiAnnual' : 'annual');

    await env.DB.prepare(`
      INSERT INTO subscription_codes (code, months, plan_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(code, months, finalPlanId, expiresAt || null, timestamp).run();

    return jsonResponse({
      success: true,
      code,
      months,
      planId: finalPlanId
    }, 201);
  } catch (error) {
    console.error('Error generating code:', error);
    return errorResponse('Error generating code', 500);
  }
}

async function getAllCodes(env: Env): Promise<Response> {
  try {
    const codes = await env.DB.prepare(`
      SELECT * FROM subscription_codes ORDER BY created_at DESC
    `).all();

    return jsonResponse(codes.results);
  } catch (error) {
    console.error('Error fetching codes:', error);
    return errorResponse('Error fetching codes', 500);
  }
}


async function updateStoreStatus(
  env: Env,
  subscriberId: string,
  data: { isActive: boolean }
): Promise<Response> {
  try {
    const { isActive } = data;
    const timestamp = new Date().toISOString();

    const admin = await env.DB.prepare(`
      SELECT store_id FROM admins WHERE id = ?
    `).bind(subscriberId).first<{ store_id: string | null }>();

    if (!admin) {
      return errorResponse('Subscriber not found', 404);
    }

    if (admin.store_id) {
      await env.DB.prepare(`
        UPDATE stores SET is_active = ?, updated_at = ? WHERE id = ?
      `).bind(isActive ? 1 : 0, timestamp, admin.store_id).run();
    }

    await env.DB.prepare(`
      UPDATE admins SET store_is_active = ?, updated_at = ? WHERE id = ?
    `).bind(isActive ? 1 : 0, timestamp, subscriberId).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating store status:', error);
    return errorResponse('Error updating store status', 500);
  }
}

async function updateDashboardStatus(
  env: Env,
  subscriberId: string,
  data: { isActive: boolean }
): Promise<Response> {
  try {
    const { isActive } = data;
    const timestamp = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE admins SET dashboard_is_active = ?, updated_at = ? WHERE id = ?
    `).bind(isActive ? 1 : 0, timestamp, subscriberId).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating dashboard status:', error);
    return errorResponse('Error updating dashboard status', 500);
  }
}

async function updateHideUpgradeUI(
  env: Env,
  subscriberId: string,
  data: { hide: boolean }
): Promise<Response> {
  try {
    const { hide } = data;
    const timestamp = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE admins SET hide_upgrade_ui = ?, updated_at = ? WHERE id = ?
    `).bind(hide ? 1 : 0, timestamp, subscriberId).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating hide upgrade UI:', error);
    return errorResponse('Error updating hide upgrade UI', 500);
  }
}

async function deleteSubscriber(env: Env, subscriberId: string): Promise<Response> {
  try {
    const admin = await env.DB.prepare(`
      SELECT store_id FROM admins WHERE id = ?
    `).bind(subscriberId).first<{ store_id: string | null }>();

    if (!admin) {
      return errorResponse('Subscriber not found', 404);
    }

    const productsDeleted = await env.DB.prepare(`
      DELETE FROM products WHERE store_id = ?
    `).bind(subscriberId).run();

    const categoriesDeleted = await env.DB.prepare(`
      DELETE FROM categories WHERE store_id = ?
    `).bind(subscriberId).run();

    if (admin.store_id) {
      await env.DB.prepare(`
        DELETE FROM stores WHERE id = ?
      `).bind(admin.store_id).run();
    }

    await env.DB.prepare(`
      DELETE FROM admins WHERE id = ?
    `).bind(subscriberId).run();

    return jsonResponse({
      success: true,
      deleted: {
        products: productsDeleted.meta?.changes || 0,
        categories: categoriesDeleted.meta?.changes || 0
      }
    });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return errorResponse('Error deleting subscriber', 500);
  }
}


async function getSettings(env: Env): Promise<Response> {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `).run();

    const settings = await env.DB.prepare(`
      SELECT * FROM settings WHERE key = 'contact'
    `).first<{ value: string; updated_at: string }>();

    if (settings) {
      return jsonResponse({
        adminWhatsApp: settings.value || '',
        updatedAt: settings.updated_at
      });
    }

    return jsonResponse({ adminWhatsApp: '' });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return errorResponse('Error fetching settings', 500);
  }
}

async function updateSettings(env: Env, data: { adminWhatsApp?: string }): Promise<Response> {
  try {
    const { adminWhatsApp } = data;
    const timestamp = new Date().toISOString();

    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      )
    `).run();

    await env.DB.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_at)
      VALUES ('contact', ?, ?)
    `).bind(adminWhatsApp || '', timestamp).run();

    return jsonResponse({
      success: true,
      adminWhatsApp: adminWhatsApp || '',
      updatedAt: timestamp
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return errorResponse('Error updating settings', 500);
  }
}

async function getRecentLogs(
  env: Env,
  url: URL
): Promise<{ logs: DBErrorLog[]; total: number; message?: string; error?: string }> {
  try {
    const params = url.searchParams;
    const limit = Math.min(parseInt(params.get('limit') || '50', 10), 200);
    const level = params.get('level')?.toUpperCase();
    const pathFilter = params.get('path');

    let query = 'SELECT * FROM error_logs';
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (level) {
      conditions.push('level = ?');
      values.push(level);
    }

    if (pathFilter) {
      conditions.push('path LIKE ?');
      values.push(`%${pathFilter}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    values.push(limit);

    const logs = await env.DB.prepare(query).bind(...values).all<DBErrorLog>();

    return {
      logs: logs.results.map(log => ({
        id: log.id,
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        path: log.path,
        method: log.method,
        user_id: log.user_id,
        ip: log.ip,
        error_name: log.error_name,
        error_message: log.error_message,
      })),
      total: logs.results.length,
    };
  } catch (error) {
    const err = error as Error;
    if (err.message?.includes('no such table')) {
      return { logs: [], total: 0, message: 'No logs table yet' };
    }
    console.error('Error fetching logs:', error);
    return { logs: [], total: 0, error: err.message };
  }
}
