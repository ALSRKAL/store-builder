import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * EmptyState — بديل موحّد لحالات "لا توجد بيانات".
 *
 * قبل هذا المكوّن كانت حالات الفراغ مكتوبة يدوياً بتنسيقات ونصوص مختلفة في
 * Dashboard وOrdersManager وSmartCart وPaymentSettings وغيرها، والأسوأ: لم
 * يكن هناك أي تمييز بصري بين "لا توجد بيانات فعلاً" و"فشل الطلب" — فكان
 * خطأ الشبكة يظهر للمستخدم كأن المتجر فارغ (Dashboard.tsx كان يبتلع الخطأ
 * بـ console.error فقط).
 *
 * لذا وفّرنا `EmptyState` (فراغ حقيقي) و`ErrorState` (فشل مع إعادة محاولة)
 * كمكوّنين منفصلين، ليكون الفرق واضحاً في الكود وفي الواجهة.
 */

const emptyStateVariants = cva('flex flex-col items-center justify-center text-center', {
  variants: {
    size: {
      sm: 'gap-2 px-4 py-8',
      md: 'gap-3 px-5 py-12',
      lg: 'gap-4 px-6 py-16',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** إجراء أساسي — زر أو رابط (يتحمّل `asChild` لأن Button يدعمه). */
  action?: React.ReactNode;
  /** إجراء ثانوي/تلميح مساعد تحت الإجراء الأساسي. */
  hint?: React.ReactNode;
  /** `error` تُبرز وجود مشكلة بدل الفراغ المحايد. */
  tone?: 'neutral' | 'error';
}

export function EmptyState({
  className,
  size,
  icon: Icon = Inbox,
  title,
  description,
  action,
  hint,
  tone = 'neutral',
  ...props
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ size }), className)} {...props}>
      <span
        aria-hidden
        className={cn(
          'inline-flex size-9 items-center justify-center',
          tone === 'error' ? 'text-danger' : 'text-fg-subtle',
        )}
      >
        <Icon className="size-7" strokeWidth={1.5} />
      </span>

      <div className="max-w-md">
        <p className="font-display text-h3 font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="mt-1.5 text-body text-fg-muted">{description}</p>
        ) : null}
      </div>

      {action ? <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
      {hint ? <div className="text-label text-fg-subtle">{hint}</div> : null}
    </div>
  );
}