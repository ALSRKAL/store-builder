/**
 * Firebase Cloud Messaging (FCM) Utility
 * إرسال إشعارات فورية عبر FCM HTTP v1 API
 */

import type { Env } from '../types';

// FCM Message interface
interface FCMMessage {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  clickAction?: string;
}

// FCM Response
interface FCMResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// JWT Header
interface JWTHeader {
  alg: string;
  typ: string;
}

// JWT Payload
interface JWTPayload {
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  scope: string;
}

/**
 * تحويل Base64 URL Safe
 */
function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * تحويل ArrayBuffer إلى Base64 URL Safe
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return base64UrlEncode(binary);
}

/**
 * تحويل PEM Private Key إلى CryptoKey
 */
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  // إزالة headers و footers
  const pemContents = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  // تحويل من Base64 إلى ArrayBuffer
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // استيراد المفتاح
  return crypto.subtle.importKey(
    'pkcs8',
    bytes.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}

/**
 * إنشاء JWT Token للـ FCM
 */
async function createJWT(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header: JWTHeader = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload: JWTPayload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // صالح لمدة ساعة
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // توقيع الـ JWT
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = arrayBufferToBase64Url(signature);
  return `${unsignedToken}.${signatureB64}`;
}

/**
 * الحصول على Access Token من Google OAuth
 */
async function getAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  const jwt = await createJWT(clientEmail, privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * إرسال إشعار FCM لـ token واحد
 */
export async function sendFCMNotification(
  env: Env,
  fcmToken: string,
  message: FCMMessage
): Promise<FCMResponse> {
  try {
    const projectId = env.FCM_PROJECT_ID || 'store-e82a9';
    const clientEmail = env.FCM_CLIENT_EMAIL || '';
    const privateKey = env.FCM_PRIVATE_KEY || '';

    console.log('FCM Config check:', {
      hasProjectId: !!projectId,
      hasClientEmail: !!clientEmail,
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey?.length || 0,
    });

    if (!clientEmail || !privateKey) {
      console.error('FCM credentials not configured');
      return { success: false, error: 'FCM not configured' };
    }

    // الحصول على Access Token
    console.log('Getting FCM access token...');
    const accessToken = await getAccessToken(clientEmail, privateKey);
    console.log('Access token obtained');

    // بناء الرسالة
    const fcmPayload = {
      message: {
        token: fcmToken,
        notification: {
          title: message.title,
          body: message.body,
          ...(message.image ? { image: message.image } : {}),
        },
        webpush: {
          notification: {
            icon: message.icon || '/favicon.svg',
            badge: '/notification-badge.svg',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: 'new-order-' + Date.now(),
          },
          fcm_options: {
            link: message.clickAction || '/admin/dashboard?tab=orders',
          },
        },
        data: message.data || {},
        android: {
          priority: 'high' as const,
          notification: {
            sound: 'default',
            channelId: 'orders',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      },
    };

    // إرسال الإشعار
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json() as { error?: { message?: string } };
      const errorMessage = errorData.error?.message || 'Unknown error';
      
      // إذا كان الـ token غير صالح، نحذفه
      if (response.status === 404 || response.status === 400) {
        return { success: false, error: 'invalid_token' };
      }
      
      return { success: false, error: errorMessage };
    }

    const result = await response.json() as { name: string };
    return { success: true, messageId: result.name };
  } catch (error) {
    console.error('FCM send error:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * إرسال إشعار لجميع tokens الخاصة بمتجر
 */
export async function sendFCMToStore(
  env: Env,
  storeId: string,
  message: FCMMessage
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  try {
    console.log('sendFCMToStore called for store:', storeId);
    
    // جلب جميع FCM tokens للمتجر
    const tokens = await env.DB.prepare(
      'SELECT fcm_token FROM fcm_tokens WHERE store_id = ?'
    ).bind(storeId).all<{ fcm_token: string }>();

    console.log('FCM tokens found:', tokens.results?.length || 0);

    if (!tokens.results?.length) {
      console.log('No FCM tokens for store:', storeId);
      return { sent: 0, failed: 0, invalidTokens: [] };
    }

    let sent = 0;
    const invalidTokens: string[] = [];

    // إرسال لكل token
    for (const { fcm_token } of tokens.results) {
      console.log('Sending FCM to token:', fcm_token.substring(0, 20) + '...');
      const result = await sendFCMNotification(env, fcm_token, message);
      console.log('FCM result:', result);
      
      if (result.success) {
        sent++;
      } else if (result.error === 'invalid_token') {
        invalidTokens.push(fcm_token);
      }
    }

    // حذف الـ tokens غير الصالحة
    if (invalidTokens.length > 0) {
      for (const token of invalidTokens) {
        await env.DB.prepare(
          'DELETE FROM fcm_tokens WHERE fcm_token = ?'
        ).bind(token).run();
      }
    }

    console.log('FCM send complete:', { sent, failed: invalidTokens.length });
    return { sent, failed: invalidTokens.length, invalidTokens };
  } catch (error) {
    console.error('sendFCMToStore error:', error);
    return { sent: 0, failed: 0, invalidTokens: [] };
  }
}

export default { sendFCMNotification, sendFCMToStore };
