/**
 * StoryCircles — story rail.
 * Merchant-color ring, no pulse, no drag animation, 64px targets.
 */

import { Package } from 'lucide-react';
import type { Product } from '../../schemas/product';
import { storeScopeStyle } from '../../utils/themeUtils';

export interface StoryCirclesProps {
  products: Product[];
  onStoryClick: (index: number) => void;
  storeName?: string | null | undefined;
  storeLogo?: string | null | undefined;
}

export default function StoryCircles({ products, onStoryClick, storeName, storeLogo }: StoryCirclesProps): React.JSX.Element | null {
  if (!products || products.length === 0) return null;

  return (
    <section
      className="mb-5 border-y py-4 max-md:mb-4 max-md:py-3"
      style={{ borderColor: 'var(--store-border)', ...storeScopeStyle }}
      aria-label="قصص المنتجات"
    >
      <div className="flex gap-4 overflow-x-auto px-1 py-1 scrollbar-hide max-sm:gap-2.5">
        <button
          type="button"
          className="flex shrink-0 flex-col items-center gap-1.5"
          onClick={() => onStoryClick(0)}
        >
          <span
            className="block size-16 rounded-full p-[2px]"
            style={{ backgroundColor: 'var(--store-primary)' }}
          >
            <span className="flex size-full items-center justify-center overflow-hidden rounded-full p-0.5" style={{ backgroundColor: 'var(--store-card-bg)' }}>
              {storeLogo ? (
                <img src={storeLogo} alt="" loading="lazy" className="size-full rounded-full object-cover" />
              ) : (
                <span
                  className="flex size-full items-center justify-center rounded-full text-lg font-semibold text-[var(--store-button-text)]"
                  style={{ backgroundColor: 'var(--store-primary)' }}
                  aria-hidden
                >
                  {storeName?.charAt(0) ?? 'م'}
                </span>
              )}
            </span>
          </span>
          <span className="max-w-[70px] truncate text-[11px] font-medium" style={{ color: 'var(--store-card-text)' }}>
            {storeName ?? 'المتجر'}
          </span>
        </button>

        {products.map((product, index) => (
          <button
            key={product.id}
            type="button"
            className="relative flex shrink-0 flex-col items-center gap-1.5"
            onClick={() => onStoryClick(index)}
            aria-label={`فتح قصة ${product.name}`}
          >
            <span
              className="block size-16 rounded-full p-[2px]"
              style={{ backgroundColor: product.discount && product.discount > 0 ? 'var(--danger)' : 'var(--store-primary)' }}
            >
              <span className="block size-full overflow-hidden rounded-full p-0.5" style={{ backgroundColor: 'var(--store-card-bg)' }}>
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt="" loading="lazy" decoding="async" className="size-full rounded-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center rounded-full bg-muted" aria-hidden>
                    <Package className="size-5 text-fg-subtle" strokeWidth={1.5} />
                  </span>
                )}
              </span>
            </span>
            <span className="max-w-[70px] truncate text-[11px] font-medium" style={{ color: 'var(--store-card-text)' }}>
              {product.name.length > 9 ? `${product.name.slice(0, 9)}…` : product.name}
            </span>
            {product.discount && product.discount > 0 ? (
              <span className="absolute -top-0.5 end-0 bg-danger px-1 py-0.5 text-[11px] font-semibold text-white" data-numeric>
                -{product.discount}%
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}
