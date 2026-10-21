/**
 * Products API Routes
 */

import type { Env, AuthenticatedRequest, DBProduct } from '../types';
import { jsonResponse, errorResponse, parseBody, generateId, now } from '../utils/helpers';
import { getUserId } from '../utils/auth';
import { getPaginationParams, paginatedResponse, buildWhereClause, validateSortColumn } from '../utils/pagination';
import { validateProductInput } from '../utils/validator';
import { invalidateProducts } from '../utils/cache';

const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'name', 'price', 'discount'];

interface ProductInput {
  name?: string;
  price?: number;
  description?: string;
  images?: string[];
  categoryId?: string;
  colors?: string[];
  sizes?: string[];
  discount?: number;
  inStock?: boolean;
}

interface FormattedProduct {
  id: string;
  storeId: string;
  name: string;
  price: number;
  description: string | null;
  images: string[];
  categoryId: string | null;
  colors: string[];
  sizes: string[];
  discount: number;
  inStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function handleProducts(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const userId = getUserId(request);
  const url = new URL(request.url);

  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }


  if (method === 'GET' && path === '/api/products') {
    return getUserProducts(env, userId, url);
  }

  if (method === 'GET' && path.match(/^\/api\/products\/[\w-]+$/)) {
    const productId = path.split('/').pop()!;
    return getProductById(env, productId, userId);
  }

  if (method === 'POST' && path === '/api/products') {
    const body = await parseBody<ProductInput>(request);
    return createProduct(env, userId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/products\/[\w-]+$/)) {
    const productId = path.split('/').pop()!;
    const body = await parseBody<ProductInput>(request);
    return updateProduct(env, productId, userId, body);
  }

  if (method === 'DELETE' && path.match(/^\/api\/products\/[\w-]+$/)) {
    const productId = path.split('/').pop()!;
    return deleteProduct(env, productId, userId);
  }

  return errorResponse('Not Found', 404);
}

