/**
 * Orders API Routes
 * نظام الطلبات الكامل
 */

import type { Env, AuthenticatedRequest, DBOrder } from '../types';
import { jsonResponse, errorResponse } from '../utils/helpers';
import { getPaginationParams, paginatedResponse, buildWhereClause, validateSortColumn } from '../utils/pagination';
import { validateOrderInput, sanitizeString, sanitizeText } from '../utils/validator';
import { sendFCMToStore } from '../utils/fcm';

const ALLOWED_SORT_COLUMNS = ['created_at', 'updated_at', 'order_number', 'total', 'status'];

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total?: number;
  selectedColor?: string;
  selectedSize?: string;
  image?: string;
  images?: string[];
}

interface OrderInput {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNotes?: string;
  items: OrderItem[];
  paymentMethodId: string;
  receiptImage?: string;
}

interface PaymentMethod {
  id: string;
  provider_id: string;
  label: string;
  require_receipt: number;
  config_details: string | null;
}

interface StoreInfo {
  owner_id: string;
  store_name: string;
  currency: string;
  whatsapp: string | null;
}


export async function handleOrders(
  request: AuthenticatedRequest,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;
  const user = request.user;
  const url = new URL(request.url);

  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  if (method === 'GET' && path === '/api/orders/stats') {
    return getOrderStats(env, user.uid);
  }

  if (method === 'GET' && path === '/api/orders') {
    return getOrders(env, user.uid, url);
  }

  if (method === 'PUT' && path.match(/^\/api\/orders\/[\w-]+\/status$/)) {
    const orderId = path.split('/')[3];
    const body = await request.json() as { status?: string; paymentStatus?: string; adminNotes?: string };
    return updateOrderStatus(env, user.uid, orderId, body);
  }

  if (method === 'GET' && path.match(/^\/api\/orders\/[\w-]+$/)) {
    const orderId = path.split('/').pop()!;
    return getOrderById(env, user.uid, orderId);
  }

  if (method === 'DELETE' && path.match(/^\/api\/orders\/[\w-]+$/)) {
    const orderId = path.split('/').pop()!;
    return deleteOrder(env, user.uid, orderId);
  }

  return errorResponse('Not Found', 404);
}

