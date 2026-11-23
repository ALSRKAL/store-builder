/**
 * Payment Schema - Zod validation for Payment methods data
 * Matches API response from workers/api/routes/payments.js
 */

import { z } from 'zod';

// Payment provider types - flexible string
export const paymentProviderSchema = z.string();

// Payment method schema - matches getPaymentMethods() response
export const paymentMethodSchema = z.object({
  id: z.string(),
  storeId: z.string().optional(),
  providerId: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  label: z.string().optional().nullable(),
  configDetails: z.record(z.string(), z.unknown()).optional().nullable(),
  requireReceipt: z.boolean().optional(),
  receiptInstructions: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  // Additional/legacy fields
  name: z.string().optional().nullable(),
  provider: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  accountName: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  requiresReceipt: z.boolean().optional(),
  order: z.number().optional(),
  // QR Code fields
  qrCodeImage: z.string().optional().nullable(),
  walletName: z.string().optional().nullable(),
  // Public API displayInfo field
  displayInfo: z.object({
    phone: z.string().optional().nullable(),
    accountName: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    accountNumber: z.string().optional().nullable(),
    iban: z.string().optional().nullable(),
    instructions: z.string().optional().nullable(),
    qrCodeImage: z.string().optional().nullable(),
    walletName: z.string().optional().nullable(),
  }).optional().nullable(),
});

// Create payment method schema
export const createPaymentMethodSchema = z.object({
  providerId: z.string().optional(),
  provider: z.string().optional(),
  countryCode: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  configDetails: z.record(z.string(), z.unknown()).optional(),
  requireReceipt: z.boolean().optional(),
  requiresReceipt: z.boolean().optional(),
  receiptInstructions: z.string().optional(),
  instructions: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  qrCodeImage: z.string().optional(),
  walletName: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().optional(),
});

// Update payment method schema
export const updatePaymentMethodSchema = z.object({
  countryCode: z.string().optional(),
  label: z.string().optional(),
  name: z.string().optional(),
  configDetails: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional(),
  requireReceipt: z.boolean().optional(),
  requiresReceipt: z.boolean().optional(),
  receiptInstructions: z.string().optional(),
  instructions: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  qrCodeImage: z.string().optional(),
  walletName: z.string().optional(),
});

// Payment receipt schema - matches getPaymentReceipts() response
export const paymentReceiptSchema = z.object({
  id: z.string(),
  storeId: z.string().optional(),
  paymentMethodId: z.string().optional().nullable(),
  providerId: z.string().optional().nullable(),
  methodLabel: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  receiptImage: z.string(),
  notes: z.string().optional().nullable(),
  status: z.string().optional(),
  adminNotes: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
  // Additional fields
  orderId: z.string().optional(),
  customerNotes: z.string().optional().nullable(),
});

// Submit receipt schema
export const submitReceiptSchema = z.object({
  paymentMethodId: z.string(),
  receiptImage: z.string(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  amount: z.number().optional(),
  notes: z.string().optional(),
  orderId: z.string().optional(),
  customerNotes: z.string().optional(),
});

// Update receipt status schema
export const updateReceiptStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  adminNotes: z.string().optional(),
});

// Reorder payment methods schema
export const reorderPaymentMethodsSchema = z.object({
  orderedIds: z.array(z.string()),
});

// Payment method list response schema
export const paymentMethodListSchema = z.array(paymentMethodSchema);
export const paymentReceiptListSchema = z.array(paymentReceiptSchema);

// Export types
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodSchema>;
export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>;
export type SubmitReceiptInput = z.infer<typeof submitReceiptSchema>;
export type UpdateReceiptStatusInput = z.infer<typeof updateReceiptStatusSchema>;
export type ReorderPaymentMethodsInput = z.infer<typeof reorderPaymentMethodsSchema>;
