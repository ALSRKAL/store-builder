/**
 * Contact Configuration
 * Admin WhatsApp and messaging utilities
 */

// رقم الواتساب - يتم جلبه من API
let ADMIN_WHATSAPP = '';

// API URL
const API_URL = import.meta.env.VITE_API_URL ?? 'https://store-api.storecolection947.workers.dev';

// Settings response interface
interface SettingsResponse {
  adminWhatsApp?: string;
}

// تحميل رقم الواتساب من API
export async function loadAdminWhatsApp(): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/flutter-admin/settings`);
    if (response.ok) {
      const data = (await response.json()) as SettingsResponse;
      if (data.adminWhatsApp) {
        ADMIN_WHATSAPP = data.adminWhatsApp;
      }
    }
  } catch (error) {
    console.error('Error loading admin WhatsApp:', error);
  }
  return ADMIN_WHATSAPP;
}

// الحصول على رقم الواتساب الحالي
export function getAdminWhatsApp(): string {
  return ADMIN_WHATSAPP;
}

// تعيين رقم الواتساب (للاستخدام من الإعدادات)
export function setAdminWhatsApp(number: string): void {
  ADMIN_WHATSAPP = number;
}

// WhatsApp message keys
export type WhatsAppMessageKey =
  | 'getSubscription'
  | 'renewSubscription'
  | 'upgrade'
  | 'support'
  | 'requestApp';

// رسائل الواتساب الافتراضية
export const WHATSAPP_MESSAGES: Record<WhatsAppMessageKey, string> = {
  getSubscription: 'مرحباً، أريد الحصول على رمز اشتراك جديد',
  renewSubscription: 'أريد تجديد اشتراكي',
  upgrade: 'أريد ترقية اشتراكي',
  support: 'أحتاج مساعدة',
  requestApp: 'أريد تحويل متجري إلى تطبيق هاتف',
};

// App price interface
export interface AppPrice {
  name: string;
  price: number;
  yearlyFee: number;
  yearlyNote: string;
  features: string[];
}

// App price keys
export type AppPriceKey = 'android' | 'ios' | 'both';

// أسعار تطبيقات الهاتف (بالريال السعودي كأساس)
export const APP_PRICES: Record<AppPriceKey, AppPrice> = {
  android: {
    name: 'أندرويد',
    price: 800,
    yearlyFee: 100,
    yearlyNote: 'رسوم Google Play',
    features: [
      'تطبيق أندرويد كامل',
      'نشر على Google Play',
      'إشعارات فورية',
      'تحديثات مجانية',
    ],
  },
  ios: {
    name: 'آيفون',
    price: 1200,
    yearlyFee: 400,
    yearlyNote: 'رسوم Apple Developer',
    features: [
      'تطبيق iOS كامل',
      'نشر على App Store',
      'إشعارات فورية',
      'تحديثات مجانية',
    ],
  },
  both: {
    name: 'أندرويد + آيفون',
    price: 1800,
    yearlyFee: 500,
    yearlyNote: 'رسوم Apple + Google',
    features: [
      'تطبيق أندرويد وiOS',
      'نشر على المتجرين',
      'إشعارات فورية',
      'تحديثات مجانية',
      'وفّر 200',
    ],
  },
};

export const APP_YEARLY_NOTE = 'رسوم المتاجر الرسمية (منفصلة عن اشتراك المتجر)';

// دالة لإنشاء رابط الواتساب
export function getWhatsAppLink(message = '', storeName: string | null | undefined = ''): string {
  let finalMessage = message;
  if (storeName) {
    finalMessage += ` - المتجر: ${storeName}`;
  }
  return `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(finalMessage)}`;
}

// تصدير الرقم للتوافق مع الكود القديم
export { ADMIN_WHATSAPP };
