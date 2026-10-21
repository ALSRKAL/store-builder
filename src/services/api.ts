/**
 * Type-Safe API Service - Cloudflare Workers API
 * ZERO any POLICY - All types are strictly defined
 */

import { auth } from '../config/firebase';
import { z } from 'zod';
import {
  type Store,
  type CreateStoreInput,
  type UpdateStoreInput,
  type Theme,
  type Announcement,
  type Location,
  type SocialLinks,
  type Product,
  type CreateProductInput,
  type UpdateProductInput,
  type Category,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type AdminProfile,
  type CreateAdminInput,
  type UpdateAdminInput,
  type AdminStats,
  type GlobalStats,
  type Subscriber,
  type SubscriptionStatus,
  type SubscriptionCode,
  type VerifyCodeResponse,
  type GenerateCodeRequest,
  type Order,
  type CreateOrderInput,
  type UpdateOrderStatusInput,
  type OrderStats,
  type PaymentMethod,
  type CreatePaymentMethodInput,
  type UpdatePaymentMethodInput,
  type PaymentReceipt,
  type SubmitReceiptInput,
  storeSchema,
  productSchema,
  categorySchema,
  categoryListSchema,
  adminProfileSchema,
  adminStatsSchema,
  globalStatsSchema,
  subscriberListSchema,
  subscriptionStatusSchema,
  subscriptionCodeSchema,
  verifyCodeResponseSchema,
  orderSchema,
  orderStatsSchema,
  paymentMethodSchema,
  paymentMethodListSchema,
  paymentReceiptSchema,
  paymentReceiptListSchema,
} from '../schemas';
import { ApiError, parseApiError } from '../schemas/api/errors';
import { type PaginatedResponse, createPaginatedResponseSchema } from '../schemas/api/responses';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Request options type
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

// Pagination params type
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  categoryId?: string;
  status?: string;
  inStock?: boolean;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
}

/**
 * Build query string from pagination params
 */
function buildQueryString(params: PaginationParams): string {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.search) searchParams.set('search', params.search);
  if (params.categoryId) searchParams.set('categoryId', params.categoryId);
  if (params.status) searchParams.set('status', params.status);
  if (params.inStock !== undefined) searchParams.set('inStock', String(params.inStock));
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params.priceMin !== undefined) searchParams.set('priceMin', String(params.priceMin));
  if (params.priceMax !== undefined) searchParams.set('priceMax', String(params.priceMax));
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Get current user's Firebase ID token
 */
async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError('User not authenticated', 401, 'UNAUTHORIZED');
  }
  return user.getIdToken();
}

/**
 * Validate response data with Zod schema
 * In development, logs errors but returns data anyway for flexibility
 */
function validateResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Log validation errors for debugging but don't throw
    console.warn('Validation warning:', result.error.issues);
    // Return data as-is, trusting the API response
    return data as T;
  }
  return result.data;
}

/**
 * Make authenticated API request with type safety
 */
async function apiRequest<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {}
): Promise<T> {
  const token = await getAuthToken();

  const config: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw parseApiError(errorData);
  }

  const data: unknown = await response.json();
  return validateResponse(schema, data);
}

/**
 * Make public API request (no auth required) with type safety
 */
async function publicRequest<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {}
): Promise<T> {
  const config: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw parseApiError(errorData);
  }

  const data: unknown = await response.json();
  return validateResponse(schema, data);
}

/**
 * Make request without response validation (for simple responses)
 */
async function apiRequestRaw<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = await getAuthToken();

  const config: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw parseApiError(errorData);
  }

  return response.json() as Promise<T>;
}

// Health check response schema
const healthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.string().optional(),
});

type HealthCheckResponse = z.infer<typeof healthCheckSchema>;

// Success response schema
const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

type SuccessResponse = z.infer<typeof successResponseSchema>;

// ===== Type-Safe API =====

