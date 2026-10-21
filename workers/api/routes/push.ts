/**
 * Push Notifications API Routes
 * يدعم FCM (Firebase Cloud Messaging)
 */

import type { Env } from '../types';
import { jsonResponse, errorResponse } from '../utils/helpers';
import { sendFCMNotification, sendFCMToStore } from '../utils/fcm';

// FCM Token registration
interface FCMTokenRequest {
  storeId: string;
  fcmToken: string;
  deviceType?: 'web' | 'android' | 'ios';
  deviceInfo?: string;
}

// Send notification request
interface SendNotificationRequest {
  storeId: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  clickAction?: string;
}

export async function handlePush(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  // تسجيل FCM Token
  if (method === 'POST' && path === '/api/push/register') {
    return handleRegisterToken(request, env);
  }

  // إلغاء تسجيل FCM Token
  if (method === 'POST' && path === '/api/push/unregister') {
    return handleUnregisterToken(request, env);
  }

  // إرسال إشعار
  if (method === 'POST' && path === '/api/push/send') {
    return handleSendNotification(request, env);
  }

  // إرسال إشعار تجريبي
  if (method === 'POST' && path === '/api/push/test') {
    return handleTestNotification(request, env);
  }

  // تنظيف الـ tokens المكررة
  if (method === 'POST' && path === '/api/push/cleanup') {
    return handleCleanupTokens(request, env);
  }

  // التحقق من حالة التسجيل
  if (method === 'GET' && path.startsWith('/api/push/status/')) {
    const storeId = path.split('/').pop()!;
    return handleGetStatus(env, storeId);
  }

  // ===== Legacy endpoints للتوافق مع الكود القديم =====
  if (method === 'POST' && path === '/api/push/subscribe') {
    return handleLegacySubscribe(request, env);
  }

  if (method === 'POST' && path === '/api/push/unsubscribe') {
    return handleLegacyUnsubscribe(request, env);
  }

  if (method === 'GET' && path === '/api/push/vapid-key') {
    // لم نعد نحتاج VAPID مع FCM
    return jsonResponse({ 
      message: 'VAPID not needed with FCM',
      useFCM: true
    });
  }

  return errorResponse('Not Found', 404);
}

/**
 * تسجيل FCM Token جديد
 * يحذف الـ tokens القديمة لنفس المتجر ونوع الجهاز لتجنب الإشعارات المكررة
 */
