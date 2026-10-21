/**
 * Worker Types - Type definitions for Cloudflare Workers API
 */

// ===== Environment Types =====

export interface Env {
  DB: D1Database;
  STORE_IMAGES: R2Bucket;
  FIREBASE_PROJECT_ID?: string;
  LOG_LEVEL?: string;
}

// ===== Request Types =====

export interface AuthenticatedRequest extends Request {
  user?: FirebaseUser;
}

export interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
}

export interface VerifiedUser extends FirebaseUser {
  emailVerified?: boolean;
  picture?: string;
  authTime?: number;
  issuedAt?: number;
  expiresAt?: number;
}

// ===== Database Types =====

export interface DBStore {
  id: string;
  slug: string;
  name: string;
  whatsapp: string | null;
  logo: string | null;
  owner_id: string;
  theme: string | null;
  currency: string;
  location: string | null;
  announcement: string | null;
  social_links: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  plan_id?: string;
  subscription_end?: string;
}

export interface DBProduct {
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

export interface DBCategory {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DBOrder {
  id: string;
  store_id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  customer_notes: string | null;
  items: string;
  items_count: number;
  subtotal: number;
  total: number;
  currency: string;
  payment_method_id: string;
  payment_provider_id: string | null;
  payment_status: string;
  receipt_image: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  payment_label?: string;
  provider_id?: string;
  config_details?: string;
}

// ===== API Response Types =====

export interface Product {
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

export interface Category {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

// ===== Input Types =====

export interface CreateProductInput {
  name: string;
  price?: number;
  description?: string;
  images?: string[];
  categoryId?: string;
  colors?: string[];
  sizes?: string[];
  discount?: number;
  inStock?: boolean;
}

export interface UpdateProductInput {
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

// ===== Pagination Types =====

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  search: string;
  filters: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ===== Rate Limit Types =====

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
  retryAfter?: number;
  limitType?: string;
  error?: string;
}

// ===== Validation Types =====

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  data: T;
}
