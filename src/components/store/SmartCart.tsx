/**
 * SmartCart — درج السلة.
 *
 * إصلاحات جوهرية:
 *   - RTL: كان `end-0` مع `x: '100%'` ينزلق في الاتجاه الخطأ ويترك شريطاً
 *     ظاهراً بعد الإغلاق. الآن يستخدم `Sheet` الذي يحوّل `end` إلى الجانب
 *     الفيزيائي الصحيح (يسار في RTL) بحركة انزلاق مطابقة.
 *   - لا `clearCart` عند فتح واتساب. تُفرَّغ السلة فقط بعد نجاح إنشاء الطلب
 *     (في CheckoutModal).
 *   - أهداف لمس الكمية/الحذف 44px، والأرقام `tabular-nums`.
 *   - إتمام الطلب ينتقل إلى مسار `/checkout` بدل حالة محلية.
 */

import { useMemo } from 'react';
import { Minus, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useStore } from '../../contexts/StoreContext';
import { usePayment } from '../../contexts/PaymentContext';
import { getColorName } from '../../utils/colorUtils';
import { storeScopeStyle } from '../../utils/themeUtils';
import { Button, Sheet, SheetContent, toast, useConfirm } from '../ui';

interface SmartCartProps {
  onRequestClose: () => void;
  onCheckout: () => void;
}

