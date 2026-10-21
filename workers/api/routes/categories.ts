/**
 * Categories API Routes
 */

import type { Env, AuthenticatedRequest, DBCategory } from '../types';
import { jsonResponse, errorResponse, parseBody, generateId, now } from '../utils/helpers';
import { getUserId } from '../utils/auth';

interface CategoryInput {
  name?: string;
  description?: string;
  sortOrder?: number;
}

interface DBCategoryWithCount extends DBCategory {
  product_count?: number;
}

export async function handleCategories(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const userId = getUserId(request);

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  if (method === 'GET' && path === '/api/categories') {
    return getUserCategories(env, userId);
  }

  if (method === 'GET' && path.match(/^\/api\/categories\/[\w-]+$/)) {
    const categoryId = path.split('/').pop()!;
    return getCategoryById(env, categoryId, userId);
  }

  if (method === 'POST' && path === '/api/categories') {
    const body = await parseBody<CategoryInput>(request);
    return createCategory(env, userId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/categories\/[\w-]+$/)) {
    const categoryId = path.split('/').pop()!;
    const body = await parseBody<CategoryInput>(request);
    return updateCategory(env, categoryId, userId, body);
  }

  if (method === 'DELETE' && path.match(/^\/api\/categories\/[\w-]+$/)) {
    const categoryId = path.split('/').pop()!;
    return deleteCategory(env, categoryId, userId);
  }

  return errorResponse('Not Found', 404);
}


async function getUserCategories(env: Env, userId: string): Promise<Response> {
  try {
    const categories = await env.DB.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.store_id = c.store_id
      WHERE c.store_id = ?
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).bind(userId).all<DBCategoryWithCount>();

    const formattedCategories = categories.results.map(formatCategory);
    return jsonResponse(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return errorResponse('Error fetching categories', 500);
  }
}

async function getCategoryById(env: Env, categoryId: string, userId: string): Promise<Response> {
  try {
    const category = await env.DB.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.store_id = c.store_id
      WHERE c.id = ? AND c.store_id = ?
      GROUP BY c.id
    `).bind(categoryId, userId).first<DBCategoryWithCount>();

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return jsonResponse(formatCategory(category));
  } catch (error) {
    console.error('Error fetching category:', error);
    return errorResponse('Error fetching category', 500);
  }
}

async function createCategory(env: Env, userId: string, data: CategoryInput): Promise<Response> {
  try {
    const { name, description, sortOrder } = data;

    if (!name) {
      return errorResponse('Category name is required', 400);
    }

    const categoryId = generateId();
    const timestamp = now();

    const maxOrder = await env.DB.prepare(`
      SELECT MAX(sort_order) as max_order FROM categories WHERE store_id = ?
    `).bind(userId).first<{ max_order: number | null }>();

    const newSortOrder = sortOrder !== undefined ? sortOrder : (maxOrder?.max_order || 0) + 1;

    await env.DB.prepare(`
      INSERT INTO categories (id, store_id, name, description, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(categoryId, userId, name, description || null, newSortOrder, timestamp, timestamp).run();

    const category = await env.DB.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(categoryId).first<DBCategory>();

    return jsonResponse(formatCategory(category!), 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return errorResponse('Error creating category', 500);
  }
}


async function updateCategory(
  env: Env,
  categoryId: string,
  userId: string,
  data: CategoryInput
): Promise<Response> {
  try {
    const category = await env.DB.prepare(`
      SELECT * FROM categories WHERE id = ? AND store_id = ?
    `).bind(categoryId, userId).first<DBCategory>();

    if (!category) {
      return errorResponse('Category not found or unauthorized', 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.sortOrder !== undefined) {
      updates.push('sort_order = ?');
      values.push(data.sortOrder);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(categoryId);

    await env.DB.prepare(`
      UPDATE categories SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    const updated = await env.DB.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(categoryId).first<DBCategory>();

    return jsonResponse(formatCategory(updated!));
  } catch (error) {
    console.error('Error updating category:', error);
    return errorResponse('Error updating category', 500);
  }
}

async function deleteCategory(env: Env, categoryId: string, userId: string): Promise<Response> {
  try {
    const category = await env.DB.prepare(`
      SELECT id FROM categories WHERE id = ? AND store_id = ?
    `).bind(categoryId, userId).first<{ id: string }>();

    if (!category) {
      return errorResponse('Category not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      UPDATE products SET category_id = NULL WHERE category_id = ? AND store_id = ?
    `).bind(categoryId, userId).run();

    await env.DB.prepare(`
      DELETE FROM categories WHERE id = ?
    `).bind(categoryId).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return errorResponse('Error deleting category', 500);
  }
}

function formatCategory(category: DBCategoryWithCount) {
  return {
    id: category.id,
    storeId: category.store_id,
    name: category.name,
    description: category.description,
    sortOrder: category.sort_order,
    productCount: category.product_count || 0,
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
}
