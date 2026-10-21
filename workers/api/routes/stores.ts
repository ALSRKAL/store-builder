/**
 * Stores API Routes
 */

import type { Env, AuthenticatedRequest, DBStore } from '../types';
import { jsonResponse, errorResponse, parseBody, now } from '../utils/helpers';
import { getUserId } from '../utils/auth';

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

async function updateStore(env: Env, storeId: string, userId: string, data: StoreInput): Promise<Response> {
  try {
    const store = await env.DB.prepare(`
      SELECT * FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<DBStore>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
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

    updates.push('updated_at = ?');
    values.push(now());
    values.push(store.id);

    await env.DB.prepare(`
      UPDATE stores SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    const updated = await env.DB.prepare(`
      SELECT * FROM stores WHERE id = ?
    `).bind(store.id).first<DBStore>();

    return jsonResponse(formatStore(updated!));
  } catch (error) {
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
  try {
    const store = await env.DB.prepare(`
      SELECT id FROM stores WHERE (id = ? OR slug = ?) AND owner_id = ?
    `).bind(storeId, storeId, userId).first<{ id: string }>();

    if (!store) {
      return errorResponse('Store not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      UPDATE stores SET location = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(location), now(), store.id).run();

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
