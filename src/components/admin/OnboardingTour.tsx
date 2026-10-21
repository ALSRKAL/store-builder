/**
 * OnboardingTour — جولة تعريفية معاينة للمتجر.
 *
 * أُعيد بناؤها على Radix Dialog: حصر تركيز، Escape، قفل تمرير، وإرجاع تركيز
 * لزر إعادة التشغيل. أُزيلت الإيموجي من العناوين، والحركة تستخدم توكنات
 * `lib/motion`. المعاينة نفسها تلتزم بالتوكنات بدل `gray-*`/`indigo-*`.
 */

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  MapPin,
  Megaphone,
  Package,
  Rocket,
  ShoppingBag,
  Sparkles,
  Store,
  type LucideProps,
} from 'lucide-react';
import { demoStore, demoProducts, demoCategories } from '../../data/demoData';
import { formatPrice } from '../../data/currencies';
import type { Product } from '../../schemas';
import { cn } from '../../lib/utils';
import { Button, Dialog, DialogContent } from '../ui';
import { transition as motionTransition } from '../../lib/motion';

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<LucideProps>;
  scrollTo: string | null;
}

export const TOUR_STEPS: TourStep[] = [
  { id: 'welcome', title: 'مرحباً بك في متجرك', description: 'جولة سريعة نريك فيها كيف سيبدو متجرك الاحترافي للعملاء.', icon: Store, scrollTo: null },
  { id: 'announcement', title: 'الشريط الإعلاني', description: 'اعرض عروضك وتخفيضاتك في شريط واضح أعلى المتجر.', icon: Megaphone, scrollTo: 'tour-announcement' },
  { id: 'slider', title: 'سلايدر المنتجات', description: 'أحدث منتجاتك تظهر في سلايدر يلفت انتباه العميل.', icon: Sparkles, scrollTo: 'tour-slider' },
  { id: 'categories', title: 'التصنيفات', description: 'نظّم منتجاتك في تصنيفات ليسهل على العميل التصفح.', icon: FolderOpen, scrollTo: 'tour-categories' },
  { id: 'products', title: 'عرض المنتجات', description: 'بطاقات واضحة بالصور والأسعار والخصومات.', icon: Package, scrollTo: 'tour-products' },
  { id: 'location', title: 'موقع المتجر', description: 'أضف موقعك على الخريطة ليصل إليك العملاء بسهولة.', icon: MapPin, scrollTo: 'tour-location' },
  { id: 'ready', title: 'جاهز للانطلاق', description: 'ابدأ الآن بإضافة منتجاتك وتصنيفاتك الحقيقية.', icon: Rocket, scrollTo: null },
];

interface OnboardingTourProps {
  storeName: string | null | undefined;
  onComplete: () => void;
}