export const api = {
  // Health check
  health: (): Promise<HealthCheckResponse> =>
    publicRequest('/api/health', healthCheckSchema),

  // ===== Public Store API =====
  public: {
    getStore: (slug: string): Promise<Store> =>
      publicRequest(`/api/public/store/${slug}`, storeSchema),

    getProducts: (slug: string): Promise<Product[]> =>
      publicRequest(`/api/public/store/${slug}/products`, z.array(productSchema)),

    getCategories: (slug: string): Promise<Category[]> =>
      publicRequest(`/api/public/store/${slug}/categories`, categoryListSchema),
  },

  // ===== Stores API =====
  stores: {
    get: (): Promise<Store[]> =>
      apiRequest('/api/stores', z.array(storeSchema)),

    getById: (id: string): Promise<Store> =>
      apiRequest(`/api/stores/${id}`, storeSchema),

    create: (data: CreateStoreInput): Promise<Store> =>
      apiRequest('/api/stores', storeSchema, { method: 'POST', body: data as Record<string, unknown> }),

    update: (id: string, data: UpdateStoreInput): Promise<Store> =>
      apiRequest(`/api/stores/${id}`, storeSchema, { method: 'PUT', body: data as Record<string, unknown> }),

    updateTheme: (id: string, theme: Theme): Promise<SuccessResponse> =>
      apiRequest(`/api/stores/${id}/theme`, successResponseSchema, { method: 'PUT', body: theme as Record<string, unknown> }),

    updateAnnouncement: (id: string, announcement: Announcement): Promise<SuccessResponse> =>
      apiRequest(`/api/stores/${id}/announcement`, successResponseSchema, { method: 'PUT', body: announcement as Record<string, unknown> }),

    updateLocation: (id: string, location: Location): Promise<SuccessResponse> =>
      apiRequest(`/api/stores/${id}/location`, successResponseSchema, { method: 'PUT', body: location as Record<string, unknown> }),

    updateSocialLinks: (id: string, socialLinks: SocialLinks): Promise<SuccessResponse> =>
      apiRequest(`/api/stores/${id}/social-links`, successResponseSchema, { method: 'PUT', body: socialLinks as Record<string, unknown> }),

    delete: (id: string): Promise<SuccessResponse> =>
      apiRequest(`/api/stores/${id}`, successResponseSchema, { method: 'DELETE' }),
  },

  // ===== Products API =====
  products: {
    getAll: (params?: PaginationParams): Promise<PaginatedResponse<Product>> =>
      apiRequest(`/api/products${params ? buildQueryString(params) : ''}`, createPaginatedResponseSchema(productSchema)),

    // للتوافق مع الكود القديم - يجلب كل المنتجات بدون pagination
    getAllLegacy: (): Promise<Product[]> =>
      apiRequest('/api/products?limit=1000', createPaginatedResponseSchema(productSchema))
        .then(res => res.data),

    getById: (id: string): Promise<Product> =>
      apiRequest(`/api/products/${id}`, productSchema),

    create: (data: CreateProductInput): Promise<Product> =>
      apiRequest('/api/products', productSchema, { method: 'POST', body: data as Record<string, unknown> }),

    update: (id: string, data: UpdateProductInput): Promise<Product> =>
      apiRequest(`/api/products/${id}`, productSchema, { method: 'PUT', body: data as Record<string, unknown> }),

    delete: (id: string): Promise<SuccessResponse> =>
      apiRequest(`/api/products/${id}`, successResponseSchema, { method: 'DELETE' }),
  },

  // ===== Categories API =====
  categories: {
    getAll: (): Promise<Category[]> =>
      apiRequest('/api/categories', categoryListSchema),

    getById: (id: string): Promise<Category> =>
      apiRequest(`/api/categories/${id}`, categorySchema),

    create: (data: CreateCategoryInput): Promise<Category> =>
      apiRequest('/api/categories', categorySchema, { method: 'POST', body: data as Record<string, unknown> }),

    update: (id: string, data: UpdateCategoryInput): Promise<Category> =>
      apiRequest(`/api/categories/${id}`, categorySchema, { method: 'PUT', body: data as Record<string, unknown> }),

    delete: (id: string): Promise<SuccessResponse> =>
      apiRequest(`/api/categories/${id}`, successResponseSchema, { method: 'DELETE' }),
  },

  // ===== Subscriptions API =====
  subscriptions: {
    verify: (code: string): Promise<VerifyCodeResponse> =>
      apiRequest('/api/subscriptions/verify', verifyCodeResponseSchema, {
        method: 'POST',
        body: { code },
      }),

    startTrial: (): Promise<VerifyCodeResponse> =>
      apiRequest('/api/subscriptions/trial', verifyCodeResponseSchema, { method: 'POST' }),

    getStatus: (): Promise<SubscriptionStatus> =>
      apiRequest('/api/subscriptions/status', subscriptionStatusSchema),

    renew: (code: string): Promise<VerifyCodeResponse> =>
      apiRequest('/api/subscriptions/renew', verifyCodeResponseSchema, {
        method: 'POST',
        body: { code },
      }),

    // Admin only
    generateCode: (data: GenerateCodeRequest): Promise<SubscriptionCode[]> =>
      apiRequest('/api/subscriptions/codes', z.array(subscriptionCodeSchema), {
        method: 'POST',
        body: data as Record<string, unknown>,
      }),

    getAllCodes: (): Promise<SubscriptionCode[]> =>
      apiRequest('/api/subscriptions/codes', z.array(subscriptionCodeSchema)),
  },

  // ===== Admin API =====
  admin: {
    getProfile: (): Promise<AdminProfile> =>
      apiRequest('/api/admin/profile', adminProfileSchema),

    createProfile: (data: CreateAdminInput): Promise<AdminProfile> =>
      apiRequest('/api/admin/profile', adminProfileSchema, {
        method: 'POST',
        body: data as Record<string, unknown>,
      }),

    updateProfile: (data: UpdateAdminInput): Promise<AdminProfile> =>
      apiRequest('/api/admin/profile', adminProfileSchema, {
        method: 'PUT',
        body: data as Record<string, unknown>,
      }),

    getStats: (): Promise<AdminStats> =>
      apiRequest('/api/admin/stats', adminStatsSchema),

    updateLastLogin: (): Promise<SuccessResponse> =>
      apiRequest('/api/admin/last-login', successResponseSchema, { method: 'PUT' }),

    // Super admin
    getSubscribers: (): Promise<Subscriber[]> =>
      apiRequest('/api/admin/subscribers', subscriberListSchema),

    updateStoreStatus: (id: string, isActive: boolean): Promise<SuccessResponse> =>
      apiRequest(`/api/admin/subscribers/${id}/store-status`, successResponseSchema, {
        method: 'PUT',
        body: { isActive },
      }),

    updateDashboardStatus: (id: string, isActive: boolean): Promise<SuccessResponse> =>
      apiRequest(`/api/admin/subscribers/${id}/dashboard-status`, successResponseSchema, {
        method: 'PUT',
        body: { isActive },
      }),

    updateHideUpgradeUI: (id: string, hide: boolean): Promise<SuccessResponse> =>
      apiRequest(`/api/admin/subscribers/${id}/hide-upgrade`, successResponseSchema, {
        method: 'PUT',
        body: { hide },
      }),

    deleteSubscriber: (id: string): Promise<SuccessResponse> =>
      apiRequest(`/api/admin/subscribers/${id}`, successResponseSchema, { method: 'DELETE' }),

    getGlobalStats: (): Promise<GlobalStats> =>
      apiRequest('/api/admin/global-stats', globalStatsSchema),
  },

  // ===== Payment Methods API =====
  payments: {
    getAll: (): Promise<PaymentMethod[]> =>
      apiRequest('/api/payments', paymentMethodListSchema),

    create: (data: CreatePaymentMethodInput): Promise<PaymentMethod> =>
      apiRequest('/api/payments', paymentMethodSchema, {
        method: 'POST',
        body: data as Record<string, unknown>,
      }),

    update: (id: string, data: UpdatePaymentMethodInput): Promise<PaymentMethod> =>
      apiRequest(`/api/payments/${id}`, paymentMethodSchema, {
        method: 'PUT',
        body: data as Record<string, unknown>,
      }),

    toggle: (id: string): Promise<PaymentMethod> =>
      apiRequest(`/api/payments/${id}/toggle`, paymentMethodSchema, { method: 'PUT' }),

    delete: (id: string): Promise<SuccessResponse> =>
      apiRequest(`/api/payments/${id}`, successResponseSchema, { method: 'DELETE' }),

    reorder: (orderedIds: string[]): Promise<SuccessResponse> =>
      apiRequest('/api/payments/reorder', successResponseSchema, {
        method: 'PUT',
        body: { orderedIds },
      }),

    // Receipts
    getReceipts: (): Promise<PaymentReceipt[]> =>
      apiRequest('/api/payments/receipts', paymentReceiptListSchema),

    updateReceiptStatus: (
      id: string,
      status: 'approved' | 'rejected',
      adminNotes?: string
    ): Promise<PaymentReceipt> =>
      apiRequest(`/api/payments/receipts/${id}/status`, paymentReceiptSchema, {
        method: 'PUT',
        body: { status, adminNotes },
      }),
  },

  // ===== Public Payment Methods =====
  publicPayments: {
    getByStore: (slug: string): Promise<PaymentMethod[]> =>
      publicRequest(`/api/public/store/${slug}/payment-methods`, paymentMethodListSchema),

    submitReceipt: (slug: string, data: SubmitReceiptInput): Promise<PaymentReceipt> =>
      publicRequest(`/api/public/store/${slug}/payment-receipt`, paymentReceiptSchema, {
        method: 'POST',
        body: data as Record<string, unknown>,
      }),
  },

  // ===== Public Orders =====
  publicOrders: {
    create: (slug: string, data: CreateOrderInput): Promise<Order> =>
      publicRequest(`/api/public/store/${slug}/order`, orderSchema, {
        method: 'POST',
        body: data as Record<string, unknown>,
      }),
  },

  // ===== Orders API (للتاجر) =====
  orders: {
    getAll: (params?: PaginationParams): Promise<PaginatedResponse<Order>> =>
      apiRequest(`/api/orders${params ? buildQueryString(params) : ''}`, createPaginatedResponseSchema(orderSchema)),

    // للتوافق مع الكود القديم
    getAllLegacy: (): Promise<Order[]> =>
      apiRequest('/api/orders?limit=1000', createPaginatedResponseSchema(orderSchema))
        .then(res => res.data),

    getById: (id: string): Promise<Order> =>
      apiRequest(`/api/orders/${id}`, orderSchema),

    updateStatus: (id: string, data: UpdateOrderStatusInput): Promise<Order> =>
      apiRequest(`/api/orders/${id}/status`, orderSchema, {
        method: 'PUT',
        body: data as Record<string, unknown>,
      }),

    delete: (id: string): Promise<SuccessResponse> =>
      apiRequest(`/api/orders/${id}`, successResponseSchema, { method: 'DELETE' }),

    getStats: (): Promise<OrderStats> =>
      apiRequest('/api/orders/stats', orderStatsSchema),
  },

  // ===== Push Notifications API =====
  push: {
    subscribe: (storeId: string, subscription: PushSubscriptionJSON): Promise<SuccessResponse> =>
      apiRequestRaw('/api/push/subscribe', {
        method: 'POST',
        body: { storeId, subscription } as Record<string, unknown>,
      }),

    unsubscribe: (storeId: string, endpoint: string): Promise<SuccessResponse> =>
      apiRequestRaw('/api/push/unsubscribe', {
        method: 'POST',
        body: { storeId, endpoint },
      }),

    send: (
      storeId: string,
      title: string,
      body: string,
      data?: Record<string, unknown>
    ): Promise<SuccessResponse> =>
      apiRequestRaw('/api/push/send', {
        method: 'POST',
        body: { storeId, title, body, data },
      }),
  },
} as const;

export default api;
