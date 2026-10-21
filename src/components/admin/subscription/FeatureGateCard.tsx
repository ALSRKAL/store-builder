/**
 * FeatureGateCard — حالة "ميزة تتطلب خطة أعلى" الموحّدة.
 *
 * كانت هذه البطاقة مكرّرة حرفياً ثلاث مرات في `SettingsTab` (التواصل الاجتماعي،
 * الإشعارات، طرق الدفع) بنفس التدرّج البرتقالي والإيموجي 👑. النسخة هنا هادئة:
 * سطح عادي، حد متقطع واحد، أيقونة قفل بخط رفيع، وزر ترقية اختياري.
 * عند `hideUpgradeUI` تتحول إلى شرح صامت بلا أي دعوة لاتخاذ إجراء.
 */

import { Crown, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui';

export interface FeatureGateCardProps {
  title: string;
  description: string;
  featureName: string;
  hideUpgradeUI?: boolean;
  onUpgrade: () => void;
  className?: string;
}

export function FeatureGateCard({
  title,
  description,
  featureName,
  hideUpgradeUI = false,
  onUpgrade,
  className,
}: FeatureGateCardProps): React.JSX.Element {
  return (
    <div className={cn('border-y border-border py-5', className)}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-fg-subtle">
        <Lock className="size-3.5" strokeWidth={1.75} aria-hidden />
        {title}
      </p>
      <p className="mt-2 max-w-[52ch] text-label leading-relaxed text-fg-muted">{description}</p>
      {!hideUpgradeUI ? (
        <Button type="button" variant="outline" onClick={onUpgrade} className="mt-3 gap-2">
          <Crown className="size-4" strokeWidth={1.75} aria-hidden />
          ترقية لخطة {featureName}
        </Button>
      ) : null}
    </div>
  );
}
