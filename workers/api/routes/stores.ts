/**
 * Stores API Routes
 */

import type { Env, AuthenticatedRequest, DBStore } from '../types';
import { jsonResponse, errorResponse, parseBody, now } from '../utils/helpers';
import { getUserId } from '../utils/auth';
import { validateName, validateSlug } from '../utils/validator';

const RESERVED_SLUGS = new Set(['demo', 'admin', 'api', 'www', 'store', 'assets', 'static']);

interface StoreInput {
  name?: string;
  slug?: string;
  whatsapp?: string;
  logo?: string;
  currency?: string;
  isActive?: boolean;
}

interface FormattedStore {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  logo: string | null;
  ownerId: string;
  theme: unknown;
  currency: string;
  location: unknown;
  announcement: unknown;
  socialLinks: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function handleStores(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const userId = getUserId(request);

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  if (method === 'GET' && path === '/api/stores') {
    return getUserStore(env, userId);
  }

  if (method === 'GET' && path.match(/^\/api\/stores\/[\w-]+$/)) {
    const storeId = path.split('/').pop()!;
    return getStoreById(env, storeId, userId);
  }

  if (method === 'POST' && path === '/api/stores') {
    const body = await parseBody<StoreInput>(request);
    return createStore(env, userId, body);
  }


  if (method === 'PUT' && path.match(/^\/api\/stores\/[\w-]+$/)) {
    const storeId = path.split('/').pop()!;
    const body = await parseBody<StoreInput>(request);
    return updateStore(env, storeId, userId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/stores\/[\w-]+\/theme$/)) {
    const storeId = path.split('/')[3];
    const body = await parseBody<unknown>(request);
    return updateStoreTheme(env, storeId, userId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/stores\/[\w-]+\/announcement$/)) {
    const storeId = path.split('/')[3];
    const body = await parseBody<unknown>(request);
    return updateStoreAnnouncement(env, storeId, userId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/stores\/[\w-]+\/location$/)) {
    const storeId = path.split('/')[3];
    const body = await parseBody<unknown>(request);
    return updateStoreLocation(env, storeId, userId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/stores\/[\w-]+\/social-links$/)) {
    const storeId = path.split('/')[3];
    const body = await parseBody<unknown>(request);
    return updateStoreSocialLinks(env, storeId, userId, body);
  }

  if (method === 'DELETE' && path.match(/^\/api\/stores\/[\w-]+$/)) {
    const storeId = path.split('/').pop()!;
    return deleteStore(env, storeId, userId);
  }

  return errorResponse('Not Found', 404);
}

async function getUserStore(env: Env, userId: string): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT * FROM stores WHERE owner_id = ?
    `).bind(userId).first<DBStore>();

    if (!store) {
      return jsonResponse(null);
    }

    return jsonResponse(formatStore(store));
  } catch (error) {
    console.error('Error fetching user store:', error);
    return errorResponse('Error fetching store', 500);
  }
}

async function getStoreById(env: Env, storeId: string, userId: string): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT * FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<DBStore>();

    if (!store) {
      return errorResponse('Store not found', 404);
    }

    return jsonResponse(formatStore(store));
  } catch (error) {
    console.error('Error fetching store:', error);
    return errorResponse('Error fetching store', 500);
  }
}


async function createStore(env: Env, userId: string, data: StoreInput): Promise<Response> {
  try {
    const { name, slug, whatsapp, logo } = data;

    if (!name || !slug) {
      return errorResponse('Name and slug are required', 400);
    }

    const existing = await env.DB.prepare(`
      SELECT id FROM stores WHERE slug = ?
    `).bind(slug).first<{ id: string }>();

    if (existing) {
      return errorResponse('Slug already exists', 400);
    }

    const storeId = slug;
    const timestamp = now();

    await env.DB.prepare(`
      INSERT INTO stores (id, slug, name, whatsapp, logo, owner_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(storeId, slug, name, whatsapp || null, logo || null, userId, timestamp, timestamp).run();

    await env.DB.prepare(`
      UPDATE admins SET store_id = ?, store_name = ?, slug = ?, whatsapp = ?, logo = ?, updated_at = ?
      WHERE id = ?
    `).bind(storeId, name, slug, whatsapp || null, logo || null, timestamp, userId).run();

    const store = await env.DB.prepare(`
      SELECT * FROM stores WHERE id = ?
    `).bind(storeId).first<DBStore>();

    return jsonResponse(formatStore(store!), 201);
  } catch (error) {
    console.error('Error creating store:', error);
    return errorResponse('Error creating store', 500);
  }
}