async function getUserProducts(env: Env, userId: string, url: URL): Promise<Response> {
  try {
    const params = getPaginationParams(url);
    const { limit, offset, sortBy, sortOrder, search, filters } = params;
    
    const validSortBy = validateSortColumn(sortBy, ALLOWED_SORT_COLUMNS);
    const { whereClause, values: filterValues } = buildWhereClause(filters as Record<string, unknown>);
    
    let searchClause = '';
    const searchValues: string[] = [];
    if (search) {
      searchClause = '(name LIKE ? OR description LIKE ?)';
      searchValues.push(`%${search}%`, `%${search}%`);
    }
    
    let fullWhere = 'store_id = ?';
    const allValues: unknown[] = [userId];
    
    if (whereClause) {
      fullWhere += ` AND ${whereClause}`;
      allValues.push(...filterValues);
    }
    
    if (searchClause) {
      fullWhere += ` AND ${searchClause}`;
      allValues.push(...searchValues);
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM products WHERE ${fullWhere}`;
    const countResult = await env.DB.prepare(countQuery).bind(...allValues).first<{ total: number }>();
    const total = countResult?.total || 0;
    
    const dataQuery = `
      SELECT * FROM products 
      WHERE ${fullWhere}
      ORDER BY ${validSortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const products = await env.DB.prepare(dataQuery)
      .bind(...allValues, limit, offset)
      .all<DBProduct>();

    const formattedProducts = products.results.map(formatProduct);
    
    return jsonResponse(paginatedResponse(formattedProducts, total, params));
  } catch (error) {
    console.error('Error fetching products:', error);
    return errorResponse('Error fetching products', 500);
  }
}


async function getProductById(env: Env, productId: string, userId: string): Promise<Response> {
  try {
    const product = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ? AND store_id = ?
    `).bind(productId, userId).first<DBProduct>();

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    return jsonResponse(formatProduct(product));
  } catch (error) {
    console.error('Error fetching product:', error);
    return errorResponse('Error fetching product', 500);
  }
}

async function createProduct(env: Env, userId: string, data: ProductInput): Promise<Response> {
  try {
    const validation = validateProductInput(data, false);
    
    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }
    
    const { name, price, description, images, categoryId, colors, sizes, discount, inStock } = validation.data;

    const productId = generateId();
    const timestamp = now();

    await env.DB.prepare(`
      INSERT INTO products (
        id, store_id, name, price, description, images, category_id, 
        colors, sizes, discount, in_stock, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      productId,
      userId,
      name || '',
      price || 0,
      description || null,
      images ? JSON.stringify(images) : '[]',
      categoryId || null,
      colors ? JSON.stringify(colors) : '[]',
      sizes ? JSON.stringify(sizes) : '[]',
      discount || 0,
      inStock !== false ? 1 : 0,
      timestamp,
      timestamp
    ).run();

    const product = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ?
    `).bind(productId).first<DBProduct>();

    const store = await env.DB.prepare(`SELECT slug FROM stores WHERE owner_id = ?`).bind(userId).first<{ slug: string }>();
    await invalidateProducts(userId, store?.slug);

    return jsonResponse(formatProduct(product!), 201);
  } catch (error) {
    console.error('Error creating product:', error);
    return errorResponse('Error creating product', 500);
  }
}


async function updateProduct(
  env: Env,
  productId: string,
  userId: string,
  data: ProductInput
): Promise<Response> {
  try {
    const product = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ? AND store_id = ?
    `).bind(productId, userId).first<DBProduct>();

    if (!product) {
      return errorResponse('Product not found or unauthorized', 404);
    }

    const validation = validateProductInput(data, true);
    
    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }
    
    const validatedData = validation.data;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (validatedData.name !== undefined) {
      updates.push('name = ?');
      values.push(validatedData.name);
    }
    if (validatedData.price !== undefined) {
      updates.push('price = ?');
      values.push(validatedData.price);
    }
    if (validatedData.description !== undefined) {
      updates.push('description = ?');
      values.push(validatedData.description);
    }
    if (validatedData.images !== undefined) {
      updates.push('images = ?');
      values.push(JSON.stringify(validatedData.images));
    }
    if (validatedData.categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(validatedData.categoryId);
    }
    if (validatedData.colors !== undefined) {
      updates.push('colors = ?');
      values.push(JSON.stringify(validatedData.colors));
    }
    if (validatedData.sizes !== undefined) {
      updates.push('sizes = ?');
      values.push(JSON.stringify(validatedData.sizes));
    }
    if (validatedData.discount !== undefined) {
      updates.push('discount = ?');
      values.push(validatedData.discount);
    }
    if (validatedData.inStock !== undefined) {
      updates.push('in_stock = ?');
      values.push(validatedData.inStock ? 1 : 0);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(now());
    values.push(productId);

    await env.DB.prepare(`
      UPDATE products SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    const updated = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ?
    `).bind(productId).first<DBProduct>();

    const store = await env.DB.prepare(`SELECT slug FROM stores WHERE owner_id = ?`).bind(userId).first<{ slug: string }>();
    await invalidateProducts(userId, store?.slug);

    return jsonResponse(formatProduct(updated!));
  } catch (error) {
    console.error('Error updating product:', error);
    return errorResponse('Error updating product', 500);
  }
}


async function deleteProduct(env: Env, productId: string, userId: string): Promise<Response> {
  try {
    const product = await env.DB.prepare(`
      SELECT id, images FROM products WHERE id = ? AND store_id = ?
    `).bind(productId, userId).first<{ id: string; images: string | null }>();

    if (!product) {
      return errorResponse('Product not found or unauthorized', 404);
    }

    await env.DB.prepare(`
      DELETE FROM products WHERE id = ?
    `).bind(productId).run();

    const store = await env.DB.prepare(`SELECT slug FROM stores WHERE owner_id = ?`).bind(userId).first<{ slug: string }>();
    await invalidateProducts(userId, store?.slug);

    const images = product.images ? JSON.parse(product.images) : [];
    return jsonResponse({ success: true, deletedImages: images });
  } catch (error) {
    console.error('Error deleting product:', error);
    return errorResponse('Error deleting product', 500);
  }
}

function formatProduct(product: DBProduct): FormattedProduct {
  return {
    id: product.id,
    storeId: product.store_id,
    name: product.name,
    price: product.price,
    description: product.description,
    images: product.images ? JSON.parse(product.images) : [],
    categoryId: product.category_id,
    colors: product.colors ? JSON.parse(product.colors) : [],
    sizes: product.sizes ? JSON.parse(product.sizes) : [],
    discount: product.discount,
    inStock: product.in_stock === 1,
    createdAt: product.created_at,
    updatedAt: product.updated_at
  };
}
