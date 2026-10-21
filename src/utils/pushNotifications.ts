/**
 * نظام الإشعارات الفورية (Push Notifications)
 * يستخدم Firebase Cloud Messaging (FCM)
 * يعمل على الكمبيوتر والهاتف (Android/iOS)
 * Type-safe implementation
 */

import { getFCMToken, onFCMMessage } from '../config/firebase';

// Device info interface
export interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  iOSVersion: number;
  supportsNotifications: boolean;
  supportsServiceWorker: boolean;
  iOSSupportsNotifications: boolean;
  fullSupport: boolean;
}

// Store notification config
export interface StoreNotificationConfig {
  storeId?: string;
  storeName: string;
  storeLogo: string | null;
  updatedAt?: number;
}

// Permission result
export interface PermissionResult {
  granted: boolean;
  reason?: 'unsupported' | 'denied' | 'dismissed';
}

// Subscribe result
export interface SubscribeResult {
  success: boolean;
  error?: string;
}

// Subscription status
export interface SubscriptionStatus {
  subscribed: boolean;
  supported: boolean;
  permission?: NotificationPermission;
}

// Local notification options
export interface LocalNotificationOptions {
  body?: string;
  icon?: string;
  tag?: string;
  storeId?: string;
  data?: Record<string, unknown>;
  silent?: boolean;
}

// Extended navigator for standalone check
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

// Extended window for webkit AudioContext
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// متغير لحفظ Service Worker Registration
let swRegistration: ServiceWorkerRegistration | null = null;

// مفتاح حفظ بيانات المتجر للإشعارات
const STORE_NOTIFICATION_KEY = 'store_notification_config';

/**
 * الحصول على معلومات الجهاز
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent || '';

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const isAndroid = /Android/.test(ua);

  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorStandalone).standalone === true ||
    document.referrer.includes('android-app://');

  let iOSVersion = 0;
  if (isIOS) {
    const match = ua.match(/OS (\d+)_(\d+)/);
    if (match?.[1] && match[2]) {
      iOSVersion = parseFloat(`${match[1]}.${match[2]}`);
    }
  }

  const supportsNotifications = 'Notification' in window;
  const supportsServiceWorker = 'serviceWorker' in navigator;

  const iOSSupportsNotifications = isIOS && isPWA && iOSVersion >= 16.4;

  return {
    isIOS,
    isAndroid,
    isPWA,
    iOSVersion,
    supportsNotifications,
    supportsServiceWorker,
    iOSSupportsNotifications,
    fullSupport: supportsNotifications && supportsServiceWorker && (!isIOS || iOSSupportsNotifications),
  };
}

/**
 * حفظ بيانات المتجر للإشعارات
 */
