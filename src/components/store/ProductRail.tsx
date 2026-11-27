import { useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import type { Product } from '../../schemas/product';

interface ProductRailProps {
  title: string;
  products: Product[];
  onProduct: (product: Product) => void;
  onViewAll?: () => void;
  count?: number;
}

/**
 * Salla-style horizontal product rail. It keeps the home page short: two cards
 * per screen on phones, three on tablets and four on desktop, with a snap rail
 * and 44px scroll controls. The full category opens through "عرض الكل".
 */
export default function ProductRail({ title, products, onProduct, onViewAll, count = products.length }: ProductRailProps): React.JSX.Element {
  const railRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const scroll = (direction: -1 | 1): void => {
    const rail = railRef.current;
    if (!rail) return;
    const amount = Math.max(220, rail.clientWidth * 0.8);
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section className="mb-8" aria-labelledby={titleId}>
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--store-border)] pb-2.5">
        <h2 id={titleId} className="flex min-w-0 items-center gap-2 text-h3 font-semibold text-[var(--store-body-text)]">
          <span className="truncate">{title}</span>
          <span className="shrink-0 text-[13px] font-normal tabular-nums text-[var(--store-body-text)]/60" data-numeric>{count}</span>
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {onViewAll ? (
            <button
              type="button"
              onClick={onViewAll}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-[13px] font-medium text-[var(--store-body-text)]/70 hover:bg-[var(--store-card-bg)]"
            >
              عرض الكل
            </button>
          ) : null}
          <div className="hidden items-center border border-[var(--store-border)] sm:flex" role="group" aria-label={`تمرير ${title}`}>
            <button
              type="button"
              aria-label={`السابق في ${title}`}
              onClick={() => scroll(-1)}
              className="inline-flex size-11 items-center justify-center border-e border-[var(--store-border)] text-[var(--store-body-text)]/70 transition-colors hover:bg-[var(--store-card-bg)]"
            >
              <ChevronRight className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={`التالي في ${title}`}
              onClick={() => scroll(1)}
              className="inline-flex size-11 items-center justify-center text-[var(--store-body-text)]/70 transition-colors hover:bg-[var(--store-card-bg)]"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={railRef}
        role="region"
        aria-label={`قسم ${title}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); scroll(1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); scroll(-1); }
        }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scrollbar-hide pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-primary)]"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[44%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%]"
          >
            <ProductCard product={product} onClick={onProduct} />
          </div>
        ))}
      </div>
    </section>
  );
}