export function SmartCart({ onRequestClose, onCheckout }: SmartCartProps): React.JSX.Element {
  const { store, products, formatPrice } = useStore();
  const { cartItems, isCartOpen, updateQuantity, removeFromCart, clearCart, getTotal, getItemsCount } = useCart();
  const { hasPaymentMethods, loading: paymentsLoading, isAnnualPlan } = usePayment();
  const paymentsPending = isAnnualPlan && paymentsLoading;
  const { ask, dialog } = useConfirm();

  // منتج نفد أو حُذف بعد إضافته للسلة: يبقى ظاهراً لكن لا يُسمح بإتمام الطلب.
  const unavailableIds = useMemo(() => {
    if (products.length === 0) return new Set<string>();
    return new Set(
      cartItems
        .filter((item) => {
          const product = products.find((entry) => entry.id === item.id);
          return !product || product.inStock === false;
        })
        .map((item) => item.id),
    );
  }, [cartItems, products]);
  const hasUnavailable = unavailableIds.size > 0;

  const sendToWhatsApp = (): void => {
    const number = store?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    if (!number) {
      toast.error('رقم واتساب المتجر غير متوفر', 'تواصل مع صاحب المتجر عبر طريقة أخرى.');
      return;
    }
    const storeName = store?.name ?? 'المتجر';
    const message = [
      `السلام عليكم، أرغب في طلب المنتجات التالية من ${storeName}:`,
      '',
      ...cartItems.map((item, index) => {
        const variant = [
          item.selectedColor ? `اللون: ${getColorName(item.selectedColor)}` : '',
          item.selectedSize ? `المقاس: ${item.selectedSize}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        return `${index + 1}. ${item.name}${variant ? ` (${variant})` : ''} — ${formatPrice(item.price)} × ${item.quantity}`;
      }),
      '',
      `المجموع: ${formatPrice(getTotal())}`,
      `عدد المنتجات: ${getItemsCount()}`,
      '',
      `رابط المتجر: ${window.location.origin}/store/${store?.slug ?? store?.id ?? ''}`,
    ].join('\n');

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
    // لا نُفرّغ السلة هنا: العميل قد يغلق واتساب دون إرسال الطلب.
  };

  const checkout = (): void => {
    if (paymentsPending) return;
    if (hasUnavailable) {
      toast.error('بعض المنتجات غير متوفرة', 'أزل المنتجات التي نفدت كميتها للمتابعة.');
      return;
    }
    if (hasPaymentMethods) onCheckout();
    else sendToWhatsApp();
  };

  return (
    <>
      {dialog}
      <Sheet
        open={isCartOpen}
        onOpenChange={(open) => {
          if (!open) onRequestClose();
        }}
      >
        <SheetContent
          side="end"
          width="md"
          style={storeScopeStyle}
          title={
            <span className="flex items-baseline gap-2">
              <span className="flex items-center gap-2 font-display">
                <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
                سلة التسوق
              </span>
              <span className="text-[11px] font-normal text-fg-muted" data-numeric>
                ({getItemsCount()})
              </span>
            </span>
          }
        >
          <div className="flex min-h-full flex-col">
            <div className="flex-1 p-4">
              {cartItems.length === 0 ? (
                <div className="flex h-full min-h-[50dvh] flex-col items-center justify-center text-center">
                  <Package className="mb-3 size-11 text-fg-subtle" strokeWidth={1.5} aria-hidden />
                  <p className="mb-1 text-body font-semibold text-foreground">سلتك فارغة</p>
                  <p className="text-label text-fg-muted">أضف منتجات من المتجر للبدء.</p>
                  <Button type="button" variant="outline" onClick={onRequestClose} className="mt-4">
                    تصفح المنتجات
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col">
                  {cartItems.map((item, index) => (
                    <li
                      key={`${item.id}-${item.selectedColor ?? ''}-${item.selectedSize ?? ''}-${index}`}
                      className="relative flex gap-3 border-b border-border py-3 first:pt-0"
                    >
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                        {item.image ?? item.images?.[0] ? (
                          <img
                            src={item.image ?? item.images?.[0]}
                            alt={item.name}
                            loading="lazy"
                            decoding="async"
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-fg-subtle">
                            <Package className="size-5" aria-hidden />
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col pe-10">
                        <h3 className="mb-0.5 line-clamp-2 text-label font-semibold text-foreground">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-body font-semibold text-foreground" data-numeric>
                            {formatPrice(item.price)}
                          </span>
                          {item.oldPrice && item.oldPrice > item.price ? (
                            <span className="text-[11px] text-fg-subtle line-through" data-numeric>
                              {formatPrice(item.oldPrice)}
                            </span>
                          ) : null}
                        </div>
                        {(item.selectedColor || item.selectedSize) ? (
                          <p className="mt-0.5 text-[11px] text-fg-muted">
                            {item.selectedColor ? `اللون: ${getColorName(item.selectedColor)}` : ''}
                            {item.selectedColor && item.selectedSize ? ' · ' : ''}
                            {item.selectedSize ? `المقاس: ${item.selectedSize}` : ''}
                          </p>
                        ) : null}
                        {unavailableIds.has(item.id) ? (
                          <span className="mt-1 inline-flex w-fit bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-[var(--store-danger-text)]">
                            نفدت الكمية — أزلها للمتابعة
                          </span>
                        ) : null}

                        <div className="mt-auto flex items-center gap-1.5 pt-2">
                          <button
                            type="button"
                            aria-label={`إنقاص كمية ${item.name}`}
                            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="size-4" strokeWidth={1.75} aria-hidden />
                          </button>
                          <span className="min-w-7 text-center text-label font-medium tabular-nums" aria-live="polite" data-numeric>
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`زيادة كمية ${item.name}`}
                            className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            disabled={item.quantity >= 100}
                          >
                            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label={`حذف ${item.name} من السلة`}
                        className="absolute end-2 top-2 inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-danger/5 hover:text-[var(--store-danger-text)]"
                        onClick={() => removeFromCart(index)}
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cartItems.length > 0 ? (
              <div className="sticky bottom-0 border-t border-border bg-[var(--store-card-bg)] p-4 pb-safe">
                {hasUnavailable ? (
                  <p role="alert" className="mb-2 text-[11px] text-[var(--store-danger-text)]">
                    أزل المنتجات التي نفدت كميتها لإتمام الطلب.
                  </p>
                ) : null}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-label text-fg-muted">
                    المجموع (<span data-numeric>{getItemsCount()}</span> منتج)
                  </span>
                  <strong className="text-h3 font-semibold text-foreground" data-numeric>{formatPrice(getTotal())}</strong>
                </div>
                <Button
                  type="button"
                  onClick={checkout}
                  disabled={paymentsPending || hasUnavailable}
                  aria-busy={paymentsPending || undefined}
                  className="h-12 w-full gap-2 bg-[var(--store-primary)] text-[var(--store-button-text)] hover:opacity-95"
                  style={{ borderRadius: 'var(--store-button-radius, 4px)' }}
                >
                  <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden />
                  إتمام الطلب
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full gap-1.5 text-[var(--store-danger-text)] hover:bg-danger/5 hover:text-[var(--store-danger-text)]"
                  onClick={() =>
                    ask({
                      title: 'تفريغ السلة',
                      description: 'ستُحذف جميع المنتجات من سلتك. يمكنك إضافتها مجدداً في أي وقت.',
                      confirmLabel: 'تفريغ',
                      tone: 'danger',
                      onConfirm: clearCart,
                    })
                  }
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                  تفريغ السلة
                </Button>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default SmartCart;
