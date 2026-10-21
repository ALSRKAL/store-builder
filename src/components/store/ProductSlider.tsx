/**
 * ProductSlider — one featured product at a time.
 * Auto-advances every 5s, pauses on hover/focus and when the tab is hidden,
 * and respects prefers-reduced-motion. Manual buttons restart the timer.
 * Split image/details, 1px merchant border, no progress bar.
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import type { Product } from '../../schemas/product';

const AUTOPLAY_MS = 5000;

interface ProductSliderProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  title?: string;
}

export default function ProductSlider({ products, onProductClick, title = 'منتجات جديدة' }: ProductSliderProps): React.JSX.Element | null {
  const { formatPrice } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPageHidden, setIsPageHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  // تغيير هذا الرقم يعيد تشغيل المؤقّت بعد أي تنقّل يدوي.
  const [manualTick, setManualTick] = useState(0);

  const sliderProducts = products.slice(0, 6);

  useEffect(() => {
    const onVisibilityChange = (): void => setIsPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (sliderProducts.length <= 1 || isPaused || isPageHidden) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sliderProducts.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [sliderProducts.length, isPaused, isPageHidden, manualTick]);

  if (sliderProducts.length === 0) return null;

  const safeIndex = currentIndex % sliderProducts.length;
  const currentProduct = sliderProducts[safeIndex];
  if (!currentProduct) return null;
  const image = currentProduct.images?.[0];

  const nextSlide = (): void => {
    setCurrentIndex((prev) => (prev + 1) % sliderProducts.length);
    setManualTick((tick) => tick + 1);
  };
  const prevSlide = (): void => {
    setCurrentIndex((prev) => (prev - 1 + sliderProducts.length) % sliderProducts.length);
    setManualTick((tick) => tick + 1);
  };

  return (
    <section
      className="mb-8 max-md:mb-6"
      aria-roledescription="carousel"
      aria-label={title}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsPaused(false);
      }}
    >
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-[var(--store-border)] pb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-h3 font-semibold" style={{ color: 'var(--store-body-text)' }}>
            {title}
          </h2>
          <span className="text-[11px] text-[var(--store-card-secondary)]" data-numeric>
            {safeIndex + 1} / {sliderProducts.length}
          </span>
        </div>

        {sliderProducts.length > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="المنتج السابق"
              className="inline-flex size-11 items-center justify-center rounded-md border text-[var(--store-card-secondary)] transition-colors hover:text-[var(--store-body-text)]"
              style={{ borderColor: 'var(--store-border)' }}
              onClick={prevSlide}
            >
              <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="المنتج التالي"
              className="inline-flex size-11 items-center justify-center rounded-md border text-[var(--store-card-secondary)] transition-colors hover:text-[var(--store-body-text)]"
              style={{ borderColor: 'var(--store-border)' }}
              onClick={nextSlide}
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onProductClick(currentProduct)}
        className="grid w-full overflow-hidden border text-start md:grid-cols-[1.15fr_0.85fr]"
        style={{
          borderColor: 'var(--store-border)',
          borderRadius: 'var(--store-card-radius, 6px)',
          backgroundColor: 'var(--store-card-bg)',
        }}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--store-body-bg)] md:aspect-auto md:min-h-[340px]">
          {image ? (
            <img
              src={image}
              alt={currentProduct.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center" role="img" aria-label={currentProduct.name}>
              <Package className="size-10 text-[var(--store-card-secondary)]" strokeWidth={1.5} aria-hidden />
            </span>
          )}

          {currentProduct.discount && currentProduct.discount > 0 ? (
            <span className="absolute end-3 top-3 bg-[var(--danger)] px-2 py-1 text-[11px] font-semibold text-white" data-numeric>
              -{currentProduct.discount}%
            </span>
          ) : null}
        </div>

        <div className="flex flex-col justify-center border-t p-5 md:border-s md:border-t-0 md:p-7" style={{ borderColor: 'var(--store-border)' }}>
          <p className="text-[11px] font-medium text-[var(--store-card-secondary)]">منتج مميز</p>
          <h3 className="mt-2 line-clamp-2 font-display text-h2 font-semibold leading-snug" style={{ color: 'var(--store-card-text)' }}>
            {currentProduct.name}
          </h3>

          {currentProduct.description ? (
            <p className="mt-2 line-clamp-2 text-label leading-relaxed text-[var(--store-card-secondary)]">
              {currentProduct.description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-h2 font-semibold" style={{ color: 'var(--store-card-text)' }} data-numeric>
              {formatPrice(currentProduct.price)}
            </span>
            {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price ? (
              <span className="text-label line-through text-[var(--store-card-secondary)]" data-numeric>
                {formatPrice(currentProduct.originalPrice)}
              </span>
            ) : null}
          </div>

          <span
            className="mt-5 inline-flex h-11 w-fit items-center gap-2 rounded-[var(--store-button-radius,4px)] px-5 text-label font-medium text-[var(--store-button-text)]"
            style={{ backgroundColor: 'var(--store-primary)' }}
          >
            عرض المنتج
            <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
      </button>
    </section>
  );
}
