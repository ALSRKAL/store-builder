/**
 * Notification Service
 * خدمة الإشعارات - Web Push + WhatsApp
 * Type-safe implementation
 */

// Notification permission type
export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// Notification options interface
export interface LocalNotificationOptions extends NotificationOptions {
  onClick?: () => void;
}

// Order notification data
export interface OrderNotificationData {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  itemsCount: number;
  total: number;
  currency: string;
}

// Notification settings interface
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
}

// التحقق من دعم الإشعارات
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// طلب إذن الإشعارات
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch {
    return false;
  }
};

// التحقق من حالة الإذن
export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

// إرسال إشعار محلي
export const sendLocalNotification = (
  title: string,
  options: LocalNotificationOptions = {}
): Notification | null => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  const { onClick, ...notificationOptions } = options;

  const defaultOptions: NotificationOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
    ...notificationOptions,
  };

  try {
    const notification = new Notification(title, defaultOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };

    // إغلاق تلقائي بعد 10 ثواني
    setTimeout(() => notification.close(), 10000);

    return notification;
  } catch {
    return null;
  }
};

// إشعار طلب جديد
export const notifyNewOrder = (order: OrderNotificationData): Notification | null => {
  const title = `طلب جديد #${order.orderNumber}`;
  const body = `${order.customerName} - ${order.itemsCount} منتج - ${order.total} ${order.currency}`;

  return sendLocalNotification(title, {
    body,
    tag: `order-${order.id}`,
    data: { orderId: order.id, type: 'new_order' },
  });
};

// Extended AudioContext type for webkit prefix
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// تشغيل صوت الإشعار
export const playNotificationSound = (): void => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();

    // تأثير صوتي متدرج
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.stop(audioContext.currentTime + 0.5);

    // صوت ثاني
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start();
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 200);
  } catch {
    // Silently fail
  }
};

// إرسال رسالة واتساب للتاجر عند طلب جديد
export const sendWhatsAppNotification = (
  whatsappNumber: string | null | undefined,
  order: OrderNotificationData
): string | null => {
  if (!whatsappNumber) return null;

  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');

  const message = `*إشعار طلب جديد*

━━━━━━━━━━━━━━━
رقم الطلب: *#${order.orderNumber}*
التاريخ: ${new Date().toLocaleString('ar-SA-u-nu-latn')}

العميل: ${order.customerName}
الهاتف: ${order.customerPhone}
${order.customerAddress ? `العنوان: ${order.customerAddress}` : ''}

المبلغ: *${order.total} ${order.currency}*
عدد المنتجات: ${order.itemsCount}

━━━━━━━━━━━━━━━
افتح لوحة التحكم لمراجعة الطلب`;

  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  return whatsappUrl;
};

// تخزين إعدادات الإشعارات
export const saveNotificationSettings = (settings: NotificationSettings): void => {
  localStorage.setItem('notification_settings', JSON.stringify(settings));
};

export const getNotificationSettings = (): NotificationSettings => {
  const saved = localStorage.getItem('notification_settings');
  if (saved) {
    try {
      return JSON.parse(saved) as NotificationSettings;
    } catch {
      // Return default on parse error
    }
  }
  return {
    enabled: true,
    sound: true,
    desktop: true,
  };
};
