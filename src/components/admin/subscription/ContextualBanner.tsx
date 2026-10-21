/**
 * ContextualBanner — الشريط السياقي الوحيد أعلى لوحة التاجر.
 *
 * المشكلة قبل هذا المكوّن: `PlanBanner` + `SubscriptionAlert` كانا يظهران معاً،
 * فيتكدّس شريطان (وأحياناً ثلاثة مع تنبيه حدود الخطة) فوق المحتوى، ويأكلان
 * نحو ربع شاشة 375px. هذا الشريط يعرض **الحالة الأهم فقط**:
 *   1) اشتراك على وشك الانتهاء (≤ 7 أيام) — إنذار + تجديد.
 *   2) خطة تجريبية — دعوة للترقية.
 *   3) خطة مدفوعة سارية — اسم الخطة + ترقية اختيارية.
 *
 * الارتفاع مقيّد بـ 44px، والنص قصير عمداً حتى لا يُقتطع على الجوال. لا
 * إيموجي ولا تدرّجات؛ لون دلالي واحد (danger/warning/neutral).
 */

import { ArrowUp, Clock3, RefreshCw, X } from 'lucide-react';
import type { Plan } from '../../../config/plans';
import { cn } from '../../../lib/utils';

export interface ContextualBannerProps {
  plan: Plan | null | undefined;
  daysRemaining: number;
  hideUpgradeUI?: boolean;
  onRenew: () => void;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function ContextualBanner({
  plan,
  daysRemaining,
  hideUpgradeUI = false,
  onRenew,
  onUpgrade,
  onDismiss,
}: ContextualBannerProps): React.JSX.Element | null {
  if (!plan) return null;

  const isExpiring = daysRemaining <= 7;
  const isTrial = plan.id === 'trial';
  const isExpired = daysRemaining <= 0;

  const message = ((): string => {
    if (isExpired) return 'انتهى اشتراكك — جدّد للمتابعة';
    if (isExpiring) {
      if (daysRemaining === 1) return 'تبقّى يوم واحد على انتهاء اشتراكك';
      return `تبقّى ${daysRemaining} أيام على انتهاء اشتراكك`;
    }
    if (isTrial) return 'أنت على الخطة التجريبية';
    return `خطتك الحالية: ${plan.name}`;
  })();

  const tone = isExpiring
    ? isExpired
      ? 'border-s-danger bg-danger/5 text-danger'
      : 'border-s-warning bg-warning/5 text-warning'
    : 'border-s-transparent bg-surface-sunken text-foreground';

  return (
    <div
      role="status"
      className={cn(
        'flex h-11 w-full items-center gap-2 border-b border-s-2 border-border px-3 sm:px-4',
        tone,
      )}
    >
      {isExpiring ? (
        <Clock3 className="size-4 shrink-0" aria-hidden />
      ) : isTrial ? (
        <ArrowUp className="size-4 shrink-0 text-fg-muted" aria-hidden />
      ) : (
        <span
          aria-hidden
          className="inline-block size-1.5 shrink-0 rounded-full bg-success"
        />
      )}

      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold">{message}</p>

      <div className="flex shrink-0 items-center gap-1">
        {isExpiring ? (
          <button
            type="button"
            onClick={onRenew}
            className="inline-flex h-11 items-center gap-1.5 px-2 text-[12px] font-semibold underline decoration-1 underline-offset-4 transition-opacity hover:opacity-75"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            تجديد
          </button>
        ) : null}

        {!hideUpgradeUI && (isTrial || Boolean(plan.id)) ? (
          <button
            type="button"
            onClick={onUpgrade}
            className={cn(
              'inline-flex h-11 items-center gap-1.5 px-2 text-[12px] font-semibold underline decoration-1 underline-offset-4 transition-opacity hover:opacity-75',
              isExpiring ? '' : 'text-foreground',
            )}
          >
            <ArrowUp className="size-3.5" aria-hidden />
            {isTrial ? 'ترقية' : 'خطط'}
          </button>
        ) : null}

        <button
          type="button"
          aria-label="إخفاء الشريط"
          onClick={onDismiss}
          className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
