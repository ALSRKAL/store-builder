import { Camera, Pencil, QrCode, Trash2 } from 'lucide-react';
import type { PaymentMethod } from '../../../schemas/payment';
import { getProviderById } from '../../../config/paymentProviders';
import { Button, Switch } from '../../ui';
import { cn } from '../../../lib/utils';
import { PaymentProviderIcon, providerTypeLabel } from './PaymentProviderIcon';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PaymentMethodCard({ method, onToggle, onEdit, onDelete }: PaymentMethodCardProps): React.JSX.Element {
  const providerId = method.providerId ?? method.provider;
  const provider = providerId ? getProviderById(providerId) : null;
  const config = method.configDetails ?? {};
  const name = method.label ?? method.name ?? provider?.name ?? providerId ?? 'طريقة دفع';
  const accountNumber = (config as Record<string, string>).accountNumber ?? method.accountNumber;
  const accountName = (config as Record<string, string>).accountName ?? method.accountName;
  const bankName = (config as Record<string, string>).bankName ?? method.bankName;
  const hasQr = Boolean((config as Record<string, string>).qrCodeImage ?? method.qrCodeImage);

  return (
    <div className={cn('flex flex-col gap-3 border-b border-border bg-card py-3 last:border-b-0 sm:flex-row sm:items-center', !method.isActive && 'opacity-65')}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <PaymentProviderIcon type={provider?.type} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h4 className="truncate text-label font-semibold text-foreground">{name}</h4>
            <span className="text-[11px] text-fg-subtle">
              {providerTypeLabel(provider?.type)}
            </span>
            {method.requireReceipt || method.requiresReceipt ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-success">
                <Camera className="size-3" strokeWidth={1.75} aria-hidden />
                يتطلب إيصالاً
              </span>
            ) : null}
            {hasQr ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-info">
                <QrCode className="size-3" strokeWidth={1.75} aria-hidden />
                QR
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-fg-muted">
            {accountNumber ? <span className="tabular-nums" dir="ltr">{accountNumber}</span> : null}
            {accountName ? <span>{accountName}</span> : null}
            {bankName ? <span>{bankName}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 border-t border-border pt-3 sm:border-0 sm:pt-0">
        <Switch checked={Boolean(method.isActive)} onCheckedChange={onToggle} aria-label={`تفعيل ${name}`} />
        <Button type="button" variant="ghost" size="iconSm" aria-label={`تعديل ${name}`} onClick={onEdit}>
          <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          aria-label={`حذف ${name}`}
          className="text-danger hover:bg-danger/5 hover:text-danger"
          onClick={onDelete}
        >
          <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
