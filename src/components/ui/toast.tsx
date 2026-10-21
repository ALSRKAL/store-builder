import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle2, Info, TriangleAlert, X, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Toast — الطبقة التقديمية (Radix) لنظام التنبيهات.
 *
 * كان المشروع بلا أي نظام Toast: النجاح/الفشل كان يُعرض بـ `window.alert`
 * (20+ موضعاً في Dashboard) أو بنص سطري داخل كل مكوّن. هذا الملف يوفر العناصر،
 * و`toaster.tsx` يوفر المخزن والـ API (`toast.success(...)`).
 *
 * RTL: الشريط مثبّت بـ `start-0` (منطقي) فيقع أسفل يمين الشاشة في RTL، واتجاه
 * الانزلاق للحذف فيزيائي داخل Radix لذا نمرّره صريحاً كـ `left`.
 */

const ToastProviderRoot = ToastPrimitive.Provider;

const toastVariants = cva(
  cn(
    'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden',
    'rounded-lg border border-border bg-card p-4 shadow-overlay',
    'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=open]:fade-in-0',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-left-full',
    'data-[swipe=end]:animate-out data-[swipe=end]:fade-out-80 data-[swipe=end]:slide-out-to-left-full',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
    'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
    'duration-200',
  ),
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground',
        success: 'border-border bg-card text-card-foreground',
        warning: 'border-border bg-card text-card-foreground',
        danger: 'border-border bg-card text-card-foreground',
        info: 'border-border bg-card text-card-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

/** المفتاح الفعلي للـ variant بعد استبعاد null/undefined التي تضيفها cva. */
type ToastVariantKey = NonNullable<VariantProps<typeof toastVariants>['variant']>;

const iconByVariant: Record<ToastVariantKey, LucideIcon | null> = {
  default: null,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle,
  info: Info,
};

const iconToneByVariant: Record<ToastVariantKey, string> = {
  default: 'text-fg-muted',
  success: 'text-[var(--store-success-text)]',
  warning: 'text-warning',
  danger: 'text-[var(--store-danger-text)]',
  info: 'text-info',
};

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {
  /** إظهار أيقونة دلالية بحسب `variant`. */
  showIcon?: boolean;
}

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastProps>(
  ({ className, variant = 'default', showIcon = true, children, ...props }, ref) => {
    const current: ToastVariantKey = variant ?? 'default';
    const Icon = iconByVariant[current];
    return (
      <ToastPrimitive.Root
        ref={ref}
        className={cn(toastVariants({ variant: current }), className)}
        {...props}
      >
        {showIcon && Icon ? (
          <Icon className={cn('mt-0.5 size-5 shrink-0', iconToneByVariant[current])} strokeWidth={1.75} />
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
        <ToastPrimitive.Close
          aria-label="إغلاق التنبيه"
          className={cn(
            '-me-1 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-md',
            'text-fg-muted transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <X className="size-4" aria-hidden />
        </ToastPrimitive.Close>
      </ToastPrimitive.Root>
    );
  },
);
Toast.displayName = 'Toast';

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    className={cn('text-label font-semibold text-foreground', className)}
    {...props}
  />
));
ToastTitle.displayName = 'ToastTitle';

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn('mt-1 text-label text-fg-muted', className)}
    {...props}
  />
));
ToastDescription.displayName = 'ToastDescription';

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
            'mt-3 inline-flex h-11 items-center rounded-md border border-border bg-surface px-3',
      'text-label font-medium text-foreground transition-colors hover:bg-muted',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = 'ToastAction';

const ToastClose = ToastPrimitive.Close;

export {
  ToastProviderRoot,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  toastVariants,
};
export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;