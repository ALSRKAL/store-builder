/**
 * Store Page — واجهة المتجر العامة.
 *
 * المسارات: بقيت الصفحة مركّبة أثناء التنقل بين:
 *   /store/:slug                 → المتجر
 *   /store/:slug/product/:id     → نافذة المنتج
 *   /store/:slug/cart            → درج السلة
 *   /store/:slug/checkout        → إتمام الطلب
 * لذلك لا تفقد موضع التمرير، وزر الرجوع يعود خطوة واحدة طبيعية بدل اختطاف
 * `popstate` الذي كان موجوداً هنا.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Store as StoreIcon } from 'lucide-react';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';
import Header from '../components/store/Header';
import ProductSlider from '../components/store/ProductSlider';
import ProductCard from '../components/store/ProductCard';
import ProductModal from '../components/store/ProductModal';
import StoreLocation, { type LocationData } from '../components/store/StoreLocation';
import AnnouncementBar from '../components/store/AnnouncementBar';
import SmartCart from '../components/store/SmartCart';
import WelcomeBack from '../components/store/WelcomeBack';
import StoryCircles from '../components/store/StoryCircles';
import StoryViewer from '../components/store/StoryViewer';
import SocialLinks, { type SocialLinksData } from '../components/store/SocialLinks';
import CheckoutModal from '../components/store/CheckoutModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { Button, ErrorState, Skeleton, toast } from '../components/ui';
import type { Product, Store as StoreType } from '../schemas';
import { cn } from '../lib/utils';
import { transition as motionTransition } from '../lib/motion';
import { storeScopeStyle } from '../utils/themeUtils';

interface ExtendedStore extends StoreType {
  country?: string | undefined;
  isAnnualPlan?: boolean | undefined;
}

const DEFAULT_TITLE = 'StoreBuilder - أنشئ متجرك الإلكتروني مجاناً';
const DEFAULT_DESCRIPTION =
  'StoreBuilder - أنشئ متجرك الإلكتروني في دقائق بدون برمجة. منصة عربية احترافية لإنشاء المتاجر الإلكترونية.';
const DEFAULT_OG_DESCRIPTION =
  'منصة StoreBuilder لإنشاء المتاجر الإلكترونية في دقائق. بدون برمجة، بدون تعقيد.';
const DEFAULT_OG_IMAGE = 'https://store-build.pages.dev/og-image.png';

function StoreSkeleton(): React.JSX.Element {
  return (
    <div className="min-h-dvh bg-[var(--store-body-bg)]" style={storeScopeStyle} role="status" aria-live="polite" aria-label="جاري تحميل المتجر">
      <div className="h-10 w-full bg-[var(--store-primary)]/20" />
      <div className="border-b border-border bg-[var(--store-header-bg)] px-4 py-3">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="ms-auto h-11 w-40 rounded-md" />
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <Skeleton className="mb-5 h-56 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-md border border-border bg-[var(--store-card-bg)]">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Store(): React.JSX.Element {
  const { store, products, loading, productsLoading, error, notFound, productsError, isStoreActive, refreshData } = useStore();
  const { isCartOpen, openCart, closeCart, cartItems, getTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const params = useParams<{ storeId?: string; '*': string }>();
  const storeId = params.storeId ?? '';
  const basePath = `/store/${storeId}`;
  const tail = params['*'] ?? '';
  const segments = useMemo(() => tail.split('/').filter(Boolean), [tail]);
  const productId = segments[0] === 'product' ? segments[1] : undefined;
  const isCartRoute = segments[0] === 'cart';
  const isCheckoutRoute = segments[0] === 'checkout';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyStartIndex, setStoryStartIndex] = useState(0);
  // يبقى true بعد نجاح الطلب حتى يغلق العميل شاشة التأكيد، رغم تفريغ السلة.
  const [checkoutSubmitted, setCheckoutSubmitted] = useState(false);

  const extendedStore = store as ExtendedStore | null;

  const displayMode = (extendedStore?.theme as { displayMode?: 'grid' | 'story' } | undefined)?.displayMode ?? 'grid';
  const isStoryModeEnabled = displayMode === 'story';

  const routeProduct = useMemo(
    () => (productId ? products.find((product) => product.id === productId) ?? null : null),
    [productId, products],
  );

  // أي مسار فرعي غير معروف يعود إلى المتجر بدل عرضه كأنه صفحة صحيحة.
  useEffect(() => {
    if (!tail) return;
    if (segments[0] === 'product' || segments[0] === 'cart' || segments[0] === 'checkout') return;
    navigate(basePath, { replace: true });
  }, [tail, segments, navigate, basePath]);

  // مسار منتج غير موجود بعد اكتمال التحميل → عودة نظيفة بدل شاشة فارغة
  useEffect(() => {
    if (!productId || loading || productsLoading) return;
    if (routeProduct || productsError) return;
    toast.error('المنتج غير متوفر', 'ربما حُذف أو تغيّر رابطه.');
    navigate(basePath, { replace: true });
  }, [productId, productsLoading, routeProduct, productsError, loading, navigate, basePath]);

  // مزامنة مسار السلة مع حالة الدرج.
  // في /checkout نغلق الدرج لأن CheckoutModal طبقة مستقلة فوق الصفحة.
  useEffect(() => {
    if (isCartRoute) {
      if (!isCartOpen) openCart();
      return;
    }
    if (isCartOpen) closeCart();
  }, [isCartRoute, isCartOpen, openCart, closeCart]);

  // مسار checkout بسلة فارغة → العودة للسلة (إلا بعد نجاح طلب: نُبقي شاشة التأكيد)
  useEffect(() => {
    if (isCheckoutRoute && cartItems.length === 0 && !checkoutSubmitted) {
      navigate(`${basePath}/cart`, { replace: true });
    }
  }, [isCheckoutRoute, cartItems.length, checkoutSubmitted, navigate, basePath]);

  // مغادرة checkout تُصفّر علامة النجاح حتى لا تُفتح شاشة تأكيد قديمة لاحقاً.
  useEffect(() => {
    if (!isCheckoutRoute && checkoutSubmitted) setCheckoutSubmitted(false);
  }, [isCheckoutRoute, checkoutSubmitted]);

  const openProduct = (product: Product): void => {
    navigate(`${basePath}/product/${product.id}`);
  };
  const closeProduct = (): void => {
    navigate(basePath, { replace: true });
  };
  const openCartRoute = (): void => {
    openCart();
    // لا تدفع مساراً جديداً إن كنا في السلة أصلاً (زر الترحيب مثلاً).
    if (!isCartRoute) navigate(`${basePath}/cart`);
  };
  const closeCartRoute = (): void => {
    closeCart();
    if (isCartRoute) navigate(basePath, { replace: true });
  };

  const locationData: LocationData | null = useMemo(() => {
    const loc = extendedStore?.location;
    const lat = loc?.lat ?? loc?.latitude;
    const lng = loc?.lng ?? loc?.longitude;
    if (!loc || lat == null || lng == null) return null;
    return {
      lat,
      lng,
      enabled: loc.enabled,
      description: loc.description ?? loc.address,
      address: loc.city ? `${loc.city}${loc.country ? `, ${loc.country}` : ''}` : loc.address,
    };
  }, [extendedStore?.location]);

  const socialLinksData: SocialLinksData | null = useMemo(() => {
    const social = extendedStore?.socialLinks;
    if (!social) return null;
    const nested = social.links ?? {};
    return {
      enabled: social.enabled !== false,
      links: {
        instagram: nested.instagram ?? social.instagram ?? undefined,
        twitter: nested.twitter ?? social.twitter ?? undefined,
        facebook: nested.facebook ?? social.facebook ?? undefined,
        tiktok: nested.tiktok ?? social.tiktok ?? undefined,
        snapchat: nested.snapchat ?? social.snapchat ?? undefined,
        youtube: nested.youtube ?? social.youtube ?? undefined,
        telegram: nested.telegram ?? social.telegram ?? undefined,
        whatsapp: nested.whatsapp ?? social.whatsapp ?? undefined,
        website: nested.website ?? social.website ?? undefined,
      },
    };
  }, [extendedStore?.socialLinks]);

  const handleStoryClick = (index: number): void => {
    setStoryStartIndex(index);
    setShowStoryViewer(true);
  };

  const handleStoryProductClick = (product: Product): void => {
    setShowStoryViewer(false);
    openProduct(product);
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [products, searchQuery, selectedCategory],
  );

  const newProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return (b.discount ?? 0) - (a.discount ?? 0);
        })
        .slice(0, 6),
    [products],
  );

  // meta tags
  useEffect(() => {
    if (!extendedStore) return;
    const storeName = extendedStore.name ?? 'المتجر';
    const storeLogo = extendedStore.logo ?? '/og-image.jpg';
    const currentUrl = window.location.href;
    const productNames = products.slice(0, 3).map((product) => product.name);
    const description =
      products.length === 0
        ? `${storeName} - متجر إلكتروني للتسوق أونلاين`
        : `${storeName} - تسوق ${productNames.join('، ')}${products.length > 3 ? ' والمزيد' : ''} | ${products.length} منتج`;
    const title = `${storeName} | تسوق أونلاين`;

    document.title = title;
    const favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (favicon) favicon.href = extendedStore.logo ?? '/favicon.svg';
    document.querySelector('meta[name="description"]')?.setAttribute('content', description.slice(0, 160));

    const setMeta = (property: string, content: string, isProperty = true): void => {
      const selector = isProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(isProperty ? 'property' : 'name', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    const shareImage = storeLogo || products[0]?.images?.[0] || '/og-image.jpg';
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', shareImage);
    setMeta('og:url', currentUrl);
    setMeta('og:site_name', storeName);
    setMeta('og:type', 'website');
    setMeta('og:locale', 'ar_SA');
    setMeta('twitter:card', 'summary_large_image', false);
    setMeta('twitter:title', title, false);
    setMeta('twitter:description', description, false);
    setMeta('twitter:image', shareImage, false);

    return () => {
      document.title = DEFAULT_TITLE;
      document.querySelector('meta[name="description"]')?.setAttribute('content', DEFAULT_DESCRIPTION);
      setMeta('og:title', DEFAULT_TITLE);
      setMeta('og:description', DEFAULT_OG_DESCRIPTION);
      setMeta('og:image', DEFAULT_OG_IMAGE);
      setMeta('og:url', 'https://store-build.pages.dev');
      setMeta('og:site_name', 'StoreBuilder');
      setMeta('og:locale', 'ar_SA');
      setMeta('twitter:card', 'summary_large_image', false);
      setMeta('twitter:title', DEFAULT_TITLE, false);
      setMeta('twitter:description', 'منصة StoreBuilder لإنشاء المتاجر الإلكترونية في دقائق.', false);
      setMeta('twitter:image', DEFAULT_OG_IMAGE, false);
      const icon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (icon) icon.href = '/favicon.svg';
    };
  }, [extendedStore, products]);

  if (loading) return <StoreSkeleton />;

  if (error) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-[var(--store-body-bg)] p-5"
        style={{ ...storeScopeStyle, '--danger': 'var(--store-danger-text)' } as CSSProperties}
      >
        <ErrorState
          size="page"
          title="تعذّر تحميل المتجر"
          description="حدث خطأ في الاتصال. أعد المحاولة — لا حاجة لإعادة تحميل الصفحة."
          onRetry={() => void refreshData()}
        />
      </div>
    );
  }

  if (notFound || !store) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--store-body-bg)] p-5 text-center">
        <p className="mb-3 font-display text-7xl font-semibold leading-none text-fg-subtle" aria-hidden>404</p>
        <h1 className="font-display text-h1 font-semibold text-foreground">المتجر غير موجود</h1>
        <p className="mt-2 max-w-[44ch] text-body text-fg-muted">تحقق من الرابط أو تواصل مع صاحب المتجر للتأكد من عنوان الصفحة.</p>
        <a href="/" className="mt-6 inline-flex h-11 items-center rounded-md bg-foreground px-6 text-label font-medium text-background hover:bg-foreground/90">
          العودة للرئيسية
        </a>
      </div>
    );
  }

  if (!isStoreActive) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-scrim p-5">
        <div className="max-w-[480px] text-center text-scrim-foreground">
          <div className="mx-auto mb-7 flex size-16 items-center justify-center border border-white/20 bg-white/5" aria-hidden>
            <StoreIcon className="size-11" strokeWidth={1.5} />
          </div>
          <h1 className="mb-3 font-display text-h1 font-semibold text-white">المتجر مغلق مؤقتاً</h1>
          <p className="text-body text-white/80">نعتذر، هذا المتجر غير متاح حالياً. حاول مرة أخرى لاحقاً.</p>
          <p className="mt-6 inline-block rounded-full bg-white/10 px-7 py-2.5 text-body font-bold ring-1 ring-white/20">{extendedStore?.name}</p>
        </div>
      </div>
    );
  }

  const showSlider = !isStoryModeEnabled && !searchQuery && !selectedCategory && newProducts.length > 0;

  return (
    <ErrorBoundary section="المتجر">
      <div className="flex min-h-dvh flex-col bg-[var(--store-body-bg)]" style={storeScopeStyle}>
        <AnnouncementBar announcement={extendedStore?.announcement} />
        <Header
          onSearch={setSearchQuery}
          searchValue={searchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onCartOpen={openCartRoute}
        />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 max-md:px-3">
          {showSlider ? <ProductSlider products={newProducts} onProductClick={openProduct} title="أحدث المنتجات" /> : null}

          {filteredProducts.length > 0 || searchQuery || selectedCategory ? (
            <div className="mb-4 flex items-end justify-between gap-3">
              <h2 className="flex items-center gap-2 text-h3 font-semibold text-[var(--store-body-text)]">
                {selectedCategory ? 'منتجات التصنيف' : 'جميع المنتجات'}
                <span className="text-[13px] font-normal tabular-nums text-[var(--store-body-text)]/60" data-numeric>
                  {filteredProducts.length}
                </span>
              </h2>
              {searchQuery || selectedCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                  }}
                  className="inline-flex h-11 shrink-0 items-center rounded-md px-3 text-[13px] font-medium text-[var(--store-body-text)]/70 hover:bg-[var(--store-card-bg)]"
                >
                  مسح التصفية
                </button>
              ) : null}
            </div>
          ) : null}

          {isStoryModeEnabled && filteredProducts.length > 0 ? (
            <StoryCircles products={filteredProducts} onStoryClick={handleStoryClick} storeName={extendedStore?.name} storeLogo={extendedStore?.logo} />
          ) : null}

          {filteredProducts.length === 0 && productsError ? (
            <ErrorState
              title="تعذّر تحميل المنتجات"
              description="المتجر يعمل، لكن قائمة المنتجات لم تصل. أعد المحاولة دون مغادرة الصفحة."
              onRetry={() => void refreshData()}
            />
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-md border border-border bg-[var(--store-card-bg)] px-5 py-16 text-center" role="status">
              <Package className="mx-auto mb-3 size-11 text-fg-subtle" strokeWidth={1.5} aria-hidden />
              <p className="text-body font-bold text-[var(--store-card-text)]">لا توجد منتجات مطابقة</p>
              {searchQuery ? (
                <>
                  <p className="mx-auto mt-1.5 max-w-[46ch] text-label leading-relaxed text-[var(--store-card-secondary)]">
                    لا توجد نتائج عن “{searchQuery}”. جرّب كلمات أخرى أو تصفح جميع المنتجات.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    className="mt-4"
                  >
                    عرض جميع المنتجات
                  </Button>
                </>
              ) : (
                <p className="mt-1.5 text-label text-[var(--store-card-secondary)]">لا توجد منتجات في هذا القسم حالياً.</p>
              )}
            </div>
          ) : (
            <motion.div
              className={cn('grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-5')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={motionTransition.base}
            >
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} onClick={openProduct} index={index} />
              ))}
            </motion.div>
          )}

          <StoreLocation location={locationData} />
          <SocialLinks socialLinks={socialLinksData} />
        </main>

        {routeProduct ? <ProductModal product={routeProduct} onClose={closeProduct} /> : null}

        <SmartCart
          onRequestClose={closeCartRoute}
          onCheckout={() => {
            closeCart();
            // replace: يمنع بقاء /checkout في التاريخ فيعيد زر الرجوع فتح سلة فارغة.
            navigate(`${basePath}/checkout`, { replace: true });
          }}
        />
        <WelcomeBack onViewCart={openCartRoute} />

        {showStoryViewer ? (
          <StoryViewer
            products={filteredProducts}
            initialIndex={storyStartIndex}
            onClose={() => setShowStoryViewer(false)}
            onProductClick={handleStoryProductClick}
          />
        ) : null}

        {isCheckoutRoute && (cartItems.length > 0 || checkoutSubmitted) ? (
          <CheckoutModal
            isOpen
            onClose={() => navigate(`${basePath}/cart`, { replace: true })}
            items={cartItems}
            total={getTotal()}
            onOrderCreated={() => {
              // تفريغ السلة فور نجاح الطلب يمنع إرساله مرة أخرى عند الرجوع/التحديث،
              // بينما تبقى شاشة التأكيد ظاهرة عبر checkoutSubmitted.
              clearCart();
              setCheckoutSubmitted(true);
            }}
            onSuccess={() => {
              setCheckoutSubmitted(false);
              navigate(basePath, { replace: true });
              clearCart();
              closeCart();
            }}
          />
        ) : null}

        <footer className="mt-auto border-t border-white/10 bg-[var(--store-footer-bg)] px-5 py-4 text-center text-label text-[var(--store-footer-text)]">
          {extendedStore?.isAnnualPlan ? (
            <p className="m-0 opacity-85">جميع الحقوق محفوظة © {new Date().getFullYear()} {extendedStore.name}</p>
          ) : (
            <p className="m-0 opacity-85">
              جميع الحقوق محفوظة ©{' '}
              <a href="/" className="inline-flex min-h-11 items-center text-[var(--store-footer-text)] no-underline opacity-90 hover:opacity-100 hover:underline">
                StoreBuilder
              </a>
            </p>
          )}
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default Store;
