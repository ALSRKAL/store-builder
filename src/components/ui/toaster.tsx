import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { useLocation } from 'react-router-dom';
import {
  Toast,
  ToastAction,
  ToastDescription,
  ToastProviderRoot,
  ToastTitle,
  type ToastVariant,
} from './toast';
import { useIsRTL } from '../../lib/rtl';
import { storeScopeStyle } from '../../utils/themeUtils';

/**
 * Toaster — المخزن والـ API لنظام التنبيهات.
 *
 * الاستخدام من أي مكان (حتى خارج مكوّنات React، مثل داخل catch في مستدعٍ غير متزامن):
 *   import { toast } from '../../components/ui/toaster';
 *   toast.success('تم حفظ المنتج');
 *   toast.error('تعذّر الحفظ', 'تحقّق من اتصالك ثم أعد المحاولة');
 *   toast({ title: 'تم النسخ', variant: 'info', duration: 2000 });
 *
 * التصميم: مخزن وحيد على مستوى الوحدة يعتمد useSyncExternalStore، فلا حاجة
 * لـ Context ولا لتمرير دوال عبر عشرات المستويات. تركيب <Toaster /> مرة واحدة
 * في جذر التطبيق يكفي.
 *
 * إزالة الإشعار على مرحلتين: أولاً `open=false` ليؤدي Radix حركة الخروج، ثم
 * الإزالة الفعلية بعد انتهاء المدة. الإزالة الفورية تقطع حركة الخروج.
 */

const EXIT_DURATION_MS = 250;

interface ToastRecord {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant: ToastVariant;
  duration: number;
  open: boolean;
  action?: { label: string; onClick: () => void };
}

export interface ToastOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** مدة البقاء بالمللي ثانية. `Infinity` يجعلها ثابتة حتى الإغلاق اليدوي. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

const DEFAULT_DURATION = 4500;

let toasts: ToastRecord[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastRecord[] {
  return toasts;
}

function updateRecords(next: ToastRecord[]): void {
  toasts = next;
  emit();
}

let counter = 0;
function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

/** إظهار تنبيه. يُرجع المعرّف لإغلاقه برمجياً لاحقاً. */
export function showToast(options: ToastOptions): string {
  const id = nextId();
  const record: ToastRecord = {
    id,
    title: options.title,
    variant: options.variant ?? 'default',
    duration: options.duration ?? DEFAULT_DURATION,
    open: true,
    ...(options.description !== undefined ? { description: options.description } : {}),
    ...(options.action !== undefined ? { action: options.action } : {}),
  };
  updateRecords([...toasts, record]);
  return id;
}

/** إغلاق تنبيه: يبدأ حركة الخروج ثم يُزيله من المخزن. */
export function dismissToast(id: string): void {
  const target = toasts.find((t) => t.id === id);
  if (!target || !target.open) return;

  updateRecords(toasts.map((t) => (t.id === id ? { ...t, open: false } : t)));

  window.setTimeout(() => {
    updateRecords(toasts.filter((t) => t.id !== id));
  }, EXIT_DURATION_MS);
}

/** إغلاق كل التنبيهات المعروضة. */
export function dismissAllToasts(): void {
  for (const record of toasts) {
    if (record.open) dismissToast(record.id);
  }
}

type ToastFn = {
  (options: ToastOptions): string;
  success: (title: React.ReactNode, description?: React.ReactNode, duration?: number) => string;
  error: (title: React.ReactNode, description?: React.ReactNode, duration?: number) => string;
  warning: (title: React.ReactNode, description?: React.ReactNode, duration?: number) => string;
  info: (title: React.ReactNode, description?: React.ReactNode, duration?: number) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

function makeShortcut(variant: ToastVariant) {
  return (title: React.ReactNode, description?: React.ReactNode, duration?: number): string =>
    showToast({
      title,
      variant,
      ...(description !== undefined ? { description } : {}),
      ...(duration !== undefined ? { duration } : {}),
    });
}

/** الواجهة العامة للاستخدام في كل المشروع. */
export const toast: ToastFn = Object.assign(
  (options: ToastOptions) => showToast(options),
  {
    success: makeShortcut('success'),
    error: makeShortcut('danger'),
    warning: makeShortcut('warning'),
    info: makeShortcut('info'),
    dismiss: dismissToast,
    dismissAll: dismissAllToasts,
  },
);

/** للاستخدام داخل مكوّنات React عند الحاجة لإعادة الرسم على التغييرات. */
export function useToastQueue(): ToastRecord[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * <Toaster /> — يُركّب مرة واحدة في جذر التطبيق.
 * في RTL يقع الشريط أسفل يمين الشاشة (start منطقي) وينزلق للإغلاق نحو اليمين.
 */
export function Toaster(): React.JSX.Element {
  const isRTL = useIsRTL();
  const records = useToastQueue();
  const { pathname } = useLocation();
  const inStore = pathname.startsWith('/store/');

  return (
    <ToastProviderRoot
      label="التنبيهات"
      swipeDirection={isRTL ? 'right' : 'left'}
      duration={DEFAULT_DURATION}
    >
      {records.map((record) => (
        <Toast
          key={record.id}
          open={record.open}
          onOpenChange={(open) => {
            if (!open) dismissToast(record.id);
          }}
          variant={record.variant}
          duration={record.duration}
          type="foreground"
        >
          <ToastTitle>{record.title}</ToastTitle>
          {record.description ? <ToastDescription>{record.description}</ToastDescription> : null}
          {record.action ? (
            <ToastAction
              altText={record.action.label}
              onClick={() => {
                record.action?.onClick();
                dismissToast(record.id);
              }}
            >
              {record.action.label}
            </ToastAction>
          ) : null}
        </Toast>
      ))}
      <ToastPrimitive.Viewport
        style={inStore ? storeScopeStyle : undefined}
        className={
          'fixed start-0 z-[200] flex max-h-dvh w-full flex-col gap-2 p-4 outline-none ' +
          // داخل المتجر نرفع التنبيه على الهاتف كي لا يغطي زر إتمام الطلب
          // الثابت أسفل درج السلة/نافذة الدفع، ونعيده لأسفل يمين على الشاشات الكبيرة.
          (inStore ? 'top-4 bottom-auto sm:top-auto sm:bottom-0 ' : 'bottom-0 ') +
          'pb-safe sm:max-w-[min(26rem,calc(100vw-2rem))]'
        }
      />
    </ToastProviderRoot>
  );
}