export async function updateStore(env: Env, storeId: string, userId: string, data: StoreInput): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT * FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<DBStore>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    let nextName = store.name;
    if (data.name !== undefined) {
      const name = validateName(data.name, 'اسم المتجر');
      if (!name.valid || !name.value) return errorResponse(name.error ?? 'اسم المتجر غير صالح', 400);
      nextName = name.value;
    }

    let nextSlug = store.slug;
    if (data.slug !== undefined) {
      const slug = validateSlug(data.slug, 'رابط المتجر');
      if (!slug.valid || !slug.value) return errorResponse(slug.error ?? 'رابط المتجر غير صالح', 400);
      // Reject silently rewritten input (uppercase/spaces) instead of saving a
      // different slug than the merchant typed.
      if (String(data.slug).trim() !== slug.value) return errorResponse('رابط المتجر يجب أن يكون بأحرف إنجليزية صغيرة وأرقام وشرطات فقط', 400);
      if (RESERVED_SLUGS.has(slug.value)) return errorResponse('هذا الرابط محجوز. اختر اسماً آخر.', 409);
      nextSlug = slug.value;
    }

    if (nextSlug !== store.slug) {
      // Never let a rename shadow another store's immutable id or an alias
      // owned by a different store. Current slugs and ids take precedence on read.
      const conflict = await env.DB.prepare(`
        SELECT 1 AS taken FROM stores WHERE (slug = ? OR id = ?) AND id <> ?
        LIMIT 1
      `).bind(nextSlug, nextSlug, store.id).first<{ taken: number }>();
      if (conflict) return errorResponse('رابط المتجر مستخدم بالفعل', 409);
      try {
        const aliasConflict = await env.DB.prepare(`
          SELECT 1 AS taken FROM store_slug_aliases WHERE alias = ? AND store_id <> ? LIMIT 1
        `).bind(nextSlug, store.id).first<{ taken: number }>();
        if (aliasConflict) return errorResponse('رابط المتجر مستخدم بالفعل', 409);
      } catch {
        // Legacy databases without the alias table still get the stores check.
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(nextName);
    }
    if (data.slug !== undefined && nextSlug !== store.slug) {
      updates.push('slug = ?');
      values.push(nextSlug);
    }
    if (data.whatsapp !== undefined) {
      updates.push('whatsapp = ?');
      values.push(data.whatsapp);
    }
    if (data.logo !== undefined) {
      updates.push('logo = ?');
      values.push(data.logo);
    }
    if (data.currency !== undefined) {
      updates.push('currency = ?');
      values.push(data.currency);
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    const timestamp = now();
    updates.push('updated_at = ?');
    values.push(timestamp);
    values.push(store.id);

    const statements = [
      env.DB.prepare(`UPDATE stores SET ${updates.join(', ')} WHERE id = ?`).bind(...values),
    ];
    // Dashboard reads admins.store_name/slug; sync them in the same atomic batch.
    if (nextName !== store.name || nextSlug !== store.slug) {
      statements.push(env.DB.prepare(`
        UPDATE admins SET store_name = ?, slug = ?, updated_at = ? WHERE id = ?
      `).bind(nextName, nextSlug, timestamp, userId));
    }
    await env.DB.batch(statements);

    const updated = await env.DB.prepare(`
      SELECT * FROM stores WHERE id = ?
    `).bind(store.id).first<DBStore>();

    return jsonResponse(formatStore(updated!));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/UNIQUE constraint failed/i.test(message)) return errorResponse('رابط المتجر مستخدم بالفعل', 409);
    console.error('Error updating store:', error);
    return errorResponse('Error updating store', 500);
  }
}


async function updateStoreTheme(env: Env, storeId: string, userId: string, theme: unknown): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT id FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<{ id: string }>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      UPDATE stores SET theme = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(theme), now(), store.id).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating theme:', error);
    return errorResponse('Error updating theme', 500);
  }
}

async function updateStoreAnnouncement(env: Env, storeId: string, userId: string, announcement: unknown): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT id FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<{ id: string }>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      UPDATE stores SET announcement = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(announcement), now(), store.id).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return errorResponse('Error updating announcement', 500);
  }
}

async function updateStoreLocation(env: Env, storeId: string, userId: string, location: unknown): Promise<Response> {
  if (!location || typeof location !== 'object' || Array.isArray(location)) return errorResponse('بيانات الموقع غير صالحة', 400);
  const data = location as Record<string, unknown>;
  const lat = data.lat ?? data.latitude;
  const lng = data.lng ?? data.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return errorResponse('إحداثيات الموقع غير صالحة', 400);
  if (data.enabled !== undefined && typeof data.enabled !== 'boolean') return errorResponse('حالة ظهور الموقع غير صالحة', 400);
  for (const [key, limit] of [['address', 500], ['description', 200]] as const) {
    if (data[key] != null && (typeof data[key] !== 'string' || (data[key] as string).length > limit)) return errorResponse('نص الموقع غير صالح أو طويل جداً', 400);
  }
  const normalizedLocation = { ...data, lat, lng };
  try {
    const store = await env.DB.prepare(`
      SELECT id FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<{ id: string }>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      UPDATE stores SET location = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(normalizedLocation), now(), store.id).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating location:', error);
    return errorResponse('Error updating location', 500);
  }
}

async function updateStoreSocialLinks(env: Env, storeId: string, userId: string, socialLinks: unknown): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT id FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<{ id: string }>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      UPDATE stores SET social_links = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(socialLinks), now(), store.id).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error updating social links:', error);
    return errorResponse('Error updating social links', 500);
  }
}

async function deleteStore(env: Env, storeId: string, userId: string): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT id FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<{ id: string }>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    await env.DB.prepare(`DELETE FROM products WHERE store_id = ?`).bind(userId).run();
    await env.DB.prepare(`DELETE FROM categories WHERE store_id = ?`).bind(userId).run();
    await env.DB.prepare(`DELETE FROM stores WHERE id = ?`).bind(store.id).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting store:', error);
    return errorResponse('Error deleting store', 500);
  }
}

function formatStore(store: DBStore): FormattedStore {
  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    whatsapp: store.whatsapp,
    logo: store.logo,
    ownerId: store.owner_id,
    theme: store.theme ? JSON.parse(store.theme) : null,
    currency: store.currency,
    location: store.location ? JSON.parse(store.location) : null,
    announcement: store.announcement ? JSON.parse(store.announcement) : null,
    socialLinks: store.social_links ? JSON.parse(store.social_links) : null,
    isActive: store.is_active === 1,
    createdAt: store.created_at,
    updatedAt: store.updated_at
  };
}
