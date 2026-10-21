import { Banknote, CreditCard, Landmark, QrCode, Wallet, type LucideIcon } from 'lucide-react';
import type { PaymentProvider } from '../../../config/paymentProviders';
import { cn } from '../../../lib/utils';

const ICONS: Record<PaymentProvider['type'], LucideIcon> = {
  wallet: Wallet,
  bank: Landmark,
  card: CreditCard,
  cod: Banknote,
  qr: QrCode,
};

const LABELS: Record<PaymentProvider['type'], string> = {
  wallet: 'محفظة إلكترونية',
  bank: 'تحويل بنكي',
  card: 'بطاقة',
  cod: 'الدفع عند الاستلام',
  qr: 'رموز QR',
};

/**
 * أيقونة مزوّد الدفع — بديل `provider.logo` الذي كان إيموجي.
 * لون واحد محايد، لا مربّع ملوّن بقوس قزح.
 */
export function PaymentProviderIcon({
  type,
  className,
}: {
  type: PaymentProvider['type'] | undefined;
  className?: string;
}): React.JSX.Element {
  const Icon = type ? ICONS[type] : CreditCard;
  return (
    <span
      aria-hidden
      className={cn('inline-flex size-9 shrink-0 items-center justify-center border border-border text-fg-muted', className)}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

export function providerTypeLabel(type: PaymentProvider['type'] | undefined): string {
  return type ? LABELS[type] : 'طريقة دفع';
}