export function saveStoreNotificationConfig(storeId: string, config: Partial<StoreNotificationConfig>): boolean {
  try {
    const data: StoreNotificationConfig = {
      storeId,
      storeName: config.storeName ?? 'متجرك',
      storeLogo: config.storeLogo ?? null,
      updatedAt: Date.now(),
    };
    localStorage.setItem(`${STORE_NOTIFICATION_KEY}_${storeId}`, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * جلب بيانات المتجر للإشعارات
 */
export function getStoreNotificationConfig(storeId: string): StoreNotificationConfig {
  try {
    const data = localStorage.getItem(`${STORE_NOTIFICATION_KEY}_${storeId}`);
    if (data) {
      return JSON.parse(data) as StoreNotificationConfig;
    }
  } catch {
    // Return default on error
  }
  return { storeName: 'متجرك', storeLogo: null };
}

/**
 * التحقق من دعم المتصفح للإشعارات
 */
export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * الحصول على حالة الإذن الحالية
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/**
 * طلب إذن الإشعارات
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (!('Notification' in window)) {
    return { granted: false, reason: 'unsupported' };
  }

  if (Notification.permission === 'granted') {
    return { granted: true };
  }

  if (Notification.permission === 'denied') {
    return { granted: false, reason: 'denied' };
  }

  const permission = await Notification.requestPermission();
  return {
    granted: permission === 'granted',
    reason: permission === 'denied' ? 'denied' : 'dismissed',
  };
}

/**
 * تسجيل Service Worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const existingReg = await navigator.serviceWorker.getRegistration('/');
    if (existingReg) {
      swRegistration = existingReg;
      return existingReg;
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    swRegistration = registration;
    return registration;
  } catch {
    return null;
  }
}

/**
 * الحصول على Service Worker Registration
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg) {
        swRegistration = reg;
        return reg;
      }
      return await registerServiceWorker();
    } catch {
      // Return null on error
    }
  }
  return null;
}


/**
 * الاشتراك في الإشعارات مع FCM
 */
export async function subscribeToPush(
  storeId: string,
  storeConfig: Partial<StoreNotificationConfig> = {}
): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    return { success: false, error: 'Notifications not supported' };
  }

  try {
    const { granted, reason } = await requestNotificationPermission();
    if (!granted) {
      return { success: false, error: `Permission ${reason ?? 'unknown'}` };
    }

    // الحصول على FCM Token (يسجل الـ SW تلقائياً)
    console.log('Getting FCM token for store:', storeId);
    const fcmToken = await getFCMToken();
    
    if (!fcmToken) {
      console.error('Failed to get FCM token');
      return { success: false, error: 'Failed to get notification token' };
    }

    console.log('FCM token obtained, registering with API...');
    
    // تسجيل الـ FCM Token في الـ API
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
      const response = await fetch(`${API_URL}/api/push/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          fcmToken,
          deviceType: getDeviceInfo().isAndroid ? 'android' : getDeviceInfo().isIOS ? 'ios' : 'web',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to register FCM token:', errorText);
      } else {
        console.log('FCM token registered successfully');
      }
    } catch (error) {
      console.error('FCM registration error:', error);
    }

    // حفظ الـ token محلياً
    localStorage.setItem(`fcm_token_${storeId}`, fcmToken);

    // حفظ حالة الاشتراك محلياً
    localStorage.setItem(`notifications_enabled_${storeId}`, 'true');

    // حفظ بيانات المتجر للإشعارات
    if (storeConfig.storeName || storeConfig.storeLogo) {
      saveStoreNotificationConfig(storeId, storeConfig);
    }

    // الاستماع للرسائل عندما التطبيق مفتوح
    onFCMMessage((payload) => {
      console.log('FCM foreground message received:', payload);
      
      // إرسال رسالة للـ window لتحديث الطلبات
      window.postMessage({ 
        type: 'NEW_ORDER_RECEIVED',
        data: payload.data || {}
      }, '*');
      
      if (payload.notification) {
        showLocalNotification(payload.notification.title || 'إشعار جديد', {
          body: payload.notification.body,
          storeId,
        });
        playNotificationSound();
      }
    });

    return { success: true };
  } catch (error) {
    console.error('subscribeToPush error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * إلغاء الاشتراك
 */
export async function unsubscribeFromPush(storeId: string): Promise<SubscribeResult> {
  try {
    const fcmToken = localStorage.getItem(`fcm_token_${storeId}`);
    
    if (fcmToken) {
      // إلغاء التسجيل من الـ API
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
        await fetch(`${API_URL}/api/push/unregister`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken }),
        });
      } catch (error) {
        console.error('FCM unregister error:', error);
      }
      
      localStorage.removeItem(`fcm_token_${storeId}`);
    }
    
    localStorage.removeItem(`notifications_enabled_${storeId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * التحقق من حالة الاشتراك
 */
export async function checkSubscriptionStatus(storeId: string): Promise<SubscriptionStatus> {
  if (!isPushSupported()) {
    return { subscribed: false, supported: false };
  }

  const isEnabled = localStorage.getItem(`notifications_enabled_${storeId}`) === 'true';
  const permission = Notification.permission;

  return {
    subscribed: isEnabled && permission === 'granted',
    supported: true,
    permission,
  };
}

/**
 * إرسال إشعار - يعمل على الكمبيوتر والهاتف
 */
export async function showLocalNotification(
  title: string,
  options: LocalNotificationOptions = {}
): Promise<boolean> {
  if (Notification.permission !== 'granted') {
    const { granted } = await requestNotificationPermission();
    if (!granted) return false;
  }

  try {
    const storeId = options.storeId;
    let icon = options.icon ?? '/favicon.svg';

    if (storeId) {
      const config = getStoreNotificationConfig(storeId);
      if (config.storeLogo) {
        icon = config.storeLogo;
      }
    }

    const registration = await getServiceWorkerRegistration();

    if (registration) {
      await registration.showNotification(title, {
        icon,
        badge: '/notification-badge.svg',
        requireInteraction: true,
        tag: options.tag ?? 'notification-' + Date.now(),
        body: options.body ?? '',
        data: options.data ?? {},
        silent: options.silent ?? false,
      });
      return true;
    }

    // Fallback
    new Notification(title, {
      icon,
      body: options.body ?? '',
    });

    return true;
  } catch {
    try {
      new Notification(title, { icon: '/favicon.svg', body: options.body ?? '' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * تشغيل صوت الإشعار
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();

    const frequencies = [523.25, 659.25, 783.99];

    frequencies.forEach((freq, i) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.3);

      oscillator.start(audioContext.currentTime + i * 0.15);
      oscillator.stop(audioContext.currentTime + i * 0.15 + 0.3);
    });
  } catch {
    // Silently fail
  }
}

/**
 * الاستماع لرسائل Service Worker
 */
export function onServiceWorkerMessage(callback: (data: unknown) => void): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      callback(event.data);
    });
  }
}
