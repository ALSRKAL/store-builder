/**
 * Order Schema - Zod validation for Order data
 * Matches API response from workers/api/routes/orders.js
 */

import { z } from 'zod';

// Order status enum - includes all statuses from API
export const orderStatusSchema = z.enum([
  'new',
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
]);

// Order item schema - matches processedItems in createPublicOrder()
export const orderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  name: z.string().optional(),
  productName: z.string().optional(),
  price: z.number(),
  quantity: z.number(),
  total: z.number().optional(),
  selectedColor: z.string().optional().nullable(),
  selectedSize: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  productImage: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Customer info schema
export const customerInfoSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Order schema - matches getOrders() response format
export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerAddress: z.string().optional().nullable(),
  customerNotes: z.string().optional().nullable(),
  items: z.array(orderItemSchema),
  itemsCount: z.number().optional(),
  subtotal: z.number(),
  total: z.number(),
  currency: z.string().optional().nullable(),
  paymentMethodId: z.string().optional().nullable(),
  paymentProviderId: z.string().optional().nullable(),
  paymentLabel: z.string().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
  receiptImage: z.string().optional().nullable(),
  status: z.string(),
  adminNotes: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  confirmedAt: z.string().optional().nullable(),
  shippedAt: z.string().optional().nullable(),
  deliveredAt: z.string().optional().nullable(),
  // Additional fields
  storeId: z.string().optional(),
  customer: customerInfoSchema.optional(),
  shipping: z.number().optional(),
  discount: z.number().optional(),
  paymentMethod: z.string().optional().nullable(),
});

// Create order schema (public) - matches createPublicOrder() input
export const createOrderSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  customerNotes: z.string().optional(),
  customer: z.object({
    name: z.string(),
    phone: z.string(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().optional(),
    name: z.string().optional(),
    productName: z.string().optional(),
    price: z.number(),
    quantity: z.number(),
    selectedColor: z.string().optional().nullable(),
    selectedSize: z.string().optional().nullable(),
    color: z.string().optional(),
    size: z.string().optional(),
    image: z.string().optional().nullable(),
    productImage: z.string().optional(),
    images: z.array(z.string()).optional(),
  })),
  paymentMethodId: z.string().optional(),
  paymentMethod: z.string().optional(),
  receiptImage: z.string().optional().nullable(),
});

// Update order status schema
export const updateOrderStatusSchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  adminNotes: z.string().optional().nullable(),
});

// Order stats schema - matches getOrderStats() response
export const orderStatsSchema = z.object({
  total: z.number(),
  newOrders: z.number().optional(),
  confirmed: z.number().optional(),
  processing: z.number().optional(),
  shipped: z.number().optional(),
  delivered: z.number().optional(),
  cancelled: z.number().optional(),
  totalRevenue: z.number(),
  // Additional fields
  pending: z.number().optional(),
  todayOrders: z.number().optional(),
  weekOrders: z.number().optional(),
});

// Order list response schema
export const orderListSchema = z.array(orderSchema);

// Export types
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type CustomerInfo = z.infer<typeof customerInfoSchema>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type OrderStats = z.infer<typeof orderStatsSchema>;
