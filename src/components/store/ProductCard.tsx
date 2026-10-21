/**
 * ProductCard — flat product row for the storefront.
 * 1px merchant border, square image, visible 44px add action, no hover overlay,
 * no shadow, no pill badges.
 */

import { useState } from 'react';
import { Check, ShoppingBag, ShoppingCart } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { useCart, type CartProductInput } from '../../contexts/CartContext';
import type { Product } from '../../schemas/product';
import { cn } from '../../lib/utils';
import { toast } from '../ui';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  index?: number;
}

export default function ProductCard({ product, onClick }: ProductCardProps): React.JSX.Element {
  const { formatPrice } = useStore();
  const { addToCart } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const mainImage = product.images?.[0];
  const outOfStock = product.inStock === false;
  const hasVariants = (product.colors?.length ?? 0) > 0 || (product.sizes?.length ?? 0) > 0;

  const quickAdd = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    if (outOfStock) return;
    // المنتج ذو الألوان/المقاسات يحتاج اختياراً صريحاً؛ نفتح التفاصيل بدل
    // إضافة سطر بلا لون أو مقاس ثم إنشاء سطر ثانٍ عند الإضافة من النافذة.
    if (hasVariants) {
      onClick(product);
      return;
    }
    const cartProduct: CartProductInput = {
      id: product.id,
      name: product.name,
      price: product.price,
      oldPrice: product.originalPrice,
      images: product.images,
    };
    addToCart(cartProduct, { quantity: 1 });
    setAddedToCart(true);
    toast.success('تمت الإضافة إلى السلة', product.name);
    window.setTimeout(() => setAddedToCart(false), 1500);
  };

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden bg-[var(--store-card-bg)] transition-colors hover:border-[var(--store-primary)]"
      style={{
        borderRadius: 'var(--store-card-radius, 6px)',
        border: '1px solid var(--store-border, transparent)',
        color: 'var(--store-card-text)',
      }}
    >
      <button
        type="button"
        onClick={() => onClick(product)}
        aria-label={`عرض تفاصيل ${product.name} بسعر ${product.price}`}
        className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--store-primary)]"
      >
        <span className="sr-only">عرض التفاصيل</span>
      </button>

      <div className="relative aspect-square overflow-hidden bg-[var(--store-body-bg)]">
        {!imageLoaded && !imageError ? (
          <div className="absolute inset-0 flex animate-pulse items-center justify-center text-[var(--store-card-secondary)]" aria-hidden>
            <ShoppingBag className="size-7" strokeWidth={1.5} />
          </div>
        ) : null}

        {mainImage && !imageError ? (
          <img
            src={mainImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={cn('size-full object-cover transition-opacity duration-300', imageLoaded ? 'opacity-100' : 'opacity-0')}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-[var(--store-card-secondary)]" aria-hidden>
            <ShoppingBag className="size-9" strokeWidth={1.5} />
          </div>
        )}

        <div className="pointer-events-none absolute end-2 top-2 z-[2] flex flex-col items-end gap-1">
          {product.discount && product.discount > 0 ? (
            <span className="bg-[var(--danger)] px-2 py-0.5 text-[11px] font-semibold text-white" data-numeric>
              -{product.discount}%
            </span>
          ) : null}
          {outOfStock ? (
            <span className="bg-[var(--fg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--bg)]">
              نفدت الكمية
            </span>
          ) : null}
        </div>

        {!outOfStock ? (
          <button
            type="button"
            aria-label={`أضف ${product.name} إلى السلة`}
            className="absolute bottom-2 start-2 z-[2] flex size-11 items-center justify-center rounded-[var(--store-button-radius,4px)] text-[var(--store-button-text)] transition-opacity hover:opacity-90"
            style={{ backgroundColor: addedToCart ? 'var(--success)' : 'var(--store-primary)' }}
            onClick={quickAdd}
          >
            {addedToCart ? (
              <Check className="size-4" strokeWidth={2} aria-hidden />
            ) : (
              <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3.5 max-sm:p-3">
        <h3 className="line-clamp-2 min-h-[2.7em] text-[0.95rem] font-semibold leading-snug max-sm:line-clamp-1 max-sm:min-h-0 max-sm:text-sm">
          {product.name}
        </h3>

        {product.description ? (
          <p className="mb-2 mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--store-card-secondary)] max-sm:hidden">
            {product.description}
          </p>
        ) : null}

        {product.colors && product.colors.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5" aria-label={`${product.colors.length} ألوان متاحة`}>
            {product.colors.slice(0, 5).map((color, colorIndex) => (
              <span
                key={colorIndex}
                className="size-3.5 border border-black/10"
                style={{ background: color }}
              />
            ))}
            {product.colors.length > 5 ? (
              <span className="text-[11px] font-medium text-[var(--store-card-secondary)]" data-numeric>
                +{product.colors.length - 5}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-[var(--store-border)] pt-2.5 max-sm:mt-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold text-[var(--store-card-text)] max-sm:text-[0.9rem]" data-numeric>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price ? (
              <span
                className="text-[11px] line-through text-[var(--store-card-secondary)]"
                data-numeric
              >
                {formatPrice(product.originalPrice)}
              </span>
            ) : null}
          </div>

          {product.sizes && product.sizes.length > 0 ? (
            <span className="text-[11px] font-medium text-[var(--store-card-secondary)] max-sm:hidden" data-numeric>
              {product.sizes.length} مقاسات
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