export async function createPublicOrder(env: Env, slug: string, data: OrderInput): Promise<Response> {
  try {
    const validation = validateOrderInput(data);
    
    if (!validation.valid) {
      return errorResponse(validation.errors.join(', '), 400);
    }
    
    const {
      customerName,
      customerPhone,
      customerAddress,
      customerNotes,
      items,
      paymentMethodId,
      receiptImage
    } = validation.data as OrderInput;

    const store = await env.DB.prepare(`
      SELECT s.owner_id, s.name as store_name, s.currency, a.whatsapp
      FROM stores s
      LEFT JOIN admins a ON s.owner_id = a.id
      WHERE s.slug = ? OR s.id = ?
    `).bind(slug, slug).first<StoreInfo>();

    if (!store) {
      return errorResponse('المتجر غير موجود', 404);
    }

    const paymentMethod = await env.DB.prepare(`
      SELECT id, provider_id, label, require_receipt, config_details
      FROM store_payment_methods 
      WHERE id = ? AND store_id = ? AND is_active = 1
    `).bind(paymentMethodId, store.owner_id).first<PaymentMethod>();

    if (!paymentMethod) {
      return errorResponse('طريقة الدفع غير موجودة', 404);
    }

    if (paymentMethod.provider_id !== 'cod' && paymentMethod.require_receipt === 1 && !receiptImage) {
      return errorResponse('يجب رفع صورة إيصال الدفع', 400);
    }


    let subtotal = 0;
    let itemsCount = 0;
    const processedItems: OrderItem[] = items.map(item => {
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      subtotal += itemTotal;
      itemsCount += item.quantity || 1;
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        total: itemTotal,
        selectedColor: item.selectedColor || undefined,
        selectedSize: item.selectedSize || undefined,
        image: item.image || item.images?.[0] || undefined
      };
    });

    const orderCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM orders WHERE store_id = ?
    `).bind(store.owner_id).first<{ count: number }>();
    
    const orderNumber = `ORD-${String((orderCount?.count || 0) + 1).padStart(4, '0')}`;

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO orders 
      (id, store_id, order_number, customer_name, customer_phone, customer_address, customer_notes,
       items, items_count, subtotal, total, currency,
       payment_method_id, payment_provider_id, payment_status, receipt_image,
       status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    `).bind(
      id,
      store.owner_id,
      orderNumber,
      customerName.trim(),
      customerPhone.trim(),
      customerAddress || null,
      customerNotes || null,
      JSON.stringify(processedItems),
      itemsCount,
      subtotal,
      subtotal,
      store.currency || 'YER',
      paymentMethodId,
      paymentMethod.provider_id,
      'pending',
      receiptImage || null,
      timestamp,
      timestamp
    ).run();

    try {
      console.log('Sending FCM notification for new order:', {
        storeId: store.owner_id,
        orderNumber,
        customerName: customerName.trim(),
      });
      
      // بناء قائمة المنتجات للإشعار
      const productNames = processedItems.slice(0, 3).map(item => item.name).join('، ');
      const moreProducts = processedItems.length > 3 ? ` و${processedItems.length - 3} منتجات أخرى` : '';
      
      await sendFCMToStore(env, store.owner_id, {
        title: `🛒 طلب جديد من ${customerName.trim()}`,
        body: `${productNames}${moreProducts} - ${subtotal} ${store.currency || 'YER'}`,
        data: {
          type: 'new_order',
          orderId: id,
          orderNumber: orderNumber,
          customerName: customerName.trim(),
          total: String(subtotal),
          url: '/admin/dashboard?tab=orders'
        },
        clickAction: '/admin/dashboard?tab=orders'
      });
      
      console.log('FCM notification sent successfully');
    } catch (pushError) {
      console.error('FCM notification error:', pushError);
    }

    const whatsappMessage = generateOrderWhatsAppMessage({
      orderNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress,
      customerNotes,
      items: processedItems,
      total: subtotal,
      currency: store.currency || 'YER',
      paymentMethod,
      receiptImage,
      storeName: store.store_name,
      createdAt: timestamp
    });

    return jsonResponse({
      success: true,
      orderId: id,
      orderNumber,
      message: 'تم إرسال طلبك بنجاح! سيتواصل معك صاحب المتجر قريباً',
      whatsappLink: store.whatsapp ? 
        `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappMessage)}` : 
        null
    }, 201);
  } catch (error) {
    console.error('Error creating order:', error);
    return errorResponse('خطأ في إنشاء الطلب', 500);
  }
}


interface WhatsAppOrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerNotes?: string;
  items: OrderItem[];
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  receiptImage?: string;
  storeName: string;
  createdAt: string;
}

function generateOrderWhatsAppMessage(order: WhatsAppOrderData): string {
  const config = JSON.parse(order.paymentMethod.config_details || '{}');
  
  let message = `🛒 *طلب جديد #${order.orderNumber}*

━━━━━━━━━━━━━━━
📅 التاريخ: ${new Date(order.createdAt).toLocaleString('ar-SA')}

👤 *بيانات العميل:*
   الاسم: ${order.customerName}
   الهاتف: ${order.customerPhone}`;

  if (order.customerAddress) {
    message += `
   العنوان: ${order.customerAddress}`;
  }

  message += `

📦 *المنتجات:*`;

  order.items.forEach((item, index) => {
    message += `
${index + 1}. ${item.name}
   💰 ${item.price} × ${item.quantity} = ${item.total} ${order.currency}`;
    if (item.selectedColor) message += `
   🎨 اللون: ${item.selectedColor}`;
    if (item.selectedSize) message += `
   📏 المقاس: ${item.selectedSize}`;
  });

  message += `

━━━━━━━━━━━━━━━
💵 *المجموع: ${order.total} ${order.currency}*

💳 *طريقة الدفع:*
   ${order.paymentMethod.label || order.paymentMethod.provider_id}`;

  if (config.phone) {
    message += `
   📱 رقم التحويل: ${config.phone}`;
  }
  if (config.accountName) {
    message += `
   👤 اسم الحساب: ${config.accountName}`;
  }

  if (order.receiptImage) {
    message += `

✅ *تم رفع إيصال الدفع*`;
  }

  if (order.customerNotes) {
    message += `

📝 *ملاحظات العميل:*
${order.customerNotes}`;
  }

  return message;
}