export default function OnboardingTour({ storeName, onComplete }: OnboardingTourProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);

  const step = TOUR_STEPS[currentStep]!;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const showStore = currentStep > 0 && currentStep < TOUR_STEPS.length - 1;

  const demoStoreData = {
    ...demoStore,
    name: storeName ?? 'متجرك',
    announcement: {
      enabled: true,
      text: 'خصم 20% على جميع المنتجات لفترة محدودة',
      bgColor: '#1e6b4a',
      textColor: '#fcfaf3',
    },
    location: { enabled: true, lat: 24.7136, lng: 46.6753, address: 'الرياض، المملكة العربية السعودية' },
  };

  useEffect(() => {
    if (!step.scrollTo) return;
    const element = document.getElementById(step.scrollTo);
    if (!element) return;
    const timer = window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    return () => window.clearTimeout(timer);
  }, [step.scrollTo, currentStep]);

  const next = (): void => {
    if (isLast) onComplete();
    else setCurrentStep((prev) => prev + 1);
  };

  const StepIcon = step.icon;
  const sliderProducts = demoProducts.slice(0, 4);
  const currentSliderProduct = sliderProducts[sliderIndex];

  return (
    <>
      <Dialog open onOpenChange={(open) => (!open ? onComplete() : undefined)}>
        <DialogContent
          hideHeader
          showClose={false}
          size="full"
          title="جولة تعريفية"
          className="left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-transparent shadow-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            nextRef.current?.focus();
          }}
        >
          {showStore ? (
            <div className="min-h-full bg-background pb-40">
              <div
                id="tour-announcement"
                className={cn(
                  'relative flex items-center justify-center gap-2 px-5 py-3 text-label font-medium scroll-mt-20',
                  step.scrollTo === 'tour-announcement' && 'z-10 ring-2 ring-warning',
                )}
                style={{ background: demoStoreData.announcement.bgColor, color: demoStoreData.announcement.textColor }}
              >
                <Megaphone className="size-4" aria-hidden />
                <span>{demoStoreData.announcement.text}</span>
              </div>

              <div className="sticky top-0 z-40 border-b border-border bg-card">
                <div className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border">
                      <img src={demoStoreData.logo ?? ''} alt={demoStoreData.name} className="size-full object-cover" />
                    </div>
                    <h1 className="truncate font-display text-lg font-semibold text-foreground">{demoStoreData.name}</h1>
                  </div>
                  <div className="hidden h-11 max-w-[420px] flex-1 items-center rounded-md border border-border bg-surface-sunken px-4 text-label text-fg-subtle sm:flex">
                    ابحث عن منتج…
                  </div>
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-fg-muted" aria-hidden>
                    <ShoppingBag className="size-4" strokeWidth={1.75} />
                  </span>
                </div>
                <div
                  id="tour-categories"
                  className={cn(
                    'relative flex gap-0 overflow-x-auto border-t border-border px-5 scrollbar-hide scroll-mt-20',
                    step.scrollTo === 'tour-categories' && 'z-10 ring-2 ring-warning',
                  )}
                >
                  <span className="whitespace-nowrap border-b-2 border-accent px-4 py-2.5 text-label font-semibold text-foreground">الكل</span>
                  {demoCategories.map((category) => (
                    <span key={category.id} className="whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-label font-medium text-fg-muted">
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>

              <main className="mx-auto max-w-5xl p-5">
                <div
                  id="tour-slider"
                  className={cn(
                    'relative mb-8 border-y border-border py-5 scroll-mt-20',
                    step.scrollTo === 'tour-slider' && 'z-10 ring-2 ring-warning',
                  )}
                >
                  <div className="mb-3 flex items-end justify-between gap-3 border-b border-border pb-3">
                    <div className="flex items-baseline gap-3">
                      <h2 className="flex items-center gap-2 text-h3 font-semibold text-foreground">
                        <Sparkles className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                        أحدث المنتجات
                      </h2>
                      <span className="text-label text-fg-muted" data-numeric>{sliderIndex + 1} / {sliderProducts.length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="المنتج السابق"
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-fg-muted hover:text-foreground"
                        onClick={() => setSliderIndex((prev) => (prev - 1 + 4) % 4)}
                      >
                        <ChevronRight className="size-5" strokeWidth={1.75} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="المنتج التالي"
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-fg-muted hover:text-foreground"
                        onClick={() => setSliderIndex((prev) => (prev + 1) % 4)}
                      >
                        <ChevronLeft className="size-5" strokeWidth={1.75} aria-hidden />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => currentSliderProduct && setSelectedProduct(currentSliderProduct)}
                    className="grid w-full overflow-hidden rounded-md border border-border bg-card text-start md:grid-cols-[1.15fr_0.85fr]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken md:aspect-auto md:min-h-[320px]">
                      <img src={currentSliderProduct?.images[0]} alt={currentSliderProduct?.name} className="absolute inset-0 size-full object-cover" />
                      {currentSliderProduct?.discount && currentSliderProduct.discount > 0 ? (
                        <span className="absolute end-3 top-3 bg-danger px-2 py-1 text-xs font-semibold text-white" data-numeric>
                          -{currentSliderProduct.discount}%
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col justify-center border-t border-border p-5 md:border-s md:border-t-0 md:p-7">
                      <p className="text-[11px] font-medium text-fg-muted">منتج مميز</p>
                      <h3 className="mt-2 line-clamp-2 font-display text-h2 font-semibold leading-snug text-foreground">
                        {currentSliderProduct?.name}
                      </h3>
                      {currentSliderProduct?.description ? (
                        <p className="mt-2 line-clamp-2 text-label leading-relaxed text-fg-muted">{currentSliderProduct.description}</p>
                      ) : null}
                      <div className="mt-5 flex flex-wrap items-baseline gap-3">
                        <span className="font-display text-h2 font-semibold text-foreground" data-numeric>{formatPrice(currentSliderProduct?.price ?? 0, 'SAR')}</span>
                        {currentSliderProduct?.originalPrice ? (
                          <span className="text-label text-fg-subtle line-through" data-numeric>{formatPrice(currentSliderProduct.originalPrice, 'SAR')}</span>
                        ) : null}
                      </div>
                      <span className="mt-5 inline-flex h-11 w-fit items-center gap-2 rounded-md bg-primary px-5 text-label font-medium text-primary-foreground">
                        عرض المنتج
                        <ChevronLeft className="size-4" strokeWidth={1.75} aria-hidden />
                      </span>
                    </div>
                  </button>
                </div>

                <div id="tour-products" className={cn('relative scroll-mt-20', step.scrollTo === 'tour-products' && 'z-10 ring-2 ring-warning')}>
                  <h2 className="mb-4 text-h3 font-semibold text-foreground">جميع المنتجات</h2>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-4">
                    {demoProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="overflow-hidden rounded-md border border-border bg-card text-start"
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <img src={product.images[0]} alt={product.name} loading="lazy" className="size-full object-cover" />
                          {product.discount && product.discount > 0 ? (
                            <span className="absolute end-2 top-2 bg-danger px-2 py-1 text-xs font-semibold text-white" data-numeric>-{product.discount}%</span>
                          ) : null}
                        </div>
                        <div className="p-3">
                          <h3 className="truncate text-label font-semibold text-foreground">{product.name}</h3>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-fg-muted">{product.description}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-label font-semibold text-foreground" data-numeric>{formatPrice(product.price, 'SAR')}</span>
                            {product.originalPrice ? (
                              <span className="text-[11px] text-fg-subtle line-through" data-numeric>{formatPrice(product.originalPrice, 'SAR')}</span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div id="tour-location" className={cn('relative mt-8 overflow-hidden rounded-md border border-border bg-card scroll-mt-20', step.scrollTo === 'tour-location' && 'z-10 ring-2 ring-warning')}>
                  <div className="flex items-center gap-3 border-b border-border p-5">
                    <MapPin className="size-5 text-fg-muted" aria-hidden />
                    <h2 className="text-h3 font-semibold text-foreground">موقع المتجر</h2>
                  </div>
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=46.65,24.70,46.70,24.73&layer=mapnik&marker=${demoStoreData.location.lat},${demoStoreData.location.lng}`}
                    className="h-48 w-full border-0"
                    title="موقع المتجر"
                    loading="lazy"
                  />
                  <div className="flex items-center gap-2.5 bg-surface-sunken px-5 py-4 text-label text-fg-muted">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    {demoStoreData.location.address}
                  </div>
                </div>
              </main>

              <footer className="mt-10 bg-fg px-6 py-6 text-center text-label text-white/60">
                جميع الحقوق محفوظة © {new Date().getFullYear()} {demoStoreData.name}
              </footer>
            </div>
          ) : null}

          <motion.div
            key={step.id}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={motionTransition.base}
            className={cn(
              'fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border border-border bg-card p-5 text-start shadow-overlay',
              !showStore && 'top-1/2 bottom-auto -translate-y-1/2',
            )}
            role="group"
            aria-labelledby="tour-title"
          >
            <div className="mb-2 flex items-center gap-2">
              <StepIcon className="size-4 text-fg-subtle" strokeWidth={1.75} aria-hidden />
              <h2 id="tour-title" className="font-display text-h3 font-semibold text-foreground">{step.title}</h2>
            </div>
            <p className="mt-1.5 max-w-[46ch] text-label leading-relaxed text-fg-muted">{step.description}</p>

            <div className="my-4 flex justify-start gap-1.5" aria-hidden>
              {TOUR_STEPS.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 w-4 transition-colors',
                    index === currentStep ? 'bg-accent' : index < currentStep ? 'bg-success' : 'bg-border',
                  )}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {!isFirst ? (
                <Button type="button" variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)} className="gap-1.5">
                  <ChevronRight className="size-4" aria-hidden />
                  السابق
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={onComplete}>
                  تخطي
                </Button>
              )}
              <Button ref={nextRef} type="button" onClick={next} className="flex-1 gap-1.5">
                {isLast ? (
                  <>
                    <Rocket className="size-4" aria-hidden />
                    ابدأ البناء
                  </>
                ) : (
                  <>
                    التالي
                    <ChevronLeft className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedProduct !== null} onOpenChange={(open) => (!open ? setSelectedProduct(null) : undefined)}>
        <DialogContent size="md" title={selectedProduct?.name ?? 'المنتج'}>
          {selectedProduct ? (
            <div>
              <div className="aspect-square w-full overflow-hidden bg-muted">
                <img src={selectedProduct.images[0]} alt={selectedProduct.name} className="size-full object-cover" />
              </div>
              <div className="p-5">
                <p className="text-label leading-relaxed text-fg-muted">{selectedProduct.description}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-h2 font-semibold text-foreground" data-numeric>{formatPrice(selectedProduct.price, 'SAR')}</span>
                  {selectedProduct.originalPrice ? (
                    <span className="text-label text-fg-subtle line-through" data-numeric>{formatPrice(selectedProduct.originalPrice, 'SAR')}</span>
                  ) : null}
                </div>
                <Button type="button" className="mt-5 w-full gap-2" disabled>
                  <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
                  معاينة فقط — الطلب يتم من متجرك الحقيقي
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
