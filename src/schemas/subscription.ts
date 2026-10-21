/**
 * Subscription Schema - Zod validation for Subscription data
 * Matches API response from workers/api/routes/subscriptions.js
 */

import { z } from 'zod';

// Plan IDs
export const planIdSchema = z.enum(['trial', 'monthly', 'semiAnnual', 'annual']);

// Subscription code schema - matches getAllCodes() response
export const subscriptionCodeSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  code: z.string(),
  months: z.number(),
  plan_id: z.string().optional().nullable(),
  planId: z.string().optional().nullable(),
  used: z.union([z.boolean(), z.number()]).optional(),
  isUsed: z.boolean().optional(),
  used_by: z.string().optional().nullable(),
  usedBy: z.string().optional().nullable(),
  used_by_email: z.string().optional().nullable(),
  used_at: z.string().optional().nullable(),
  usedAt: z.string().optional().nullable(),
  created_at: z.string().optional().nullable(),
  createdAt: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

// Subscription status schema - matches getSubscriptionStatus() response
export const subscriptionStatusSchema = z.object({
  hasSubscription: z.boolean(),
  subscriptionEnd: z.string().optional().nullable(),
  subscriptionMonths: z.number().optional().nullable(),
  planId: z.string().optional().nullable(),
  isTrial: z.boolean().optional(),
  isExpired: z.boolean().optional(),
  daysRemaining: z.number().optional(),
  // Legacy fields
  isActive: z.boolean().optional(),
  trialUsed: z.boolean().optional(),
});

// Verify code request schema
export const verifyCodeRequestSchema = z.object({
  code: z.string().min(1),
});

// Verify code response schema - matches verifyCode() response
export const verifyCodeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  subscriptionEnd: z.string().optional(),
  planId: z.string().optional(),
  months: z.number().optional(),
  alreadyActive: z.boolean().optional(),
  isTrial: z.boolean().optional(),
});

// Generate code request schema
export const generateCodeRequestSchema = z.object({
  months: z.number().min(0).max(24),
  planId: planIdSchema.optional(),
  count: z.number().min(1).max(100).optional(),
  expiresInDays: z.number().optional(),
  expiresAt: z.string().optional(),
});

// Code list response schema
export const codeListSchema = z.array(subscriptionCodeSchema);

// Export types
export type PlanId = z.infer<typeof planIdSchema>;
export type SubscriptionCode = z.infer<typeof subscriptionCodeSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type VerifyCodeRequest = z.infer<typeof verifyCodeRequestSchema>;
export type VerifyCodeResponse = z.infer<typeof verifyCodeResponseSchema>;
export type GenerateCodeRequest = z.infer<typeof generateCodeRequestSchema>;