async function getOrders(env: Env, storeId: string, url: URL): Promise<Response> {
  try {
    const params = getPaginationParams(url);
    const { limit, offset, sortBy, sortOrder, search, filters } = params;
    
    const validSortBy = validateSortColumn(sortBy, ALLOWED_SORT_COLUMNS);
    
    const { whereClause, values: filterValues } = buildWhereClause(filters as Record<string, unknown>, {
      status: 'o.status',
      createdAt: 'o.created_at',
    });
    
    let searchClause = '';
    const searchValues: string[] = [];
    if (search) {
      searchClause = '(o.customer_name LIKE ? OR o.customer_phone LIKE ? OR o.order_number LIKE ?)';
      searchValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    let fullWhere = 'o.store_id = ?';
    const allValues: unknown[] = [storeId];
    
    if (whereClause) {
      fullWhere += ` AND ${whereClause}`;
      allValues.push(...filterValues);
    }
    
    if (searchClause) {
      fullWhere += ` AND ${searchClause}`;
      allValues.push(...searchValues);
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM orders o WHERE ${fullWhere}`;
    const countResult = await env.DB.prepare(countQuery).bind(...allValues).first<{ total: number }>();
    const total = countResult?.total || 0;
    
    const dataQuery = `
      SELECT o.*, pm.label as payment_label, pm.provider_id
      FROM orders o
      LEFT JOIN store_payment_methods pm ON o.payment_method_id = pm.id
      WHERE ${fullWhere}
      ORDER BY o.${validSortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const orders = await env.DB.prepare(dataQuery)
      .bind(...allValues, limit, offset)
      .all<DBOrder>();

    const formattedOrders = orders.results.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerAddress: o.customer_address,
      customerNotes: o.customer_notes,
      items: JSON.parse(o.items || '[]'),
      itemsCount: o.items_count,
      subtotal: o.subtotal,
      total: o.total,
      currency: o.currency,
      paymentMethodId: o.payment_method_id,
      paymentProviderId: o.payment_provider_id || o.provider_id,
      paymentLabel: o.payment_label,
      paymentStatus: o.payment_status,
      receiptImage: o.receipt_image,
      status: o.status,
      adminNotes: o.admin_notes,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
      confirmedAt: o.confirmed_at,
      shippedAt: o.shipped_at,
      deliveredAt: o.delivered_at
    }));

    return jsonResponse(paginatedResponse(formattedOrders, total, params));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return errorResponse('خطأ في جلب الطلبات', 500);
  }
}