async function handleRegisterToken(request: Request, env: Env): Promise<Response> {
  try {
    const { storeId, fcmToken, deviceType, deviceInfo } = await request.json() as FCMTokenRequest;
    
    if (!storeId || !fcmToken) {
      return errorResponse('Missing storeId or fcmToken', 400);
    }

    const timestamp = new Date().toISOString();
    const type = deviceType || 'web';

    // حذف جميع الـ tokens القديمة لنفس المتجر ونوع الجهاز (لتجنب التكرار)
    await env.DB.prepare(
      'DELETE FROM fcm_tokens WHERE store_id = ? AND device_type = ?'
    ).bind(storeId, type).run();

    // حذف الـ token إذا كان مسجل لمتجر آخر
    await env.DB.prepare(
      'DELETE FROM fcm_tokens WHERE fcm_token = ?'
    ).bind(fcmToken).run();

    // إضافة الـ token الجديد
    await env.DB.prepare(`
      INSERT INTO fcm_tokens (store_id, fcm_token, device_type, device_info, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      storeId, 
      fcmToken, 
      type, 
      deviceInfo || null, 
      timestamp,
      timestamp
    ).run();

    return jsonResponse({ 
      success: true, 
      message: 'FCM token registered successfully' 
    });
  } catch (error) {
    console.error('Register token error:', error);
    return errorResponse('Failed to register token', 500);
  }
}

/**
 * إلغاء تسجيل FCM Token
 */
async function handleUnregisterToken(request: Request, env: Env): Promise<Response> {
  try {
    const { fcmToken } = await request.json() as { fcmToken: string };
    
    if (!fcmToken) {
      return errorResponse('Missing fcmToken', 400);
    }

    await env.DB.prepare(
      'DELETE FROM fcm_tokens WHERE fcm_token = ?'
    ).bind(fcmToken).run();

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Unregister token error:', error);
    return errorResponse('Failed to unregister token', 500);
  }
}

/**
 * إرسال إشعار لمتجر
 */
async function handleSendNotification(request: Request, env: Env): Promise<Response> {
  try {
    const { storeId, title, body, icon, image, data, clickAction } = 
      await request.json() as SendNotificationRequest;
    
    if (!storeId) {
      return errorResponse('Missing storeId', 400);
    }

    const result = await sendFCMToStore(env, storeId, {
      title: title || 'إشعار جديد',
      body: body || '',
      icon,
      image,
      data,
      clickAction,
    });

    return jsonResponse({ 
      success: true, 
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return errorResponse('Failed to send notification', 500);
  }
}

/**
 * إرسال إشعار تجريبي
 */
async function handleTestNotification(request: Request, env: Env): Promise<Response> {
  try {
    const { storeId, fcmToken } = await request.json() as { storeId?: string; fcmToken?: string };
    
    if (!storeId && !fcmToken) {
      return errorResponse('Missing storeId or fcmToken', 400);
    }

    if (fcmToken) {
      // إرسال لـ token محدد
      const result = await sendFCMNotification(env, fcmToken, {
        title: '🧪 إشعار تجريبي',
        body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
        data: { type: 'test' },
      });

      return jsonResponse({ 
        success: result.success, 
        messageId: result.messageId,
        error: result.error
      });
    } else if (storeId) {
      // إرسال لكل tokens المتجر
      const result = await sendFCMToStore(env, storeId, {
        title: '🧪 إشعار تجريبي',
        body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات',
        data: { type: 'test' },
      });

      return jsonResponse({ 
        success: true, 
        sent: result.sent,
        failed: result.failed
      });
    }

    return errorResponse('Invalid request', 400);
  } catch (error) {
    console.error('Test notification error:', error);
    return errorResponse('Failed to send test notification', 500);
  }
}

/**
 * الحصول على حالة التسجيل
 */
async function handleGetStatus(env: Env, storeId: string): Promise<Response> {
  try {
    const tokens = await env.DB.prepare(
      'SELECT fcm_token, device_type, created_at FROM fcm_tokens WHERE store_id = ?'
    ).bind(storeId).all<{ fcm_token: string; device_type: string; created_at: string }>();

    return jsonResponse({
      storeId,
      registeredDevices: tokens.results?.length || 0,
      enabled: (tokens.results?.length || 0) > 0,
      tokens: tokens.results?.map(t => ({
        token: t.fcm_token.substring(0, 20) + '...',
        deviceType: t.device_type,
        createdAt: t.created_at
      })) || []
    });
  } catch (error) {
    console.error('Get status error:', error);
    return errorResponse('Failed to get status', 500);
  }
}

/**
 * تنظيف الـ tokens المكررة - يبقي فقط أحدث token لكل متجر ونوع جهاز
 */
async function handleCleanupTokens(request: Request, env: Env): Promise<Response> {
  try {
    const { storeId } = await request.json() as { storeId?: string };
    
    // حذف الـ tokens المكررة - نبقي فقط الأحدث لكل store_id + device_type
    const query = storeId 
      ? `DELETE FROM fcm_tokens WHERE store_id = ? AND id NOT IN (
          SELECT MAX(id) FROM fcm_tokens WHERE store_id = ? GROUP BY store_id, device_type
        )`
      : `DELETE FROM fcm_tokens WHERE id NOT IN (
          SELECT MAX(id) FROM fcm_tokens GROUP BY store_id, device_type
        )`;
    
    if (storeId) {
      await env.DB.prepare(query).bind(storeId, storeId).run();
    } else {
      await env.DB.prepare(query).run();
    }

    // عد الـ tokens المتبقية
    const countQuery = storeId 
      ? 'SELECT COUNT(*) as count FROM fcm_tokens WHERE store_id = ?'
      : 'SELECT COUNT(*) as count FROM fcm_tokens';
    
    const result = storeId
      ? await env.DB.prepare(countQuery).bind(storeId).first<{ count: number }>()
      : await env.DB.prepare(countQuery).first<{ count: number }>();

    return jsonResponse({ 
      success: true, 
      message: 'Duplicate tokens cleaned up',
      remainingTokens: result?.count || 0
    });
  } catch (error) {
    console.error('Cleanup tokens error:', error);
    return errorResponse('Failed to cleanup tokens', 500);
  }
}

// ===== Legacy handlers للتوافق =====

async function handleLegacySubscribe(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { storeId?: string; fcmToken?: string; subscription?: unknown };
    
    // إذا كان FCM token
    if (body.fcmToken) {
      return handleRegisterToken(
        new Request(request.url, {
          method: 'POST',
          body: JSON.stringify({
            storeId: body.storeId,
            fcmToken: body.fcmToken,
          }),
        }),
        env
      );
    }

    // Legacy Web Push - نحفظه كـ FCM token مؤقتاً
    return jsonResponse({ 
      success: true, 
      message: 'Please upgrade to FCM for better notification support' 
    });
  } catch (error) {
    console.error('Legacy subscribe error:', error);
    return errorResponse('Failed to subscribe', 500);
  }
}

async function handleLegacyUnsubscribe(request: Request, env: Env): Promise<Response> {
  try {
    const { fcmToken } = await request.json() as { fcmToken?: string };
    
    if (fcmToken) {
      await env.DB.prepare(
        'DELETE FROM fcm_tokens WHERE fcm_token = ?'
      ).bind(fcmToken).run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Legacy unsubscribe error:', error);
    return errorResponse('Failed to unsubscribe', 500);
  }
}

export default { handlePush };
