import { Key, RefreshCw } from 'lucide-react';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';

interface SubscriptionSectionProps {
  daysLeft: number;
  subscriptionEnd?: string | undefined;
  hideUpgradeUI: boolean;
  onRenew: () => void;
  onUpgrade: () => void;
}

/**
 * Subscription — days left as a number, with one warning tone near expiry.
 * No tinted card.
 */
export function SubscriptionSection({
  daysLeft,
  subscriptionEnd,
  hideUpgradeUI,
  onRenew,
  onUpgrade,
}: SubscriptionSectionProps): React.JSX.Element {
  const urgent = daysLeft <= 7;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-label text-fg-muted">المتبقي على الاشتراك</p>
          <p className={cn('mt-1 font-display text-[2rem] font-semibold leading-none', urgent ? 'text-warning' : 'text-foreground')} data-numeric>
            {daysLeft}
            <span className="ms-1.5 text-label font-normal text-fg-muted">يوم</span>
          </p>
        </div>
        <p className="text-label text-fg-muted" data-numeric>
          ينتهي: {subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString('ar-SA-u-nu-latn') : '—'}
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={onRenew} className="flex-1 gap-2">
          <Key className="size-4" strokeWidth={1.75} aria-hidden />
          تجديد بالكود
        </Button>
        {!hideUpgradeUI ? (
          <Button type="button" onClick={onUpgrade} className="flex-1 gap-2">
            <RefreshCw className="size-4" strokeWidth={1.75} aria-hidden />
            ترقية الخطة
          </Button>
        ) : null}
      </div>
    </div>
  );
}
