/**
 * Admin API Routes
 */

import type { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, errorResponse, parseBody, now } from '../utils/helpers';
import { getUserId } from '../utils/auth';

interface DBAdmin {
  id: string;
  email: string;
  store_name: string | null;
  store_id: string | null;
  slug: string | null;
  whatsapp: string | null;
  whatsapp_api_key: string | null;
  logo: string | null;
  subscription_code: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  subscription_months: number;
  plan_id: string | null;
  is_trial: number;
  trial_used: number;
  dashboard_is_active: number;
  store_is_active: number;
  hide_upgrade_ui: number;
  code_history: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminInput {
  storeName?: string;
  storeId?: string;
  slug?: string;
  whatsapp?: string;
  logo?: string;
  whatsappApiKey?: string;
}

export async function handleAdmin(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const userId = getUserId(request);
  const userEmail = request.user?.email;

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  if (method === 'GET' && path === '/api/admin/profile') {
    return getAdminProfile(env, userId, userEmail);
  }

  if (method === 'PUT' && path === '/api/admin/profile') {
    const body = await parseBody<AdminInput>(request);
    return updateAdminProfile(env, userId, body);
  }


  if (method === 'POST' && path === '/api/admin/profile') {
    const body = await parseBody<AdminInput>(request);
    return createAdminProfile(env, userId, body, request.user!);
  }

  if (method === 'GET' && path === '/api/admin/stats') {
    return getAdminStats(env, userId);
  }

  if (method === 'PUT' && path === '/api/admin/last-login') {
    return updateLastLogin(env, userId);
  }

  if (method === 'GET' && path === '/api/admin/subscribers') {
    return getAllSubscribers(env);
  }

  if (method === 'PUT' && path.match(/^\/api\/admin\/subscribers\/[\w-]+\/store-status$/)) {
    const subscriberId = path.split('/')[4];
    const body = await parseBody<{ isActive: boolean }>(request);
    return updateStoreStatus(env, subscriberId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/admin\/subscribers\/[\w-]+\/dashboard-status$/)) {
    const subscriberId = path.split('/')[4];
    const body = await parseBody<{ isActive: boolean }>(request);
    return updateDashboardStatus(env, subscriberId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/admin\/subscribers\/[\w-]+\/hide-upgrade$/)) {
    const subscriberId = path.split('/')[4];
    const body = await parseBody<{ hide: boolean }>(request);
    return updateHideUpgradeUI(env, subscriberId, body);
  }

  if (method === 'DELETE' && path.match(/^\/api\/admin\/subscribers\/[\w-]+$/)) {
    const subscriberId = path.split('/').pop()!;
    return deleteSubscriber(env, subscriberId);
  }

  if (method === 'GET' && path === '/api/admin/global-stats') {
    return getGlobalStats(env);
  }

  return errorResponse('Not Found', 404);
}

async function getAdminProfile(env: Env, userId: string, userEmail?: string): Promise<Response> {
  try {
    let admin = await env.DB.prepare(`SELECT * FROM admins WHERE id = ?`).bind(userId).first<DBAdmin>();

    if (!admin && userEmail) {
      admin = await env.DB.prepare(`SELECT * FROM admins WHERE email = ?`).bind(userEmail).first<DBAdmin>();
      
      if (admin) {
        const oldId = admin.id;
        const timestamp = now();
        
        await env.DB.prepare(`UPDATE admins SET id = ?, updated_at = ? WHERE email = ?`).bind(userId, timestamp, userEmail).run();
        await env.DB.prepare(`UPDATE stores SET owner_id = ?, updated_at = ? WHERE owner_id = ?`).bind(userId, timestamp, oldId).run();
        await env.DB.prepare(`UPDATE products SET store_id = ?, updated_at = ? WHERE store_id = ?`).bind(userId, timestamp, oldId).run();
        await env.DB.prepare(`UPDATE categories SET store_id = ?, updated_at = ? WHERE store_id = ?`).bind(userId, timestamp, oldId).run();
        
        admin = await env.DB.prepare(`SELECT * FROM admins WHERE id = ?`).bind(userId).first<DBAdmin>();
      }
    }

    const usedTrial = await env.DB.prepare(`
      SELECT 1 AS used FROM trial_ledger WHERE
        (identity_type = 'uid' AND identity_value = ?) OR
        (identity_type = 'email' AND identity_value = ?)
      LIMIT 1
    `).bind(userId, userEmail?.trim().toLowerCase() ?? '').first<{ used: number }>();
    if (!admin) {
      // Expose consumed eligibility even when the mutable profile was deleted.
      return jsonResponse(usedTrial ? { id: userId, email: userEmail ?? '', trialUsed: true } : null);
    }

    return jsonResponse({ ...formatAdmin(admin), trialUsed: !!usedTrial || admin.trial_used === 1 });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return errorResponse('Error fetching profile', 500);
  }
}


async function createAdminProfile(
  env: Env,
  userId: string,
  data: AdminInput,
  user: { email?: string }
): Promise<Response> {
  try {
    const timestamp = now();
    const { storeName, storeId, slug, whatsapp, logo } = data;

    const existing = await env.DB.prepare(`SELECT id FROM admins WHERE id = ?`).bind(userId).first<{ id: string }>();

    if (existing) {
      await env.DB.prepare(`
        UPDATE admins SET 
          store_name = ?, store_id = ?, slug = ?, whatsapp = ?, logo = ?,
          store_is_active = 1, dashboard_is_active = 1, updated_at = ?
        WHERE id = ?
      `).bind(storeName || null, storeId || null, slug || null, whatsapp || null, logo || null, timestamp, userId).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO admins (id, email, store_name, store_id, slug, whatsapp, logo, store_is_active, dashboard_is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
      `).bind(userId, user.email, storeName || null, storeId || null, slug || null, whatsapp || null, logo || null, timestamp, timestamp).run();
    }

    const admin = await env.DB.prepare(`SELECT * FROM admins WHERE id = ?`).bind(userId).first<DBAdmin>();
    return jsonResponse(formatAdmin(admin!));
  } catch (error) {
    console.error('Error creating admin profile:', error);
    return errorResponse('Error creating profile', 500);
  }
}

async function updateAdminProfile(env: Env, userId: string, data: AdminInput): Promise<Response> {
  try {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.storeName !== undefined) { updates.push('store_name = ?'); values.push(data.storeName); }
    if (data.whatsapp !== undefined) { updates.push('whatsapp = ?'); values.push(data.whatsapp); }
    if (data.logo !== undefined) { updates.push('logo = ?'); values.push(data.logo); }
    if (data.whatsappApiKey !== undefined) { updates.push('whatsapp_api_key = ?'); values.push(data.whatsappApiKey); }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(userId);

    await env.DB.prepare(`UPDATE admins SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    const admin = await env.DB.prepare(`SELECT * FROM admins WHERE id = ?`).bind(userId).first<DBAdmin>();
    return jsonResponse(formatAdmin(admin!));
  } catch (error) {
    console.error('Error updating admin profile:', error);
    return errorResponse('Error updating profile', 500);
  }
}

async function getAdminStats(env: Env, userId: string): Promise<Response> {
  try {
    const productsCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM products WHERE store_id = ?`).bind(userId).first<{ count: number }>();
    const categoriesCount = await env.DB.prepare(`SELECT COUNT(*) as count FROM categories WHERE store_id = ?`).bind(userId).first<{ count: number }>();

    return jsonResponse({
      products: productsCount?.count || 0,
      categories: categoriesCount?.count || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return errorResponse('Error fetching stats', 500);
  }
}

async function updateLastLogin(env: Env, userId: string): Promise<Response> {
  try {
    await env.DB.prepare(`UPDATE admins SET last_login = ?, updated_at = ? WHERE id = ?`).bind(now(), now(), userId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating last login:', error);
    return errorResponse('Error updating last login', 500);
  }
}


async function getAllSubscribers(env: Env): Promise<Response> {
  try {
    const subscribers = await env.DB.prepare(`
      SELECT a.*, s.name as store_display_name, s.is_active as store_active
      FROM admins a LEFT JOIN stores s ON a.store_id = s.id
      ORDER BY a.created_at DESC
    `).all<DBAdmin>();

    return jsonResponse(subscribers.results.map(formatAdmin));
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    return errorResponse('Error fetching subscribers', 500);
  }
}

async function updateStoreStatus(env: Env, subscriberId: string, data: { isActive: boolean }): Promise<Response> {
  try {
    const { isActive } = data;
    const timestamp = now();

    const admin = await env.DB.prepare(`SELECT store_id FROM admins WHERE id = ?`).bind(subscriberId).first<{ store_id: string | null }>();
    if (!admin) return errorResponse('Subscriber not found', 404);

    if (admin.store_id) {
      await env.DB.prepare(`UPDATE stores SET is_active = ?, updated_at = ? WHERE id = ?`).bind(isActive ? 1 : 0, timestamp, admin.store_id).run();
    }
    await env.DB.prepare(`UPDATE admins SET store_is_active = ?, updated_at = ? WHERE id = ?`).bind(isActive ? 1 : 0, timestamp, subscriberId).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating store status:', error);
    return errorResponse('Error updating store status', 500);
  }
}

async function updateDashboardStatus(env: Env, subscriberId: string, data: { isActive: boolean }): Promise<Response> {
  try {
    await env.DB.prepare(`UPDATE admins SET dashboard_is_active = ?, updated_at = ? WHERE id = ?`).bind(data.isActive ? 1 : 0, now(), subscriberId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating dashboard status:', error);
    return errorResponse('Error updating dashboard status', 500);
  }
}

async function updateHideUpgradeUI(env: Env, subscriberId: string, data: { hide: boolean }): Promise<Response> {
  try {
    await env.DB.prepare(`UPDATE admins SET hide_upgrade_ui = ?, updated_at = ? WHERE id = ?`).bind(data.hide ? 1 : 0, now(), subscriberId).run();
    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating hide upgrade UI:', error);
    return errorResponse('Error updating hide upgrade UI', 500);
  }
}

async function deleteSubscriber(env: Env, subscriberId: string): Promise<Response> {
  try {
    const admin = await env.DB.prepare(`SELECT store_id FROM admins WHERE id = ?`).bind(subscriberId).first<{ store_id: string | null }>();
    if (!admin) return errorResponse('Subscriber not found', 404);

    const productsDeleted = await env.DB.prepare(`DELETE FROM products WHERE store_id = ?`).bind(subscriberId).run();
    const categoriesDeleted = await env.DB.prepare(`DELETE FROM categories WHERE store_id = ?`).bind(subscriberId).run();
    if (admin.store_id) await env.DB.prepare(`DELETE FROM stores WHERE id = ?`).bind(admin.store_id).run();
    await env.DB.prepare(`DELETE FROM admins WHERE id = ?`).bind(subscriberId).run();

    return jsonResponse({ success: true, deleted: { products: productsDeleted.meta?.changes || 0, categories: categoriesDeleted.meta?.changes || 0 } });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    return errorResponse('Error deleting subscriber', 500);
  }
}

async function getGlobalStats(env: Env): Promise<Response> {
  try {
    const totalAdmins = await env.DB.prepare(`SELECT COUNT(*) as count FROM admins`).first<{ count: number }>();
    const activeSubscriptions = await env.DB.prepare(`SELECT COUNT(*) as count FROM admins WHERE subscription_end > datetime('now')`).first<{ count: number }>();
    const expiredSubscriptions = await env.DB.prepare(`SELECT COUNT(*) as count FROM admins WHERE subscription_end <= datetime('now') OR subscription_end IS NULL`).first<{ count: number }>();
    const totalProducts = await env.DB.prepare(`SELECT COUNT(*) as count FROM products`).first<{ count: number }>();
    const totalStores = await env.DB.prepare(`SELECT COUNT(*) as count FROM stores`).first<{ count: number }>();

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

function formatAdmin(admin: DBAdmin) {
  return {
    id: admin.id, email: admin.email, storeName: admin.store_name, storeId: admin.store_id,
    slug: admin.slug, whatsapp: admin.whatsapp, whatsappApiKey: admin.whatsapp_api_key || null,
    logo: admin.logo, subscriptionCode: admin.subscription_code, subscriptionStart: admin.subscription_start,
    subscriptionEnd: admin.subscription_end, subscriptionMonths: admin.subscription_months,
    planId: admin.plan_id, isTrial: admin.is_trial === 1, trialUsed: admin.trial_used === 1,
    dashboardIsActive: admin.dashboard_is_active === 1, storeIsActive: admin.store_is_active === 1,
    hideUpgradeUI: admin.hide_upgrade_ui === 1, codeHistory: admin.code_history ? JSON.parse(admin.code_history) : [],
    lastLogin: admin.last_login, createdAt: admin.created_at, updatedAt: admin.updated_at
  };
}
