/**
 * ProductModal — تفاصيل المنتج.
 *
 * تحويل من overlay يدوي (قفل تمرير + Escape مكتوبان يدوياً) إلى Radix Dialog،
 * مع احترام هوية المتجر (`--store-*`) وحالة المخزون `inStock`:
 *   - منتج نافد: شارة واضحة وتعطيل زر الإضافة.
 *   - حلقات اختيار اللون/المقاس/الصورة بحدود واضحة (3px/ring) لا تعتمد على
 *     لون واحد قد يذوب في خلفية التاجر.
 *   - نسخ الرابط ينسخ رابط المنتج الفعلي (المسار الجديد) لا رابط الصفحة.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  X,
  ZoomIn,
} from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { useCart, type CartProductInput } from '../../contexts/CartContext';
import { usePayment } from '../../contexts/PaymentContext';
import { getColorName } from '../../utils/colorUtils';
import CheckoutModal, { type CheckoutItem } from './CheckoutModal';
import type { Product } from '../../schemas/product';
import { cn } from '../../lib/utils';
import { storeScopeStyle } from '../../utils/themeUtils';
import { Dialog, DialogContent, toast } from '../ui';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: ProductModalProps): React.JSX.Element {
  const { store, formatPrice } = useStore();
  const { addToCart } = useCart();
  const { hasPaymentMethods, loading: paymentsLoading, isAnnualPlan } = usePayment();
  const paymentsPending = isAnnualPlan && paymentsLoading;
  const [currentImage, setCurrentImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(product.colors?.[0] ?? null);
  const [selectedSize, setSelectedSize] = useState<string | null>(product.sizes?.[0] ?? null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  // نُغلق النافذة محلياً أولاً لتلعب حركة الخروج، ثم نغادر المسار.
  const [isOpen, setIsOpen] = useState(true);
  const closeTimer = useRef<number | null>(null);

  const requestClose = (): void => {
    if (!isOpen) return;
    setIsOpen(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => onClose(), 220);
  };

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const images = product.images ?? [];
  const outOfStock = product.inStock === false;

  useEffect(() => {
    setCurrentImage(0);
    setSelectedColor(product.colors?.[0] ?? null);
    setSelectedSize(product.sizes?.[0] ?? null);
    setAddedToCart(false);
  }, [product.id, product.colors, product.sizes]);

  const nextImage = (): void => setCurrentImage((prev) => (prev + 1) % images.length);
  const prevImage = (): void => setCurrentImage((prev) => (prev - 1 + images.length) % images.length);

  const copyLink = async (): Promise<void> => {
    const slug = store?.slug ?? store?.id ?? 'store';
    const url = `${window.location.origin}/store/${slug}/product/${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط المنتج');
    } catch {
      toast.error('تعذّر نسخ الرابط');
    }
  };

  const add = (): void => {
    if (outOfStock) return;
    const cartProduct: CartProductInput = {
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.originalPrice,
      images: product.images,
    };
    addToCart(cartProduct, {
      selectedColor: selectedColor ?? undefined,
      selectedSize: selectedSize ?? undefined,
      quantity: 1,
    });
    setAddedToCart(true);
    toast.success('تمت الإضافة إلى السلة', product.name);
    window.setTimeout(() => setAddedToCart(false), 2000);
  };

  const order = (): void => {
    if (outOfStock || paymentsPending) return;
    if (hasPaymentMethods) setShowCheckout(true);
    else sendToWhatsApp();
  };

  const sendToWhatsApp = (): void => {
    const number = store?.whatsapp?.replace(/[^0-9]/g, '') ?? '';
    if (!number) {
      toast.error('رقم واتساب المتجر غير متوفر', 'تواصل مع صاحب المتجر عبر طريقة أخرى.');
      return;
    }
    const slug = store?.slug ?? store?.id ?? 'demo';
    const url = `${window.location.origin}/store/${slug}/product/${product.id}`;
    const message = [
      `السلام عليكم، أرغب في طلب المنتج التالي من ${store?.name ?? 'المتجر'}:`,
      '',
      product.name,
      `السعر: ${formatPrice(product.price)}`,
      product.originalPrice && product.originalPrice > product.price ? `قبل الخصم: ${formatPrice(product.originalPrice)}` : '',
      selectedColor ? `اللون: ${getColorName(selectedColor)}` : '',
      selectedSize ? `المقاس: ${selectedSize}` : '',
      '',
      `رابط المنتج: ${url}`,
    ]
      .filter(Boolean)
      .join('\n');
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const checkoutItems: CheckoutItem[] = [
    {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      selectedColor,
      selectedSize,
      image: images[0],
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? requestClose() : undefined)}>
        <DialogContent
          size="full"
          hideHeader
          showClose={false}
          title={product.name}
          className={cn(
            'max-h-[92dvh] max-w-[1020px] overflow-hidden border-0',
            'max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[92dvh] max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none',
          )}
          style={{
            ...storeScopeStyle,
            backgroundColor: 'var(--store-card-bg)',
            borderRadius: 'var(--store-card-radius, 6px)',
          }}
        >
          <button
            type="button"
            aria-label="إغلاق تفاصيل المنتج"
            className="absolute start-3 top-3 z-30 inline-flex size-11 items-center justify-center rounded-md border bg-[var(--store-card-bg)] text-[var(--store-card-text)] transition-colors hover:border-[var(--store-primary)]"
            style={{ borderColor: 'var(--store-border)' }}
            onClick={requestClose}
          >
            <X className="size-5" strokeWidth={1.75} aria-hidden />
          </button>

          <div className="grid grid-cols-2 max-md:grid-cols-1">
            {/* المعرض */}
            <div className="p-6 max-md:p-4" style={{ backgroundColor: 'var(--store-body-bg)' }}>
              <div
                className="relative mx-auto aspect-square max-h-[440px] w-full max-w-[440px] overflow-hidden border"
                style={{ borderRadius: 'var(--store-card-radius, 6px)', borderColor: 'var(--store-border)' }}
              >
                {images.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="block size-full cursor-zoom-in bg-[var(--store-card-bg)]"
                      onClick={() => setShowLightbox(true)}
                      aria-label="تكبير الصورة"
                    >
                      <img src={images[currentImage]} alt={product.name} className="size-full object-cover" />
                    </button>
                    {images.length > 1 ? (
                      <>
                        <button
                          type="button"
                          aria-label="الصورة السابقة"
                          className="absolute start-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md border bg-[var(--store-card-bg)] text-[var(--store-card-text)] transition-colors hover:border-[var(--store-primary)]"
                          style={{ borderColor: 'var(--store-border)' }}
                          onClick={prevImage}
                        >
                          <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label="الصورة التالية"
                          className="absolute end-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-md border bg-[var(--store-card-bg)] text-[var(--store-card-text)] transition-colors hover:border-[var(--store-primary)]"
                          style={{ borderColor: 'var(--store-border)' }}
                          onClick={nextImage}
                        >
                          <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
                        </button>
                      </>
                    ) : null}
                    <button
                      type="button"
                      aria-label="تكبير"
                      className="absolute bottom-2 start-2 inline-flex size-11 items-center justify-center rounded-md bg-black/60 text-white transition-colors hover:bg-black/75"
                      onClick={() => setShowLightbox(true)}
                    >
                      <ZoomIn className="size-4" strokeWidth={1.75} aria-hidden />
                    </button>
                  </>
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-2 text-[var(--store-card-secondary)]">
                    <ShoppingBag className="size-10" strokeWidth={1.5} aria-hidden />
                    <span className="text-label">لا توجد صورة</span>
                  </span>
                )}
              </div>

              {images.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto p-1 scrollbar-hide">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      aria-label={`صورة ${index + 1}`}
                      aria-pressed={currentImage === index}
                      onClick={() => setCurrentImage(index)}
                      className={cn(
                        'size-[64px] shrink-0 overflow-hidden rounded-md border-2 transition-colors',
                        currentImage === index ? 'border-[var(--store-accent)]' : 'border-transparent hover:border-[var(--store-secondary)]',
                      )}
                      style={{ backgroundColor: 'var(--store-card-bg)' }}
                    >
                      <img src={image} alt="" loading="lazy" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* التفاصيل */}
            <div className="p-7 max-md:p-4" style={{ color: 'var(--store-card-text)' }}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <h2 className="font-display text-[1.5rem] font-semibold leading-snug text-[var(--store-card-text)] sm:text-h1">{product.name}</h2>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  aria-label="نسخ رابط المنتج"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border text-[var(--store-card-secondary)] transition-colors hover:text-[var(--store-primary-text)]"
                  style={{ borderColor: 'var(--store-border)' }}
                >
                  <Copy className="size-4" strokeWidth={1.75} aria-hidden />
                </button>
              </div>

              {outOfStock ? (
                <span className="mb-3 inline-flex items-center gap-1.5 bg-[var(--danger)] px-2.5 py-1 text-[11px] font-medium text-white">
                  نفدت الكمية
                </span>
              ) : null}

              <div className="mb-5 flex flex-wrap items-baseline gap-3 border-y py-3" style={{ borderColor: 'var(--store-border)' }}>
                <span className="font-display text-h2 font-semibold text-[var(--store-card-text)]" data-numeric>
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price ? (
                  <>
                    <span className="text-label text-[var(--store-card-secondary)] line-through" data-numeric>
                      {formatPrice(product.originalPrice)}
                    </span>
                    <span className="bg-[var(--danger)] px-2 py-0.5 text-[11px] font-medium text-white" data-numeric>
                      وفر {Math.round((1 - product.price / product.originalPrice) * 100)}%
                    </span>
                  </>
                ) : null}
              </div>

              {product.description ? (
                <p className="mb-5 text-body leading-relaxed text-[var(--store-card-secondary)]">{product.description}</p>
              ) : null}

              {product.colors && product.colors.length > 0 ? (
                <div className="mb-5">
                  <h3 className="mb-2 text-label font-medium text-[var(--store-card-text)]">الألوان المتاحة</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-pressed={selectedColor === color}
                        aria-label={`لون ${getColorName(color)}`}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          'size-11 rounded-full border-2 transition-colors',
                          selectedColor === color
                            ? 'border-[var(--store-accent)] ring-2 ring-[var(--store-accent)] ring-offset-2 ring-offset-[var(--store-card-bg)]'
                            : 'border-[var(--store-border)] hover:border-[var(--store-accent)]/60',
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {product.sizes && product.sizes.length > 0 ? (
                <div className="mb-5">
                  <h3 className="mb-2 text-label font-medium text-[var(--store-card-text)]">المقاسات المتاحة</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        aria-pressed={selectedSize === size}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          'min-h-11 min-w-11 border px-4 text-label font-medium transition-colors',
                          selectedSize === size
                            ? 'border-transparent text-[var(--store-button-text)]'
                            : 'border-[var(--store-border)] bg-[var(--store-card-bg)] text-[var(--store-card-text)] hover:border-[var(--store-primary)]',
                        )}
                        style={{
                          borderRadius: 'var(--store-button-radius, 4px)',
                          backgroundColor: selectedSize === size ? 'var(--store-primary)' : undefined,
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  disabled={outOfStock}
                  onClick={add}
                  className={cn(
                    'flex min-h-12 w-full items-center justify-center gap-2 text-label font-medium transition-opacity sm:w-auto sm:flex-1',
                    outOfStock ? 'cursor-not-allowed bg-muted text-fg-subtle' : 'text-[var(--store-button-text)] hover:opacity-90',
                  )}
                  style={
                    outOfStock
                      ? undefined
                      : {
                          backgroundColor: addedToCart ? 'var(--success)' : 'var(--store-primary)',
                          borderRadius: 'var(--store-button-radius, 4px)',
                        }
                  }
                >
                  {addedToCart ? <Check className="size-5" strokeWidth={2} aria-hidden /> : <ShoppingCart className="size-5" strokeWidth={1.75} aria-hidden />}
                  {outOfStock ? 'غير متوفر' : addedToCart ? 'تمت الإضافة' : 'أضف للسلة'}
                </button>
                <button
                  type="button"
                  disabled={outOfStock || paymentsPending}
                  aria-busy={paymentsPending || undefined}
                  onClick={order}
                  className="flex min-h-12 w-full items-center justify-center gap-2 bg-success text-label font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-subtle sm:w-auto sm:flex-1"
                  style={{ borderRadius: 'var(--store-button-radius, 4px)' }}
                >
                  <MessageCircle className="size-5" strokeWidth={1.75} aria-hidden />
                  اطلب الآن
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent
          hideHeader
          showClose={false}
          size="full"
          className="max-w-[95vw] border-0 bg-transparent shadow-none"
                  title={`تكبير صورة ${product.name}`}
        >
          <div className="relative flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="إغلاق التكبير"
              className="absolute end-4 top-4 z-10 inline-flex size-11 items-center justify-center rounded-md border border-white/30 bg-black/60 text-white transition-colors hover:bg-black/80"
              onClick={() => setShowLightbox(false)}
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
            {images.length > 0 ? (
              <img src={images[currentImage]} alt={product.name} className="max-h-[88dvh] max-w-full rounded-sm object-contain" />
            ) : null}
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="الصورة السابقة"
                  className="absolute start-4 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-md border border-white/30 bg-black/60 text-white transition-colors hover:bg-black/80"
                  onClick={prevImage}
                >
                  <ChevronRight className="size-6" strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="الصورة التالية"
                  className="absolute end-4 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-md border border-white/30 bg-black/60 text-white transition-colors hover:bg-black/80"
                  onClick={nextImage}
                >
                  <ChevronLeft className="size-6" strokeWidth={1.75} aria-hidden />
                </button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        items={checkoutItems}
        total={product.price}
        onSuccess={() => {
          setShowCheckout(false);
          requestClose();
        }}
      />
    </>
  );
}
