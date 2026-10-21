/**
 * نظام تذكير الطلبات الجديدة
 * يرسل تذكير كل ساعة للطلبات التي لم يتم الرد عليها
 * Type-safe implementation
 */

import { showLocalNotification, playNotificationSound, checkSubscriptionStatus } from './pushNotifications';

// مفاتيح التخزين
const REMINDER_INTERVAL_KEY = 'order_reminder_interval';
const LAST_REMINDER_KEY = 'last_order_reminder';
const PENDING_ORDERS_KEY = 'pending_orders_reminder';

// الفترة بين التذكيرات (ساعة واحدة = 3600000 مللي ثانية)
const REMINDER_INTERVAL = 60 * 60 * 1000;

// متغير لحفظ الـ interval
let reminderIntervalId: ReturnType<typeof setInterval> | null = null;

// Type for getNewOrdersCount function
type GetNewOrdersCountFn = () => Promise<number>;

/**
 * بدء نظام التذكير
 */
export function startOrderReminder(storeId: string, getNewOrdersCount: GetNewOrdersCountFn): void {
  // إيقاف أي تذكير سابق
  stopOrderReminder();

  // التحقق من تفعيل الإشعارات
  void checkSubscriptionStatus(storeId).then((status) => {
    if (!status.subscribed) {
      return;
    }

    // تشغيل التذكير
    reminderIntervalId = setInterval(() => {
      void checkAndRemind(storeId, getNewOrdersCount);
    }, REMINDER_INTERVAL);

    // حفظ معرف الـ interval
    localStorage.setItem(REMINDER_INTERVAL_KEY, 'active');
  });
}

/**
 * إيقاف نظام التذكير
 */
export function stopOrderReminder(): void {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
  }
  localStorage.removeItem(REMINDER_INTERVAL_KEY);
}

/**
 * التحقق وإرسال التذكير
 */
async function checkAndRemind(storeId: string, getNewOrdersCount: GetNewOrdersCountFn): Promise<void> {
  try {
    const newOrdersCount = await getNewOrdersCount();

    if (newOrdersCount > 0) {
      const lastReminder = localStorage.getItem(LAST_REMINDER_KEY);
      const now = Date.now();

      if (!lastReminder || now - parseInt(lastReminder, 10) >= REMINDER_INTERVAL) {
        await sendReminder(storeId, newOrdersCount);
        localStorage.setItem(LAST_REMINDER_KEY, now.toString());
      }
    }
  } catch {
    // Silently fail
  }
}

/**
 * إرسال تذكير
 */
async function sendReminder(storeId: string, count: number): Promise<void> {
  const title =
    count === 1 ? '⏰ تذكير: لديك طلب جديد!' : `⏰ تذكير: لديك ${count} طلبات جديدة!`;

  const body =
    count === 1
      ? 'لم تقم بالرد على الطلب الجديد بعد. اضغط لعرض الطلب.'
      : `لم تقم بالرد على ${count} طلبات جديدة. اضغط لعرض الطلبات.`;

  await showLocalNotification(title, {
    body,
    tag: 'order-reminder',
    storeId,
    data: {
      type: 'order_reminder',
      url: '/admin/dashboard?tab=orders',
    },
  });

  playNotificationSound();
}

/**
 * تحديث عدد الطلبات الجديدة (يُستدعى عند تغيير حالة طلب)
 */
export function updatePendingOrdersCount(count: number): void {
  localStorage.setItem(PENDING_ORDERS_KEY, count.toString());

  if (count === 0) {
    localStorage.removeItem(LAST_REMINDER_KEY);
  }
}

/**
 * التحقق الفوري وإرسال تذكير إذا لزم الأمر
 */
export async function checkImmediateReminder(storeId: string, newOrdersCount: number): Promise<void> {
  if (newOrdersCount === 0) return;

  const status = await checkSubscriptionStatus(storeId);
  if (!status.subscribed) return;

  const lastReminder = localStorage.getItem(LAST_REMINDER_KEY);
  const now = Date.now();

  if (!lastReminder || now - parseInt(lastReminder, 10) >= REMINDER_INTERVAL) {
    await sendReminder(storeId, newOrdersCount);
    localStorage.setItem(LAST_REMINDER_KEY, now.toString());
  }
}

/**
 * إعادة تعيين التذكير (عند الرد على جميع الطلبات)
 */
export function resetReminder(): void {
  localStorage.removeItem(LAST_REMINDER_KEY);
  localStorage.removeItem(PENDING_ORDERS_KEY);
}
