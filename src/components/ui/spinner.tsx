import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Spinner — بديل موحّد لدوّامات التحميل المكرّرة.
 *
 * كانت `animate-spin` مكتوبة يدوياً في 17 ملفاً بأحجام وألوان مختلفة،
 * و`PageLoader` في App.tsx يستخدم أنماطاً سطرية بقيم HEX مكتوبة يدوياً.
 * هذا المكوّن يوحّد الحجم واللون والحالة (role="status") في مكان واحد.
 *
 * ملاحظة: للتحميل الذي يحلّ محل محتوى معروف الشكل، استخدم `SkeletonShell`
 * لا Spinner — الهيكل العظمي يقلّل الإحساس بالانتظار ويمنع اهتزاز التخطيط.
 */

const spinnerVariants = cva('animate-spin shrink-0', {
  variants: {
    size: {
      xs: 'size-3.5',
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-7',
      xl: 'size-10',
    },
    tone: {
      /** يرث لون النص الحالي — الاستخدام الافتراضي داخل الأزرار */
      current: 'text-current',
      primary: 'text-primary',
      muted: 'text-fg-muted',
      onPrimary: 'text-primary-foreground',
    },
  },
  defaultVariants: { size: 'md', tone: 'current' },
});

export interface SpinnerProps
  extends Omit<React.SVGProps<SVGSVGElement>, 'ref'>,
    VariantProps<typeof spinnerVariants> {
  /** نص يُقرأ لقارئ الشاشة. مرّر `null` عند وجود نص انتظار مجاور بالفعل. */
  label?: string | null;
}

export function Spinner({ className, size, tone, label, ...props }: SpinnerProps) {
  const a11y =
    label === null
      ? { 'aria-hidden': true as const }
      : { role: 'status' as const, 'aria-live': 'polite' as const, 'aria-label': label ?? 'جارٍ التحميل' };

  return <Loader2 className={cn(spinnerVariants({ size, tone }), className)} {...a11y} {...props} />;
}

export { spinnerVariants };