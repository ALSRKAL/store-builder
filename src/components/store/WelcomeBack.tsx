/**
 * WelcomeBack — ترحيب بعودة العميل مع منتجات في سلته.
 * Radix Dialog بدل overlay يدوي، وإزالة الإيموجي. زر "عرض السلة" يفتح الدرج
 * عبر مسار `/cart` (يملكه الأب) حتى لا يغلقه تأثير مزامنة المسار.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { storeScopeStyle } from '../../utils/themeUtils';
import { Button, Dialog, DialogContent } from '../ui';

interface WelcomeBackProps {
  /**
   * فتح السلة عبر مسارها. لا نستدعي `openCart` مباشرة لأن `Store` يزامن
   * الدرج مع المسار ويغلقه فوراً إن لم يكن المسار `/cart`.
   */
  onViewCart: () => void;
}

export default function WelcomeBack({ onViewCart }: WelcomeBackProps): React.JSX.Element | null {
  const { welcomeMessage, dismissWelcome, getItemsCount } = useCart();
  const [visible, setVisible] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!welcomeMessage) return;
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      setVisible(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [welcomeMessage]);

  if (!welcomeMessage || !visible || now === null) return null;

  const timeSince = ((): string => {
    const lastVisit = new Date(welcomeMessage.lastVisit);
    const hours = Math.floor((now - lastVisit.getTime()) / 3_600_000);
    const days = Math.floor(hours / 24);
    if (days > 1) return `منذ ${days} أيام`;
    if (days === 1) return 'منذ يوم';
    if (hours === 1) return 'منذ ساعة';
    return `منذ ${hours} ساعات`;
  })();

  const viewCart = (): void => {
    dismissWelcome();
    setVisible(false);
    onViewCart();
  };

  const close = (): void => {
    dismissWelcome();
    setVisible(false);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent size="sm" hideHeader showClose={false} title="مرحباً بعودتك" style={storeScopeStyle}>
        <div className="flex flex-col items-start px-6 py-6 text-start">
          <span
            aria-hidden
            className="mb-4 inline-flex size-10 items-center justify-center rounded-[var(--store-button-radius,4px)] text-[var(--store-button-text)]"
            style={{ backgroundColor: 'var(--store-primary)' }}
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
          </span>
          <h2 className="font-display text-h2 font-semibold text-foreground">أهلاً بعودتك</h2>
          <p className="mt-1 text-body text-fg-muted">أغراضك بانتظارك في السلة.</p>

          <div className="mt-4 flex items-center gap-3 border-y border-border py-2.5">
            <span className="text-label font-medium text-foreground" data-numeric>
              {getItemsCount()} منتج
            </span>
            <span aria-hidden className="size-1 rounded-full bg-border-strong" />
            <span className="text-label text-fg-muted">{timeSince}</span>
          </div>

          <Button
            type="button"
            onClick={viewCart}
            className="mt-5 w-full gap-2 text-[var(--store-button-text)]"
            style={{ backgroundColor: 'var(--store-primary)', borderRadius: 'var(--store-button-radius, 4px)' }}
          >
            عرض السلة
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
          </Button>
          <button type="button" onClick={close} className="mt-2 min-h-11 px-1 text-label font-medium text-fg-muted hover:text-foreground">
            متابعة التصفح
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
