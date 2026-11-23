/**
 * Payment Methods API Routes
 */

import type { Env, AuthenticatedRequest } from '../types';
import { jsonResponse, errorResponse } from '../utils/helpers';
import { getProviderById, getProviderCountry, validateProviderConfig } from '../../../src/config/paymentProviders';

function configError(providerId: string, config: unknown): string | null {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return 'تفاصيل الإعدادات غير صالحة';
  if (Object.values(config).some((value) => typeof value !== 'string')) return 'قيم إعدادات الدفع يجب أن تكون نصوصاً';
  const validation = validateProviderConfig(providerId, config as Record<string, string>);
  if (!validation.valid) return validation.errors.join('، ');
  if (getProviderById(providerId)?.type === 'qr' && !(config as Record<string, string>).qrCodeImage) return 'يرجى رفع صورة QR Code';
  return null;
}

interface PaymentMethod {
  id: string;
  store_id: string;
  provider_id: string;
  country_code: string;
  label: string | null;
  config_details: string;
  require_receipt: number;
  receipt_instructions: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PaymentInput {
  providerId?: string;
  countryCode?: string;
  label?: string;
  configDetails?: Record<string, unknown>;
  requireReceipt?: boolean;
  receiptInstructions?: string;
  isActive?: boolean;
}

export async function handlePayments(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const user = request.user;

  if (!user) return errorResponse('Unauthorized', 401);

  if (method === 'GET' && path === '/api/payments') {
    return getPaymentMethods(env, user.uid);
  }

  if (method === 'POST' && path === '/api/payments') {
    const body = await request.json() as PaymentInput;
    return createPaymentMethod(env, user.uid, body);
  }

  if (method === 'PUT' && path !== '/api/payments/reorder' && path.match(/^\/api\/payments\/[\w-]+$/)) {
    const paymentId = path.split('/').pop()!;
    const body = await request.json() as PaymentInput;
    return updatePaymentMethod(env, user.uid, paymentId, body);
  }

  if (method === 'PUT' && path.match(/^\/api\/payments\/[\w-]+\/toggle$/)) {
    const paymentId = path.split('/')[3];
    return togglePaymentMethod(env, user.uid, paymentId);
  }

  if (method === 'DELETE' && path.match(/^\/api\/payments\/[\w-]+$/)) {
    const paymentId = path.split('/').pop()!;
    return deletePaymentMethod(env, user.uid, paymentId);
  }

  if (method === 'PUT' && path === '/api/payments/reorder') {
    const body = await request.json() as { orderedIds: string[] };
    return reorderPaymentMethods(env, user.uid, body);
  }

  if (method === 'GET' && path === '/api/payments/receipts') {
    return getPaymentReceipts(env, user.uid);
  }

  if (method === 'PUT' && path.match(/^\/api\/payments\/receipts\/[\w-]+\/status$/)) {
    const receiptId = path.split('/')[4];
    const body = await request.json() as { status: string; adminNotes?: string };
    return updateReceiptStatus(env, user.uid, receiptId, body);
  }

  return errorResponse('Not Found', 404);
}


async function getPaymentMethods(env: Env, storeId: string): Promise<Response> {
  try {
    const methods = await env.DB.prepare(`
      SELECT * FROM store_payment_methods WHERE store_id = ? ORDER BY sort_order ASC, created_at DESC
    `).bind(storeId).all<PaymentMethod>();

    const formattedMethods = methods.results.map(m => ({
      id: m.id, storeId: m.store_id, providerId: m.provider_id, countryCode: m.country_code,
      label: m.label, configDetails: JSON.parse(m.config_details || '{}'),
      requireReceipt: getProviderById(m.provider_id)?.type !== 'cod' && m.require_receipt === 1, receiptInstructions: m.receipt_instructions,
      isActive: m.is_active === 1, sortOrder: m.sort_order, createdAt: m.created_at, updatedAt: m.updated_at
    }));

    return jsonResponse(formattedMethods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return errorResponse('خطأ في جلب طرق الدفع', 500);
  }
}

async function createPaymentMethod(env: Env, storeId: string, data: PaymentInput): Promise<Response> {
  try {
    const { providerId, countryCode, label, configDetails, requireReceipt, receiptInstructions } = data;

    if (!providerId) return errorResponse('معرف مزود الدفع مطلوب', 400);
    if (!countryCode) return errorResponse('كود الدولة مطلوب', 400);
    const provider = getProviderById(providerId);
    if (!provider || getProviderCountry(provider, countryCode)?.code !== countryCode) return errorResponse('مزود الدفع غير متاح لهذه الدولة', 400);
    const invalidConfig = configError(providerId, configDetails);
    if (invalidConfig) return errorResponse(invalidConfig, 400);
    const receiptRequired = provider.type !== 'cod' && Boolean(requireReceipt);
    const configJson = JSON.stringify(configDetails);
    const maxOrder = await env.DB.prepare(`SELECT MAX(sort_order) as max_order FROM store_payment_methods WHERE store_id = ?`).bind(storeId).first<{ max_order: number | null }>();
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO store_payment_methods (id, store_id, provider_id, country_code, label, config_details, require_receipt, receipt_instructions, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).bind(id, storeId, providerId, countryCode, label || null, configJson, receiptRequired ? 1 : 0, receiptRequired ? receiptInstructions || null : null, sortOrder, timestamp, timestamp).run();

    return jsonResponse({ success: true, id, message: 'تم إضافة طريقة الدفع بنجاح' }, 201);
  } catch (error) {
    console.error('Error creating payment method:', error);
    return errorResponse('خطأ في إضافة طريقة الدفع', 500);
  }
}

async function updatePaymentMethod(env: Env, storeId: string, paymentId: string, data: PaymentInput): Promise<Response> {
  try {
    const existing = await env.DB.prepare(`SELECT id, provider_id FROM store_payment_methods WHERE id = ? AND store_id = ?`).bind(paymentId, storeId).first<{ id: string; provider_id: string }>();
    if (!existing) return errorResponse('طريقة الدفع غير موجودة', 404);
    const isCod = getProviderById(existing.provider_id)?.type === 'cod';
    if (data.configDetails !== undefined) {
      const invalidConfig = configError(existing.provider_id, data.configDetails);
      if (invalidConfig) return errorResponse(invalidConfig, 400);
    }

    const { label, configDetails, isActive, requireReceipt, receiptInstructions, countryCode } = data;
    const provider = getProviderById(existing.provider_id);
    if (countryCode !== undefined && (!provider || getProviderCountry(provider, countryCode)?.code !== countryCode)) return errorResponse('مزود الدفع غير متاح لهذه الدولة', 400);
    const timestamp = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (countryCode !== undefined) { updates.push('country_code = ?'); values.push(countryCode); }
    if (label !== undefined) { updates.push('label = ?'); values.push(label || null); }
    if (configDetails !== undefined) { updates.push('config_details = ?'); values.push(JSON.stringify(configDetails)); }
    if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
    if (requireReceipt !== undefined || isCod) { updates.push('require_receipt = ?'); values.push(!isCod && requireReceipt ? 1 : 0); }
    if (receiptInstructions !== undefined || requireReceipt === false || isCod) { updates.push('receipt_instructions = ?'); values.push(isCod || requireReceipt === false ? null : receiptInstructions || null); }

    if (updates.length === 0) return errorResponse('لا توجد بيانات للتحديث', 400);

    updates.push('updated_at = ?');
    values.push(timestamp, paymentId, storeId);

    await env.DB.prepare(`UPDATE store_payment_methods SET ${updates.join(', ')} WHERE id = ? AND store_id = ?`).bind(...values).run();
    return jsonResponse({ success: true, message: 'تم تحديث طريقة الدفع بنجاح' });
  } catch (error) {
    console.error('Error updating payment method:', error);
    return errorResponse('خطأ في تحديث طريقة الدفع', 500);
  }
}


async function togglePaymentMethod(env: Env, storeId: string, paymentId: string): Promise<Response> {
  try {
    const existing = await env.DB.prepare(`SELECT id, is_active FROM store_payment_methods WHERE id = ? AND store_id = ?`).bind(paymentId, storeId).first<{ id: string; is_active: number }>();
    if (!existing) return errorResponse('طريقة الدفع غير موجودة', 404);

    const newStatus = existing.is_active === 1 ? 0 : 1;
    await env.DB.prepare(`UPDATE store_payment_methods SET is_active = ?, updated_at = ? WHERE id = ? AND store_id = ?`).bind(newStatus, new Date().toISOString(), paymentId, storeId).run();

    return jsonResponse({ success: true, isActive: newStatus === 1, message: newStatus === 1 ? 'تم تفعيل طريقة الدفع' : 'تم تعطيل طريقة الدفع' });
  } catch (error) {
    console.error('Error toggling payment method:', error);
    return errorResponse('خطأ في تغيير حالة طريقة الدفع', 500);
  }
}

async function deletePaymentMethod(env: Env, storeId: string, paymentId: string): Promise<Response> {
  try {
    const existing = await env.DB.prepare(`SELECT id FROM store_payment_methods WHERE id = ? AND store_id = ?`).bind(paymentId, storeId).first<{ id: string }>();
    if (!existing) return errorResponse('طريقة الدفع غير موجودة', 404);

    await env.DB.prepare(`DELETE FROM store_payment_methods WHERE id = ? AND store_id = ?`).bind(paymentId, storeId).run();
    return jsonResponse({ success: true, message: 'تم حذف طريقة الدفع بنجاح' });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    return errorResponse('خطأ في حذف طريقة الدفع', 500);
  }
}

async function reorderPaymentMethods(env: Env, storeId: string, data: { orderedIds: string[] }): Promise<Response> {
  try {
    const { orderedIds } = data;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return errorResponse('قائمة الترتيب مطلوبة', 400);

    const timestamp = new Date().toISOString();
    for (let i = 0; i < orderedIds.length; i++) {
      await env.DB.prepare(`UPDATE store_payment_methods SET sort_order = ?, updated_at = ? WHERE id = ? AND store_id = ?`).bind(i + 1, timestamp, orderedIds[i], storeId).run();
    }

    return jsonResponse({ success: true, message: 'تم إعادة ترتيب طرق الدفع بنجاح' });
  } catch (error) {
    console.error('Error reordering payment methods:', error);
    return errorResponse('خطأ في إعادة ترتيب طرق الدفع', 500);
  }
}

async function getPaymentReceipts(env: Env, storeId: string): Promise<Response> {
  try {
    const receipts = await env.DB.prepare(`
      SELECT r.*, pm.provider_id, pm.label as method_label FROM payment_receipts r
      LEFT JOIN store_payment_methods pm ON r.payment_method_id = pm.id WHERE r.store_id = ? ORDER BY r.created_at DESC
    `).bind(storeId).all();

    return jsonResponse(receipts.results.map((r: Record<string, unknown>) => ({
      id: r.id, storeId: r.store_id, paymentMethodId: r.payment_method_id, providerId: r.provider_id,
      methodLabel: r.method_label, customerName: r.customer_name, customerPhone: r.customer_phone,
      amount: r.amount, receiptImage: r.receipt_image, notes: r.notes, status: r.status,
      adminNotes: r.admin_notes, createdAt: r.created_at, updatedAt: r.updated_at
    })));
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return errorResponse('خطأ في جلب الإيصالات', 500);
  }
}

async function updateReceiptStatus(env: Env, storeId: string, receiptId: string, data: { status: string; adminNotes?: string }): Promise<Response> {
  try {
    const { status, adminNotes } = data;
    if (!['pending', 'approved', 'rejected'].includes(status)) return errorResponse('حالة غير صالحة', 400);

    const existing = await env.DB.prepare(`SELECT id FROM payment_receipts WHERE id = ? AND store_id = ?`).bind(receiptId, storeId).first<{ id: string }>();
    if (!existing) return errorResponse('الإيصال غير موجود', 404);

    await env.DB.prepare(`UPDATE payment_receipts SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ? AND store_id = ?`).bind(status, adminNotes || null, new Date().toISOString(), receiptId, storeId).run();
    return jsonResponse({ success: true, message: 'تم تحديث حالة الإيصال' });
  } catch (error) {
    console.error('Error updating receipt status:', error);
    return errorResponse('خطأ في تحديث حالة الإيصال', 500);
  }
}


export async function getPublicPaymentMethods(env: Env, slug: string): Promise<Response> {
  try {
    const store = await env.DB.prepare(`SELECT owner_id FROM stores WHERE slug = ? OR id = ?`).bind(slug, slug).first<{ owner_id: string }>();
    if (!store) return errorResponse('المتجر غير موجود', 404);

    const methods = await env.DB.prepare(`
      SELECT id, provider_id, country_code, label, config_details, require_receipt, receipt_instructions
      FROM store_payment_methods WHERE store_id = ? AND is_active = 1 ORDER BY sort_order ASC
    `).bind(store.owner_id).all<PaymentMethod>();

    const formattedMethods = methods.results.map(m => {
      const config = JSON.parse(m.config_details || '{}');
      return {
        id: m.id, providerId: m.provider_id, countryCode: m.country_code, label: m.label,
        requireReceipt: getProviderById(m.provider_id)?.type !== 'cod' && m.require_receipt === 1, receiptInstructions: m.receipt_instructions,
        displayInfo: {
          phone: config.phone || null, accountName: config.accountName || null,
          bankName: config.bankName || null, accountNumber: config.accountNumber || null,
          iban: config.iban || null, instructions: config.instructions || null,
          qrCodeImage: config.qrCodeImage || null, walletName: config.walletName || null
        }
      };
    });

    return jsonResponse(formattedMethods);
  } catch (error) {
    console.error('Error fetching public payment methods:', error);
    return errorResponse('خطأ في جلب طرق الدفع', 500);
  }
}

export async function submitPaymentReceipt(
  env: Env,
  slug: string,
  data: { paymentMethodId: string; customerName?: string; customerPhone?: string; amount?: number; receiptImage: string; notes?: string }
): Promise<Response> {
  try {
    const { paymentMethodId, customerName, customerPhone, amount, receiptImage, notes } = data;
    if (!paymentMethodId || !receiptImage) return errorResponse('بيانات ناقصة', 400);

    const store = await env.DB.prepare(`SELECT owner_id FROM stores WHERE slug = ? OR id = ?`).bind(slug, slug).first<{ owner_id: string }>();
    if (!store) return errorResponse('المتجر غير موجود', 404);

    const method = await env.DB.prepare(`SELECT id, require_receipt FROM store_payment_methods WHERE id = ? AND store_id = ? AND is_active = 1`).bind(paymentMethodId, store.owner_id).first<{ id: string; require_receipt: number }>();
    if (!method) return errorResponse('طريقة الدفع غير موجودة', 404);

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO payment_receipts (id, store_id, payment_method_id, customer_name, customer_phone, amount, receipt_image, notes, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(id, store.owner_id, paymentMethodId, customerName || null, customerPhone || null, amount || null, receiptImage, notes || null, timestamp, timestamp).run();

    return jsonResponse({ success: true, id, message: 'تم رفع الإيصال بنجاح' }, 201);
  } catch (error) {
    console.error('Error submitting receipt:', error);
    return errorResponse('خطأ في رفع الإيصال', 500);
  }
}
