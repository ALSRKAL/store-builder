/**
 * StoryViewer — عارض القصص بملء الشاشة.
 * أُزيلت التدرّجات وعلامة ✓ النصية، وأُضيفت تسميات aria لكل زر. أهداف اللمس
 * 44px، مع الحفاظ على التنقّل باللمس/الكيبورد والتقدّم التلقائي.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronUp, Package, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { useCart, type CartProductInput } from '../../contexts/CartContext';
import type { Product } from '../../schemas/product';
import { cn } from '../../lib/utils';

interface StoryItem {
  product: Product;
  productIndex: number;
  image: string | null;
  imageIndex: number;
  totalImages: number;
}

interface StoryViewerProps {
  products: Product[];
  initialIndex?: number;
  onClose: () => void;
  onProductClick?: (product: Product) => void;
}

const STORY_DURATION = 5000;

export default function StoryViewer({ products, initialIndex = 0, onClose, onProductClick }: StoryViewerProps): React.JSX.Element | null {
  const { formatPrice, store } = useStore();
  const { addToCart } = useCart();
  const [addedToCart, setAddedToCart] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stories = useMemo((): StoryItem[] => {
    const result: StoryItem[] = [];
    products.forEach((product, productIndex) => {
      const images = product.images && product.images.length > 0 ? product.images : [null];
      images.forEach((image, imageIndex) => {
        result.push({ product, productIndex, image, imageIndex, totalImages: images.length });
      });
    });
    return result;
  }, [products]);

  const initialStoryIndex = useMemo((): number => {
    let index = 0;
    for (let i = 0; i < initialIndex && i < products.length; i++) {
      const product = products[i];
      if (!product) continue;
      const images = product.images && product.images.length > 0 ? product.images : [null];
      index += images.length;
    }
    return index;
  }, [initialIndex, products]);

  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex);
  const currentStory = stories[currentStoryIndex];
  const currentProduct = currentStory?.product;

  const currentProductStories = useMemo(
    () => (currentStory ? stories.filter((story) => story.productIndex === currentStory.productIndex) : []),
    [stories, currentStory],
  );

  const goToNext = useCallback((): void => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, stories.length, onClose]);

  const goToPrev = useCallback((): void => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
      setProgress(0);
    }
  }, [currentStoryIndex]);

  useEffect(() => {
    if (isPaused) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }
    progressInterval.current = setInterval(() => {
      setProgress((prev) => prev + 100 / (STORY_DURATION / 50));
    }, 50);
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPaused, currentStoryIndex]);

  useEffect(() => {
    if (progress >= 100) {
      goToNext();
      setProgress(0);
    }
  }, [progress, goToNext]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  // بعد السحب يولّد المتصفح نقرة اصطناعية؛ نتجاهلها حتى لا ننتقل مرتين.
  const ignoreNextClick = useRef(false);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') goToNext();
      else if (event.key === 'ArrowRight') goToPrev();
      else if (event.key === 'Escape') onClose();
      else if (event.key === ' ') {
        event.preventDefault();
        setIsPaused((value) => !value);
      }
    };
    window.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [goToNext, goToPrev, onClose]);

  const addCurrent = (event: React.MouseEvent): void => {
    event.stopPropagation();
    if (!currentProduct || currentProduct.inStock === false) return;
    // الألوان/المقاسات تحتاج اختياراً: افتح التفاصيل بدل إضافة منتج بلا خيارات.
    if ((currentProduct.colors?.length ?? 0) > 0 || (currentProduct.sizes?.length ?? 0) > 0) {
      onClose();
      onProductClick?.(currentProduct);
      return;
    }
    const cartProduct: CartProductInput = {
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      images: currentProduct.images,
    };
    if (currentProduct.originalPrice !== undefined) cartProduct.oldPrice = currentProduct.originalPrice;
    addToCart(cartProduct);
    setAddedToCart((prev) => ({ ...prev, [currentProduct.id]: true }));
    window.setTimeout(() => setAddedToCart((prev) => ({ ...prev, [currentProduct.id]: false })), 2000);
  };

  if (!currentStory || !currentProduct) return null;
  const outOfStock = currentProduct.inStock === false;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black md:bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={`قصة ${currentProduct.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="relative h-full w-full max-w-[420px] select-none overflow-hidden bg-black md:max-h-[90vh] md:rounded-md"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button')) return;
          if (ignoreNextClick.current) {
            ignoreNextClick.current = false;
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          if (x < rect.width * 0.3) goToNext();
          else if (x > rect.width * 0.7) goToPrev();
        }}
        onTouchStart={(event) => {
          ignoreNextClick.current = false;
          setTouchStart(event.touches[0]?.clientX ?? null);
          setIsPaused(true);
        }}
        onTouchEnd={(event) => {
          setIsPaused(false);
          if (!touchStart) return;
          // السحب لليسار = التالي (مثل النقر على اليسار في واجهة RTL).
          const diff = touchStart - (event.changedTouches[0]?.clientX ?? 0);
          if (Math.abs(diff) > 50) {
            ignoreNextClick.current = true;
            window.setTimeout(() => {
              ignoreNextClick.current = false;
            }, 350);
            if (diff > 0) goToNext();
            else goToPrev();
          }
          setTouchStart(null);
        }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute inset-x-2 top-2 z-[100] flex gap-1 pt-safe max-sm:inset-x-1.5 max-sm:top-1.5">
          {currentProductStories.map((story, index) => {
            const isCurrentImage = story.imageIndex === currentStory.imageIndex;
            const isPastImage = story.imageIndex < currentStory.imageIndex;
            return (
              <div key={index} className="h-0.5 flex-1 overflow-hidden rounded-sm bg-white/35">
                <div
                  className="h-full bg-white transition-[width] duration-75 ease-linear"
                  style={{ width: isPastImage ? '100%' : isCurrentImage ? `${progress}%` : '0%' }}
                />
              </div>
            );
          })}
        </div>

        <div className="absolute inset-x-2 top-4 z-[100] flex items-center gap-2.5 bg-black/55 px-2 py-1 pt-safe max-sm:inset-x-2 max-sm:top-3.5">
          <div
            className="size-8 shrink-0 overflow-hidden rounded-full border-2 border-white"
            style={{ backgroundColor: 'var(--store-primary)' }}
          >
            {store?.logo ? (
              <img src={store.logo} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-white" aria-hidden>
                <ShoppingBag className="size-4" />
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]">{currentProduct.name}</span>
            <span className="text-[11px] text-white/70" data-numeric dir="ltr">
              {currentStory.productIndex + 1}/{products.length}
              {currentStory.totalImages > 1 ? ` · ${currentStory.imageIndex + 1}/${currentStory.totalImages}` : ''}
            </span>
          </div>
          <button
            type="button"
            aria-label="إغلاق القصة"
            className="inline-flex size-11 items-center justify-center rounded-md text-white hover:bg-white/15"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStoryIndex}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {currentStory.image ? (
              <img src={currentStory.image} alt={currentProduct.name} draggable={false} className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center bg-neutral-900" role="img" aria-label={currentProduct.name}>
                <Package className="size-16 text-white/40" strokeWidth={1.5} aria-hidden />
              </span>
            )}
          </motion.div>
        </AnimatePresence>

        {currentProduct.discount && currentProduct.discount > 0 ? (
          <span className="absolute start-3 top-16 z-50 bg-danger px-2.5 py-1 text-xs font-semibold text-white max-sm:start-2 max-sm:top-14" data-numeric>
            -{currentProduct.discount}%
          </span>
        ) : null}

        <div
          className="absolute inset-x-0 bottom-0 z-50 bg-black/70 px-4 pb-4 pt-3 max-sm:px-3"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="line-clamp-2 font-display text-lg font-semibold text-white">
            {currentProduct.name}
          </h3>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span className="text-xl font-semibold text-white" data-numeric>
              {formatPrice(currentProduct.price)}
            </span>
            {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price ? (
              <span className="text-sm text-white/60 line-through" data-numeric>
                {formatPrice(currentProduct.originalPrice)}
              </span>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              aria-label="عرض تفاصيل المنتج"
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--store-button-radius,4px)] border border-white/30 text-white transition-colors hover:bg-white/10"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
                onProductClick?.(currentProduct);
              }}
            >
              <ChevronUp className="size-5" strokeWidth={1.75} aria-hidden />
            </button>

            <button
              type="button"
              onClick={addCurrent}
              disabled={outOfStock}
              className={cn(
                'flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--store-button-radius,4px)] border border-white/25 text-label font-medium transition-opacity',
                outOfStock ? 'cursor-not-allowed bg-white/20 text-white' : 'text-[var(--store-button-text)]',
              )}
              style={
                outOfStock
                  ? undefined
                  : { backgroundColor: addedToCart[currentProduct.id] ? 'var(--success)' : 'var(--store-primary)' }
              }
            >
              {outOfStock ? (
                'نفدت الكمية'
              ) : addedToCart[currentProduct.id] ? (
                <>
                  <Check className="size-4" strokeWidth={2} aria-hidden />
                  تمت الإضافة
                </>
              ) : (
                <>
                  <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
                  أضف للسلة
                  <span className="bg-white/20 px-2 py-0.5 text-xs" data-numeric>{formatPrice(currentProduct.price)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
