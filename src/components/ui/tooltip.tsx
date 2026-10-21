import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

/**
 * Tooltip — تلميحات موحّدة.
 *
 * لم يكن في المشروع أي Tooltip؛ أزرار الأيقونات (تعديل/حذف/نسخ/إغلاق) كانت
 * تعتمد `title` الأصلي للمتصفح: يظهر ببطء، ولا يُقرأ على الجوال، ولا يدعم
 * العربية بتنسيق صحيح.
 *
 * إتاحة: Tooltip ليس بديلاً عن `aria-label`. أي زر أيقوني يجب أن يحمل
 * `aria-label`، ويأتي Tooltip كتوضيح بصري إضافي.
 *
 * الجوال: نُبقي اللمس يعتمد على `aria-label` فقط (TooltipProvider بـ delay
 * مناسب) لأن التلميح المنبثق عند اللمس يحجب المحتوى.
 */

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-[160] max-w-[16rem] rounded-lg bg-scrim px-2.5 py-1.5',
        'text-label text-scrim-fg shadow-md',
        'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        'duration-150',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = 'TooltipContent';

/**
 * غلاف مختصر يجمع Root + Trigger + Content في مكوّن واحد لأشهر حالة استخدام:
 * زر أيقوني بتلميح نصي.
 */
export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
  className?: string;
}

function Tooltip({ children, content, side = 'top', delayDuration = 300, className }: TooltipProps) {
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  );
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent, Tooltip };