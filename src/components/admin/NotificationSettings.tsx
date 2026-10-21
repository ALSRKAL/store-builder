/**
 * NotificationSettings — إشعارات الطلبات (الخطة السنوية).
 * أُزيلت التدرّجات والإيموجي من الواجهة ومن عناوين الإشعارات، وبقيت كل خطوات
 * iOS ورسائل الأخطاء كما هي.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Apple,
  Bell,
  BellOff,
  Check,
  Download,
  Loader2,
  Monitor,
  Plus,
  Share,
  Smartphone,
} from 'lucide-react';
import {
  checkSubscriptionStatus,
  getDeviceInfo,
  getNotificationPermission,
  isPushSupported,
  playNotificationSound,
  registerServiceWorker,
  saveStoreNotificationConfig,
  showLocalNotification,
  subscribeToPush,
  unsubscribeFromPush,
} from '../../utils/pushNotifications';
import { cn } from '../../lib/utils';
import { Button } from '../ui';

interface DeviceInfo {
  isIOS: boolean;
  isPWA: boolean;
  iOSVersion: number;
}

interface NotificationSettingsProps {
  storeId?: string | undefined;
  storeName?: string | undefined;
  storeLogo?: string | undefined;
}

export default function NotificationSettings({ storeId, storeName, storeLogo }: NotificationSettingsProps): React.JSX.Element {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({ isIOS: false, isPWA: false, iOSVersion: 0 });

  const checkStatus = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const info = getDeviceInfo();
      setDeviceInfo(info);
      const isSupported = isPushSupported();
      setSupported(isSupported);
      if (isSupported) {
        setPermission(getNotificationPermission());
        if (storeId) {
          const status = await checkSubscriptionStatus(storeId);
          setSubscribed(status.subscribed);
        }
      }
    } catch (err) {
      console.error('Error checking notification status:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (storeId && (storeName ?? storeLogo)) {
      saveStoreNotificationConfig(storeId, { storeName: storeName ?? 'متجرك', storeLogo: storeLogo ?? null });
    }
  }, [storeId, storeName, storeLogo]);

  const enable = async (): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      await registerServiceWorker();
      const result = await subscribeToPush(storeId ?? '', { storeName: storeName ?? 'متجرك', storeLogo: storeLogo ?? null });
      if (result.success) {
        setSubscribed(true);
        setPermission('granted');
        await showLocalNotification('تم تفعيل الإشعارات', {
          body: 'ستصلك إشعارات عند وصول طلبات جديدة',
          tag: 'welcome',
          ...(storeId ? { storeId } : {}),
          icon: storeLogo ?? '/favicon.svg',
        });
        playNotificationSound();
      } else if (result.error === 'Permission denied') {
        setError('تم رفض إذن الإشعارات. يرجى تفعيلها من إعدادات المتصفح.');
        setPermission('denied');
      } else {
        setError(result.error ?? 'فشل في تفعيل الإشعارات');
      }
    } catch (err) {
      console.error('Enable notifications error:', err);
      setError('حدث خطأ أثناء تفعيل الإشعارات');
    } finally {
      setActionLoading(false);
    }
  };

  const disable = async (): Promise<void> => {
    setActionLoading(true);
    try {
      await unsubscribeFromPush(storeId ?? '');
      setSubscribed(false);
    } catch (err) {
      console.error('Disable notifications error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const test = async (): Promise<void> => {
    try {
      await showLocalNotification('إشعار تجريبي', {
        body: 'هذا إشعار تجريبي للتأكد من عمل الإشعارات.',
        tag: `test-${Date.now()}`,
        ...(storeId ? { storeId } : {}),
        icon: storeLogo ?? '/favicon.svg',
      });
      playNotificationSound();
    } catch (err) {
      console.error('Test notification error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 border-y border-border py-10 text-label text-fg-muted">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        جاري التحقق…
      </div>
    );
  }

  if (deviceInfo.isIOS && !deviceInfo.isPWA) {
    return (
      <div>
        <div className="flex items-center gap-2 border-b border-border pb-3 text-foreground">
          <Apple className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
          <h4 className="text-label font-semibold">تفعيل الإشعارات على iPhone</h4>
        </div>
        <p className="mt-3 text-label leading-relaxed text-fg-muted">
          لتفعيل الإشعارات على iPhone، أضف التطبيق إلى الشاشة الرئيسية أولاً.
        </p>
        {deviceInfo.iOSVersion < 16.4 ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-danger/25 bg-danger/5 px-3 py-2.5 text-label text-danger">
            <AlertCircle className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            يتطلب iOS 16.4 أو أحدث. إصدارك الحالي: {deviceInfo.iOSVersion}
          </div>
        ) : null}
        <ol className="mt-3 divide-y divide-border border-y border-border">
          {[
            { icon: Share, text: 'اضغط زر المشاركة (Share) في Safari' },
            { icon: Plus, text: 'اختر «إضافة إلى الشاشة الرئيسية»' },
            { icon: Check, text: 'اضغط «إضافة» في الأعلى' },
            { icon: Bell, text: 'افتح التطبيق من الشاشة الرئيسية وفعّل الإشعارات' },
          ].map((step) => (
            <li key={step.text} className="flex items-start gap-2.5 py-2.5 text-label text-fg-muted">
              <step.icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" strokeWidth={1.75} aria-hidden />
              {step.text}
            </li>
          ))}
        </ol>
        <p className="mt-3 flex items-center gap-2 text-[11px] text-fg-muted">
          <Download className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          بعد الإضافة تعمل الإشعارات حتى عند إغلاق التطبيق.
        </p>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="border-y border-border py-5">
        <BellOff className="size-5 text-fg-subtle" strokeWidth={1.75} aria-hidden />
        <h4 className="mt-2 text-label font-semibold text-foreground">الإشعارات غير مدعومة</h4>
        <p className="mt-1 text-label text-fg-muted">متصفحك لا يدعم الإشعارات الفورية.</p>
        <p className="mt-2 text-[11px] leading-relaxed text-fg-subtle">
          جرّب Chrome أو Firefox على أندرويد/الكمبيوتر، أو Safari على iPhone بعد إضافة التطبيق للشاشة الرئيسية.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="border-b border-border pb-3 text-label leading-relaxed text-fg-muted">
        احصل على إشعار فوري عند وصول طلب جديد إلى متجرك.
      </p>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/5 px-3 py-2.5 text-label text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {error}
        </div>
      ) : null}

      {permission === 'denied' ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 px-3 py-2.5 text-label text-warning">
          <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <div>
            <strong className="block font-semibold">تم حظر الإشعارات</strong>
            <p className="mt-0.5">اسمح بالإشعارات من أيقونة القفل بجانب عنوان الموقع.</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-y border-border py-3">
        <div className="flex items-center gap-2 text-label text-fg-muted">
          {subscribed ? <Check className="size-4 text-success" strokeWidth={2} aria-hidden /> : <BellOff className="size-4" strokeWidth={1.75} aria-hidden />}
          الحالة: <strong className={cn('font-semibold', subscribed ? 'text-success' : 'text-fg-muted')}>{subscribed ? 'مفعّلة' : 'معطّلة'}</strong>
        </div>
        <div className="flex items-center gap-3 text-fg-subtle">
          <Smartphone className="size-4" strokeWidth={1.75} aria-label="الهاتف" />
          <Monitor className="size-4" strokeWidth={1.75} aria-label="الكمبيوتر" />
        </div>
      </div>

      {deviceInfo.isIOS && deviceInfo.isPWA ? (
        <p className="text-label text-success">
          أنت تستخدم التطبيق من الشاشة الرئيسية — ممتاز.
        </p>
      ) : null}

      {subscribed ? (
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={() => void test()} className="gap-2">
            <Bell className="size-4" strokeWidth={1.75} aria-hidden />
            إرسال إشعار تجريبي
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void disable()}
            disabled={actionLoading}
            className="gap-2"
          >
            {actionLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <BellOff className="size-4" strokeWidth={1.75} aria-hidden />}
            تعطيل الإشعارات
          </Button>
        </div>
      ) : (
        <Button type="button" onClick={() => void enable()} disabled={actionLoading || permission === 'denied'} className="gap-2">
          {actionLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Bell className="size-4" strokeWidth={1.75} aria-hidden />}
          {actionLoading ? 'جاري التفعيل…' : 'تفعيل الإشعارات'}
        </Button>
      )}

      <p className="border-t border-border pt-3 text-[11px] text-fg-subtle">
        الإشعارات تعمل حتى عندما يكون المتصفح مغلقاً.
      </p>
    </div>
  );
}
