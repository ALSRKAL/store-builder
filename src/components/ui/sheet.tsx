import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useIsRTL } from '../../lib/rtl';

/**
 * Sheet — درج جانبي/سفلي مبني على نفس أساس Dialog (ليرث حصر التركيز،
 * الإغلاق بـ Escape، وقفل تمرير الصفحة)، لكن بحركة انزلاق.
 *
 * ── الاتجاه (RTL) ──────────────────────────────────────────────────────────
 * `side` يقبل قيمتين منطقيتين وأخرى فيزيائية:
 *   - 'end'    → نهاية السطر: يمين في LTR، ويسار في RTL
 *   - 'start'  → بداية السطر: يسار في LTR، ويمين في RTL
 *   - 'left' / 'right' → فيزيائي صريح (للمكتبات التي لا تفهم المنطقي)
 *   - 'bottom' → من أسفل
 * نُحلّ المنطقي إلى فيزيائي في JS عبر useIsRTL، ثم نُثبّت اللوحة بـ left-0/right-0
 * ونختار حركة الانزلاق المطابقة — بلا :dir() ولا [dir=rtl] selectors، فالقرار
 * صريح وقابل للاختبار.
 */

export type SheetSide = 'end' | 'start' | 'left' | 'right' | 'bottom';

/** يحوّل الجانب المنطقي إلى فيزيائي حسب اتجاه الصفحة. */
function resolvePhysicalSide(side: SheetSide, isRTL: boolean): 'left' | 'right' | 'bottom' {
  if (side === 'bottom') return 'bottom';
  if (side === 'left' || side === 'right') return side;
  if (side === 'end') return isRTL ? 'left' : 'right';
  return isRTL ? 'right' : 'left';
}

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;
const SheetOverlay = DialogPrimitive.Overlay;

const sheetContentVariants = cva(
  cn(
    'fixed z-[101] flex flex-col bg-card text-card-foreground shadow-overlay',
    'data-[state=open]:animate-in data-[state=closed]:animate-out duration-300 ease-out-expo',
  ),
  {
    variants: {
      physicalSide: {
        left: cn(
          'inset-y-0 left-0 h-dvh w-full border-e border-border',
          'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
        ),
        right: cn(
          'inset-y-0 right-0 h-dvh w-full border-s border-border',
          'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        ),
        bottom: cn(
          'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-xl border-t border-border',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        ),
      },
      width: {
        sm: 'w-full max-w-[min(20rem,100vw)]',
        md: 'w-full max-w-[min(26rem,100vw)]',
        lg: 'w-full max-w-[min(34rem,100vw)]',
        xl: 'w-full max-w-[min(44rem,100vw)]',
      },
    },
    defaultVariants: { width: 'md' },
  },
);

export interface SheetContentProps
  // `title` مأخوذ من سمات HTML كـ string؛ نستبعده لإعادة تعريفه كـ ReactNode.
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'> {
  /** جانب الفتح. المنطقي (end/start) هو المفضّل لأنه يحترم RTL. */
  side?: SheetSide;
  width?: VariantProps<typeof sheetContentVariants>['width'];
  title?: React.ReactNode;
  description?: React.ReactNode;
  hideHeader?: boolean;
  showClose?: boolean;
  /** إخفاء الخلفية المعتمة (مفيد للأدراج الصغيرة غير الحاجبة). */
  hideOverlay?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      className,
      children,
      side = 'end',
      width,
      title,
      description,
      hideHeader,
      showClose = true,
      hideOverlay,
      ...props
    },
    ref,
  ) => {
    const isRTL = useIsRTL();
    const physicalSide = resolvePhysicalSide(side, isRTL);

    return (
      <SheetPortal>
        {hideOverlay ? null : (
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-[100] bg-scrim/60',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
              // نفس مدة/منحنى انزلاق اللوحة حتى لا تختفي الخلفية قبلها.
              'duration-300 ease-out-expo',
            )}
          />
        )}
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            sheetContentVariants({ physicalSide, width }),
            // الدرج السفلي يحتاج مساحة آمنة أسفل الشاشة (شريط النظام على الجوال)
            physicalSide === 'bottom' && 'pb-safe',
            className,
          )}
          {...props}
        >
          {physicalSide === 'bottom' ? (
            <div
              aria-hidden
              className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-border-strong"
            />
          ) : null}

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
            <DialogPrimitive.Title className="sr-only">لوحة</DialogPrimitive.Title>
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
      </SheetPortal>
    );
  },
);
SheetContent.displayName = 'SheetContent';

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 px-5 pb-1 pt-4', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
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

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  resolvePhysicalSide,
  sheetContentVariants,
};