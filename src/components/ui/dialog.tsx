import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Dialog — بديل موحّد للنوافذ المنبثقة.
 *
 * لماذا Radix: يحقّق ما لم يكن موجوداً في المشروع — حصر التركيز (focus trap)،
 * إرجاع التركيز للعنصر المُشغِّل عند الإغلاق، الإغلاق بـ Escape، وسم `aria-modal`
 * و`aria-labelledby` صحيح، وقفل تمرير الصفحة تلقائياً.
 *
 * الاتجاه: الواجهة عربية RTL، ونستخدم خصائص منطقية (`pe-*`, `end-*`) في الرأس
 * وزر الإغلاق، فيعمل المكوّن في الاتجاهين دون أي شرط.
 *
 * الحركة: تُدار بـ CSS عبر `data-[state]` (من tailwindcss-animate) لا بـ
 * framer-motion، حتى يبقى منطق الظهور/الإخفاء مملوكاً لـ Radix دون موازنة
 * AnimatePresence مع عمر المكوّن.
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-[100] bg-scrim/60',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      'duration-200',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

const dialogContentVariants = cva(
  cn(
    'fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2',
    'flex max-h-[92dvh] w-[calc(100vw-2rem)] flex-col rounded-xl',
    'border border-border bg-card text-card-foreground shadow-overlay',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    'duration-200',
  ),
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[min(64rem,calc(100vw-2rem))]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface DialogContentProps
  // `title` مأخوذ من سمات HTML كـ string؛ نستبعده لإعادة تعريفه كـ ReactNode.
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'>,
    VariantProps<typeof dialogContentVariants> {
  /** عنوان يُعرض في الرأس، ويُستخدم أيضاً لوسم النافذة لقارئ الشاشة. */
  title?: React.ReactNode;
  /** وصف مساعد تحت العنوان. */
  description?: React.ReactNode;
  /** إخفاء الرأس بصرياً مع إبقاء العنوان متاحاً لقارئ الشاشة. */
  hideHeader?: boolean;
  /** إخفاء زر الإغلاق — استخدمه فقط إن وفرت مخرجاً بديلاً واضحاً. */
  showClose?: boolean;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, title, description, hideHeader, showClose = true, size, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(dialogContentVariants({ size }), className)}
      {...props}
    >
      {title ? (
        <DialogPrimitive.Title
          className={cn(
            'shrink-0 border-b border-border py-4 ps-5 pe-14 font-display text-h3 font-semibold text-foreground',
            hideHeader && 'sr-only border-0 p-0',
          )}
        >
          {title}
        </DialogPrimitive.Title>
      ) : (
        // Radix يتطلّب Title لوسم النافذة؛ نُبقيه مخفياً عند غياب عنوان صريح.
        <DialogPrimitive.Title className="sr-only">نافذة</DialogPrimitive.Title>
      )}

      {description ? (
        <DialogPrimitive.Description className="px-5 pt-3 text-label text-muted-foreground">
          {description}
        </DialogPrimitive.Description>
      ) : null}

      {showClose ? (
        <DialogPrimitive.Close
          aria-label="إغلاق"
          className={cn(
            'absolute end-2 top-2 inline-flex size-11 items-center justify-center rounded-md',
            'text-fg-muted transition-colors hover:bg-muted hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          <X className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-5 pb-1 pt-4', className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-start',
        className,
      )}
      {...props}
    />
  );
}

const DialogTitle = DialogPrimitive.Title;
const DialogDescription = DialogPrimitive.Description;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
};