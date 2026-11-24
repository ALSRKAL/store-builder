/**
 * Storefront header — solid merchant surface, text tabs, one cart action.
 * No floating cart blob, no pill filters, no shadow.
 */

import { useEffect, useMemo, useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { isLightColor } from '../../utils/themeUtils';
import { cn } from '../../lib/utils';

interface HeaderProps {
  onSearch: (query: string) => void;
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  onCartOpen: () => void;
  /** القيمة الحالية من الصفحة الأم؛ تُبقي الحقل متزامناً مع مسح البحث خارجياً. */
  searchValue?: string;
}

export default function Header({ onSearch, selectedCategory, onCategoryChange, onCartOpen, searchValue }: HeaderProps): React.JSX.Element {
  const { store, categories, products } = useStore();
  const { getItemsCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchValue ?? '');
  const [searchOpen, setSearchOpen] = useState(false);

  // يبقى الحقل متزامناً عندما يمسح المتجر البحث من خارج الهيدر
  // (مثلاً زر «عرض جميع المنتجات» في حالة عدم وجود نتائج).
  useEffect(() => {
    if (searchValue !== undefined) setSearchQuery(searchValue);
  }, [searchValue]);

  const cartCount = getItemsCount();
  const isDarkHeader = useMemo(
    () => !isLightColor(store?.theme?.headerBg ?? '#f4f1e8'),
    [store?.theme?.headerBg],
  );

  const primaryForContrast = store?.theme?.primary ?? store?.theme?.primaryColor ?? '#191710';
  const headerNameColor =
    isDarkHeader || isLightColor(primaryForContrast)
      ? 'var(--store-header-text)'
      : 'var(--store-primary)';

  const updateSearch = (value: string): void => {
    setSearchQuery(value);
    onSearch(value);
  };

  const clearSearch = (): void => {
    setSearchQuery('');
    onSearch('');
  };

  const pickCategory = (id: string | null): void => {
    onCategoryChange(id);
    setMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: 'var(--store-header-bg)',
        borderColor: 'var(--store-border)',
        color: 'var(--store-header-text)',
      }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 max-md:px-3">
        <div className="flex items-center justify-between gap-3 py-2.5">
          <button
            type="button"
            onClick={() => {
              updateSearch('');
              pickCategory(null);
            }}
            className="flex min-h-11 min-w-0 items-center gap-2.5 text-start"
          >
            {store?.logo ? (
              <img
                src={store.logo}
                alt=""
                className="size-9 shrink-0 rounded-md border object-cover"
                style={{ borderColor: 'var(--store-border)' }}
              />
            ) : (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-[var(--store-button-text)]"
                style={{ backgroundColor: 'var(--store-primary)' }}
                aria-hidden
              >
                <ShoppingBag className="size-4" strokeWidth={1.75} />
              </span>
            )}
            <span
              className="truncate font-display text-lg font-semibold"
              style={{
                color: headerNameColor,
              }}
            >
              {store?.name ?? 'المتجر'}
            </span>
          </button>

          <div
            className={cn(
              'hidden min-h-11 max-w-[420px] flex-1 items-center gap-2.5 rounded-md border px-3.5 transition-colors md:flex',
              isDarkHeader ? 'border-white/20 bg-white/10' : 'border-[var(--store-border)] bg-[var(--store-card-bg)]',
            )}
          >
            <Search className="size-4 shrink-0 text-[var(--store-header-text)] opacity-70" strokeWidth={1.75} aria-hidden />
            <label htmlFor="store-search-desktop" className="sr-only">ابحث عن منتج</label>
            <input
              id="store-search-desktop"
              type="search"
              placeholder="ابحث عن منتج…"
              value={searchQuery}
              onChange={(event) => updateSearch(event.target.value)}
              className="h-11 min-w-[150px] flex-1 border-0 bg-transparent text-label outline-none placeholder:text-[var(--store-header-text)] placeholder:opacity-60"
              style={{ color: 'var(--store-header-text)' }}
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="مسح البحث"
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--store-header-text)] opacity-70 hover:bg-[var(--store-body-bg)] hover:opacity-100"
                onClick={clearSearch}
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCartOpen}
              aria-label={`السلة، ${cartCount} عنصر`}
              className="relative inline-flex size-12 items-center justify-center rounded-md border transition-colors md:size-11"
              style={{
                borderColor: isDarkHeader ? 'rgba(255,255,255,0.25)' : 'var(--store-border)',
                color: 'var(--store-header-text)',
              }}
            >
              <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden />
              {cartCount > 0 ? (
                <span
                  className="absolute -end-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded bg-[var(--store-primary)] px-1 text-[10px] font-semibold leading-4 text-[var(--store-button-text)]"
                  data-numeric
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label={searchOpen ? 'إغلاق البحث' : 'فتح البحث'}
              aria-expanded={searchOpen}
              className={cn(
                'inline-flex size-12 items-center justify-center rounded-md border transition-colors md:hidden',
                searchOpen ? 'border-transparent' : '',
              )}
              style={{
                borderColor: isDarkHeader ? 'rgba(255,255,255,0.25)' : 'var(--store-border)',
                backgroundColor: searchOpen ? 'var(--store-primary)' : 'transparent',
                color: searchOpen ? 'var(--store-button-text)' : 'var(--store-header-text)',
              }}
              onClick={() => {
                setSearchOpen((open) => !open);
                if (searchOpen) clearSearch();
              }}
            >
              {searchOpen ? <X className="size-5" strokeWidth={1.75} aria-hidden /> : <Search className="size-5" strokeWidth={1.75} aria-hidden />}
            </button>

            <button
              type="button"
              aria-label={menuOpen ? 'إغلاق التصنيفات' : 'فتح التصنيفات'}
              aria-expanded={menuOpen}
              className={cn(
                'inline-flex size-12 items-center justify-center rounded-md border transition-colors md:hidden',
                menuOpen ? 'border-transparent' : '',
              )}
              style={{
                borderColor: isDarkHeader ? 'rgba(255,255,255,0.25)' : 'var(--store-border)',
                backgroundColor: menuOpen ? 'var(--store-primary)' : 'transparent',
                color: menuOpen ? 'var(--store-button-text)' : 'var(--store-header-text)',
              }}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="size-5" strokeWidth={1.75} aria-hidden /> : <Menu className="size-5" strokeWidth={1.75} aria-hidden />}
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className="pb-2.5 md:hidden">
            <div
              className="flex items-center gap-2.5 rounded-md border px-3.5"
              style={{
                borderColor: isDarkHeader ? 'rgba(255,255,255,0.25)' : 'var(--store-border)',
                backgroundColor: isDarkHeader ? 'rgba(255,255,255,0.1)' : 'var(--store-card-bg)',
              }}
            >
              <Search className="size-4 shrink-0 text-[var(--store-header-text)] opacity-70" strokeWidth={1.75} aria-hidden />
              <label htmlFor="store-search-mobile" className="sr-only">ابحث عن منتج</label>
              <input
                id="store-search-mobile"
                type="search"
                placeholder="ابحث عن منتج…"
                value={searchQuery}
                onChange={(event) => updateSearch(event.target.value)}
                autoFocus
                className="h-11 flex-1 border-0 bg-transparent text-label outline-none placeholder:text-[var(--store-header-text)] placeholder:opacity-60"
                style={{ color: 'var(--store-header-text)' }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  aria-label="مسح البحث"
                  className="flex size-11 items-center justify-center text-[var(--store-header-text)] opacity-70 hover:opacity-100"
                  onClick={clearSearch}
                >
                  <X className="size-4" strokeWidth={1.75} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <nav
          className={cn(
            'gap-0 overflow-x-auto border-t scrollbar-hide md:flex md:flex-row',
            menuOpen ? 'flex flex-col' : 'hidden md:flex',
          )}
          style={{ borderColor: 'var(--store-border)' }}
          aria-label="تصنيفات المتجر"
        >
          <CategoryButton
            label="الكل"
            count={products.length}
            active={!selectedCategory}
            onClick={() => pickCategory(null)}
          />
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              label={category.name}
              count={products.filter((product) => product.categoryId === category.id).length}
              active={selectedCategory === category.id}
              onClick={() => pickCategory(category.id)}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="relative flex min-h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 text-label transition-colors"
      style={{
        borderColor: active ? 'var(--store-accent)' : 'transparent',
        color: 'var(--store-header-text)',
        opacity: active ? 1 : 0.65,
        fontWeight: active ? 600 : 400,
      }}
    >
      {label}
      <span className="text-[11px] tabular-nums opacity-70" data-numeric>
        {count}
      </span>
    </button>
  );
}
