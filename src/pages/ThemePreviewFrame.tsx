/**
 * ThemePreviewFrame — the live store rendered inside the theme editor's iframe.
 *
 * It uses the real storefront components (Header, ProductSlider, ProductCard,
 * StoryCircles) with the selected theme injected as CSS variables. Running in
 * an iframe matters: Tailwind breakpoints respond to the iframe viewport, so
 * the desktop preview is a real 1200px store and the mobile preview a real
 * 390px store, not a scaled drawing that keeps desktop media queries.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import StoreContext from '../contexts/StoreContext';
import CartContext from '../contexts/CartContext';
import Header from '../components/store/Header';
import ProductSlider from '../components/store/ProductSlider';
import ProductCard from '../components/store/ProductCard';
import StoryCircles from '../components/store/StoryCircles';
import { demoCategories, demoProducts, demoStore } from '../data/demoData';
import { formatPrice } from '../data/currencies';
import { buildStoreThemeVars, defaultTheme, type ThemeConfig } from '../utils/themeUtils';
import type { DisplayMode } from '../components/admin/theme/demoTheme';

interface ThemeMessage {
  type: 'theme-preview';
  theme: ThemeConfig;
  displayMode?: DisplayMode;
  storeName?: string | null;
  storeLogo?: string | null;
  currency?: string;
}

const noop = (): void => undefined;

function themeVars(theme: ThemeConfig): CSSProperties {
  return buildStoreThemeVars(theme) as CSSProperties;
}

export default function ThemePreviewFrame(): React.JSX.Element {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [storeName, setStoreName] = useState<string>('متجرك');
  const [storeLogo, setStoreLogo] = useState<string | null>(demoStore.logo ?? null);
  const [currency, setCurrency] = useState<string>('SAR');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as ThemeMessage | undefined;
      if (!data || data.type !== 'theme-preview') return;
      setTheme(data.theme);
      setDisplayMode(data.displayMode ?? 'grid');
      setStoreName(data.storeName?.trim() || 'متجرك');
      setStoreLogo(data.storeLogo ?? null);
      setCurrency(data.currency || 'SAR');
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'theme-preview-ready' }, '*');
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // The preview is visual: block dead-end actions (product open/cart), while
  // leaving wheel/touch scrolling available so the merchant can see the page.
  useEffect(() => {
    const block = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a,button,input,textarea,select,label')) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener('click', block, true);
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => {
      document.removeEventListener('click', block, true);
      robots.remove();
    };
  }, []);

  const previewStore = useMemo(
    () => ({
      ...demoStore,
      name: storeName,
      logo: storeLogo ?? undefined,
      theme,
    }),
    [storeName, storeLogo, theme],
  );

  const storeValue = useMemo(
    () =>
      ({
        store: previewStore,
        products: demoProducts,
        categories: demoCategories,
        loading: false,
        error: null,
        notFound: false,
        productsError: null,
        isStoreActive: true,
        refreshData: async () => undefined,
        formatPrice: (price: number) => formatPrice(price, currency),
      }) as never,
    [previewStore, currency],
  );

  const cartValue = useMemo(
    () =>
      ({
        cartItems: [],
        isCartOpen: false,
        isHydrated: true,
        openCart: noop,
        closeCart: noop,
        addToCart: () => setCartCount((count) => count + 1),
        updateQuantity: noop,
        removeFromCart: noop,
        clearCart: () => setCartCount(0),
        getTotal: () => 0,
        getItemsCount: () => cartCount,
        welcomeMessage: null,
        dismissWelcome: noop,
      }) as never,
    [cartCount],
  );

  const filteredProducts = useMemo(
    () =>
      demoProducts.filter((product) => {
        const matchesSearch =
          !search ||
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.description?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !category || product.categoryId === category;
        return matchesSearch && matchesCategory;
      }),
    [search, category],
  );

  const featuredProducts = useMemo(
    () =>
      [...demoProducts]
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return (b.discount ?? 0) - (a.discount ?? 0);
        })
        .slice(0, 6),
    [],
  );

  const showSlider = displayMode !== 'story' && !search && !category && featuredProducts.length > 0;

  return (
    <StoreContext.Provider value={storeValue}>
      <CartContext.Provider value={cartValue}>
        <div
          className="flex min-h-dvh flex-col bg-[var(--store-body-bg)] text-[var(--store-body-text)]"
          style={themeVars(theme)}
        >
          <Header
            onSearch={setSearch}
            searchValue={search}
            selectedCategory={category}
            onCategoryChange={setCategory}
            onCartOpen={noop}
          />

          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6">
            {showSlider ? (
              <ProductSlider products={featuredProducts} onProductClick={noop} title="أحدث المنتجات" />
            ) : null}

            {filteredProducts.length > 0 ? (
              <div className="mb-4 flex items-end justify-between gap-3">
                <h2 className="flex items-center gap-2 text-h3 font-semibold text-[var(--store-body-text)]">
                  {category ? 'منتجات التصنيف' : 'جميع المنتجات'}
                  <span className="text-[13px] font-normal tabular-nums text-[var(--store-body-text)]/60" data-numeric>
                    {filteredProducts.length}
                  </span>
                </h2>
                {search || category ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCategory(null);
                    }}
                    className="inline-flex h-11 shrink-0 items-center rounded-md px-3 text-[13px] font-medium text-[var(--store-body-text)]/70 hover:bg-[var(--store-card-bg)]"
                  >
                    مسح التصفية
                  </button>
                ) : null}
              </div>
            ) : null}

            {displayMode === 'story' && filteredProducts.length > 0 ? (
              <StoryCircles
                products={filteredProducts}
                onStoryClick={noop}
                storeName={previewStore.name}
                storeLogo={previewStore.logo}
              />
            ) : null}

            {filteredProducts.length === 0 ? (
              <div
                className="rounded-md border px-5 py-16 text-center"
                style={{ borderColor: 'var(--store-border)', backgroundColor: 'var(--store-card-bg)' }}
                role="status"
              >
                <p className="text-body font-semibold text-[var(--store-card-text)]">لا توجد منتجات مطابقة</p>
                <p className="mt-1.5 text-label text-[var(--store-card-secondary)]">
                  جرّب كلمة أخرى أو تصفح جميع المنتجات.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={noop} />
                ))}
              </div>
            )}
          </main>

          <footer className="mt-auto border-t border-white/10 bg-[var(--store-footer-bg)] px-5 py-4 text-center text-label text-[var(--store-footer-text)]">
            جميع الحقوق محفوظة © {new Date().getFullYear()} {previewStore.name}
          </footer>
        </div>
      </CartContext.Provider>
    </StoreContext.Provider>
  );
}