async function getOrderById(env: Env, storeId: string, orderId: string): Promise<Response> {
  try {
    const order = await env.DB.prepare(`
      SELECT o.*, pm.label as payment_label, pm.provider_id, pm.config_details
      FROM orders o
      LEFT JOIN store_payment_methods pm ON o.payment_method_id = pm.id
      WHERE o.id = ? AND o.store_id = ?
    `).bind(orderId, storeId).first<DBOrder & { config_details?: string }>();

    if (!order) {
      return errorResponse('الطلب غير موجود', 404);
    }

    return jsonResponse({
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      customerAddress: order.customer_address,
      customerNotes: order.customer_notes,
      items: JSON.parse(order.items || '[]'),
      itemsCount: order.items_count,
      subtotal: order.subtotal,
      total: order.total,
      currency: order.currency,
      paymentMethodId: order.payment_method_id,
      paymentProviderId: order.payment_provider_id || order.provider_id,
      paymentLabel: order.payment_label,
      paymentConfig: JSON.parse(order.config_details || '{}'),
      paymentStatus: order.payment_status,
      receiptImage: order.receipt_image,
      status: order.status,
      adminNotes: order.admin_notes,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      confirmedAt: order.confirmed_at,
      shippedAt: order.shipped_at,
      deliveredAt: order.delivered_at
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return errorResponse('خطأ في جلب الطلب', 500);
  }
}

async function updateOrderStatus(
  env: Env,
  storeId: string,
  orderId: string,
  data: { status?: string; paymentStatus?: string; adminNotes?: string }
): Promise<Response> {
  try {
    const { status, paymentStatus, adminNotes } = data;
    const timestamp = new Date().toISOString();

    const existing = await env.DB.prepare(`
      SELECT id FROM orders WHERE id = ? AND store_id = ?
    `).bind(orderId, storeId).first<{ id: string }>();

    if (!existing) {
      return errorResponse('الطلب غير موجود', 404);
    }

    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [timestamp];

    if (status) {
      const validStatuses = ['new', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
      const sanitizedStatus = sanitizeString(status, 20).toLowerCase();
      if (!validStatuses.includes(sanitizedStatus)) {
        return errorResponse('حالة غير صالحة', 400);
      }
      updates.push('status = ?');
      values.push(sanitizedStatus);

      if (sanitizedStatus === 'confirmed') {
        updates.push('confirmed_at = ?');
        values.push(timestamp);
      } else if (sanitizedStatus === 'shipped') {
        updates.push('shipped_at = ?');
        values.push(timestamp);
      } else if (sanitizedStatus === 'delivered') {
        updates.push('delivered_at = ?');
        values.push(timestamp);
      }
    }

    if (paymentStatus) {
      const validPaymentStatuses = ['pending', 'paid', 'failed'];
      const sanitizedPaymentStatus = sanitizeString(paymentStatus, 20).toLowerCase();
      if (!validPaymentStatuses.includes(sanitizedPaymentStatus)) {
        return errorResponse('حالة دفع غير صالحة', 400);
      }
      updates.push('payment_status = ?');
      values.push(sanitizedPaymentStatus);
    }

    if (adminNotes !== undefined) {
      updates.push('admin_notes = ?');
      values.push(adminNotes ? sanitizeText(adminNotes, 1000) : null);
    }

    values.push(orderId);
    values.push(storeId);

    await env.DB.prepare(`
      UPDATE orders SET ${updates.join(', ')} WHERE id = ? AND store_id = ?
    `).bind(...values).run();

    return jsonResponse({
      success: true,
      message: 'تم تحديث الطلب بنجاح'
    });
  } catch (error) {
    console.error('Error updating order:', error);
    return errorResponse('خطأ في تحديث الطلب', 500);
  }
}


async function deleteOrder(env: Env, storeId: string, orderId: string): Promise<Response> {
  try {
    const existing = await env.DB.prepare(`
      SELECT id FROM orders WHERE id = ? AND store_id = ?
    `).bind(orderId, storeId).first<{ id: string }>();

    if (!existing) {
      return errorResponse('الطلب غير موجود', 404);
    }

    await env.DB.prepare(`
      DELETE FROM orders WHERE id = ? AND store_id = ?
    `).bind(orderId, storeId).run();

    return jsonResponse({
      success: true,
      message: 'تم حذف الطلب بنجاح'
    });
  } catch (error) {
    console.error('Error deleting order:', error);
    return errorResponse('خطأ في حذف الطلب', 500);
  }
}

async function getOrderStats(env: Env, storeId: string): Promise<Response> {
  try {
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_orders,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as total_revenue
      FROM orders WHERE store_id = ?
    `).bind(storeId).first<{
      total: number;
      new_orders: number;
      confirmed: number;
      processing: number;
      shipped: number;
      delivered: number;
      cancelled: number;
      total_revenue: number;
    }>();

    return jsonResponse({
      total: stats?.total || 0,
      newOrders: stats?.new_orders || 0,
      confirmed: stats?.confirmed || 0,
      processing: stats?.processing || 0,
      shipped: stats?.shipped || 0,
      delivered: stats?.delivered || 0,
      cancelled: stats?.cancelled || 0,
      totalRevenue: stats?.total_revenue || 0
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    return errorResponse('خطأ في جلب الإحصائيات', 500);
  }
}
