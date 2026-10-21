/**
 * Pagination Utility
 * نظام التصفح للقوائم الكبيرة
 */

import type { PaginationParams, PaginatedResponse } from '../types';

// الإعدادات الافتراضية
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

interface FilterValues {
  whereClause: string;
  values: unknown[];
}

interface Filters {
  categoryId?: string;
  status?: string;
  inStock?: boolean;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
}

/**
 * استخراج معاملات التصفح من الـ URL
 */
export function getPaginationParams(url: URL): PaginationParams {
  const params = url.searchParams;
  
  // الصفحة الحالية (تبدأ من 1)
  let page = parseInt(params.get('page') || '1', 10);
  if (isNaN(page) || page < 1) page = 1;
  
  // عدد العناصر في الصفحة
  let limit = parseInt(params.get('limit') || String(DEFAULT_PAGE_SIZE), 10);
  if (isNaN(limit) || limit < 1) limit = DEFAULT_PAGE_SIZE;
  if (limit > MAX_PAGE_SIZE) limit = MAX_PAGE_SIZE;
  
  // حساب الـ offset
  const offset = (page - 1) * limit;
  
  // الترتيب
  const sortBy = params.get('sortBy') || 'created_at';
  const sortOrderParam = (params.get('sortOrder') || 'desc').toUpperCase();
  const sortOrder = (['ASC', 'DESC'].includes(sortOrderParam) ? sortOrderParam : 'DESC') as 'ASC' | 'DESC';
  
  // البحث
  const search = params.get('search') || params.get('q') || '';
  
  // الفلاتر
  const filters: Filters = {};
  
  // فلتر الفئة
  const categoryId = params.get('categoryId') || params.get('category');
  if (categoryId) filters.categoryId = categoryId;
  
  // فلتر الحالة
  const status = params.get('status');
  if (status) filters.status = status;
  
  // فلتر التوفر
  const inStock = params.get('inStock');
  if (inStock !== null && inStock !== undefined) {
    filters.inStock = inStock === 'true' || inStock === '1';
  }
  
  // فلتر التاريخ
  const dateFrom = params.get('dateFrom') || params.get('from');
  const dateTo = params.get('dateTo') || params.get('to');
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;
  
  // فلتر السعر
  const priceMin = params.get('priceMin') || params.get('minPrice');
  const priceMax = params.get('priceMax') || params.get('maxPrice');
  if (priceMin) filters.priceMin = parseFloat(priceMin);
  if (priceMax) filters.priceMax = parseFloat(priceMax);
  
  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
    search: search.trim(),
    filters: filters as Record<string, unknown>,
  };
}

/**
 * بناء response مع معلومات التصفح
 */
export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams): PaginatedResponse<T> {
  const { page, limit } = params;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
}

/**
 * بناء WHERE clause للفلاتر
 */
export function buildWhereClause(
  filters: Filters, 
  columnMap: Record<string, string> = {}
): FilterValues {
  const conditions: string[] = [];
  const values: unknown[] = [];
  
  // فلتر الفئة
  if (filters.categoryId) {
    const col = columnMap.categoryId || 'category_id';
    conditions.push(`${col} = ?`);
    values.push(filters.categoryId);
  }
  
  // فلتر الحالة
  if (filters.status) {
    const col = columnMap.status || 'status';
    conditions.push(`${col} = ?`);
    values.push(filters.status);
  }
  
  // فلتر التوفر
  if (filters.inStock !== undefined) {
    const col = columnMap.inStock || 'in_stock';
    conditions.push(`${col} = ?`);
    values.push(filters.inStock ? 1 : 0);
  }
  
  // فلتر التاريخ
  if (filters.dateFrom) {
    const col = columnMap.createdAt || 'created_at';
    conditions.push(`${col} >= ?`);
    values.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    const col = columnMap.createdAt || 'created_at';
    conditions.push(`${col} <= ?`);
    values.push(filters.dateTo);
  }
  
  // فلتر السعر
  if (filters.priceMin !== undefined && !isNaN(filters.priceMin)) {
    const col = columnMap.price || 'price';
    conditions.push(`${col} >= ?`);
    values.push(filters.priceMin);
  }
  if (filters.priceMax !== undefined && !isNaN(filters.priceMax)) {
    const col = columnMap.price || 'price';
    conditions.push(`${col} <= ?`);
    values.push(filters.priceMax);
  }
  
  return {
    whereClause: conditions.length > 0 ? conditions.join(' AND ') : '',
    values,
  };
}

/**
 * التحقق من صحة اسم العمود للترتيب (لمنع SQL injection)
 */
export function validateSortColumn(column: string | null, allowedColumns: string[]): string {
  const defaultColumn = 'created_at';
  if (!column) return defaultColumn;
  
  // تحويل camelCase إلى snake_case
  const snakeCase = column.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  return allowedColumns.includes(snakeCase) ? snakeCase : defaultColumn;
}
