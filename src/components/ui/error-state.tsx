import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

/**
 * ErrorState — الحالة الثالثة المفقودة في كل شاشة.
 *
 * كانت الشاشات تعرف حالتين فقط: تحميل أو "لا يوجد شيء". أي فشل شبكة كان
 * يُسقَط إلى قائمة فارغة، فيظن التاجر أن بياناته حُذفت. هذا المكوّن يفصل
 * الفشل عن الفراغ ويوفر إعادة محاولة صريحة.
 */

export interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /** `inline` للاستخدام داخل بطاقة، و`page` لشاشة كاملة. */
  size?: 'inline' | 'page';
}

export function ErrorState({
  title = 'تعذّر تحميل البيانات',
  description = 'حدث خطأ في الاتصال. تحقّق من الشبكة ثم أعد المحاولة — بياناتك لم تتأثر.',
  icon: Icon = AlertTriangle,
  onRetry,
  retryLabel = 'إعادة المحاولة',
  className,
  size = 'inline',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-border bg-card text-center',
        size === 'page' ? 'min-h-[60dvh] px-6 py-16' : 'px-6 py-14',
        className,
      )}
    >
      <span
        aria-hidden
        className="mb-4 inline-flex size-10 items-center justify-center border border-danger/25 text-danger"
      >
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <h2 className="font-display text-h3 font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-[46ch] text-body text-fg-muted">{description}</p>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-5 gap-2">
          <RotateCcw className="size-4" aria-hidden />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
