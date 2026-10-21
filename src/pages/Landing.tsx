/**
 * Landing — the product page for merchants.
 *
 * Layout follows DESIGN.md: paper/ink, hairline rules, one saffron marker,
 * split section headers, a ruled feature ledger, and an honest order receipt
 * instead of a fake browser mockup. No pills above headings, no icon tiles,
 * no gradients, no equal-card feature grid.
 */

import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LayoutDashboard,
  Layers,
  Link2,
  MessageCircle,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import { Button } from '../components/ui';
import Wordmark from '../components/brand/Wordmark';
import { demoProducts } from '../data/demoData';

interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface Step {
  title: string;
  desc: string;
}

const features: Feature[] = [
  {
    icon: <MessageCircle size={18} strokeWidth={1.75} aria-hidden />,
    title: 'طلبات على واتساب',
    desc: 'كل طلب يصل كرسالة منظمة: المنتجات، الكميات، الاسم، الرقم، والعنوان. بلا عمولة وبلا بوابة دفع.',
  },
  {
    icon: <Layers size={18} strokeWidth={1.75} aria-hidden />,
    title: 'عرض على شكل ستوري',
    desc: 'بدّل شبكة المنتجات إلى قصص متتابعة عندما تكون الصور هي ما يبيع.',
  },
  {
    icon: <ShoppingBag size={18} strokeWidth={1.75} aria-hidden />,
    title: 'سلة محفوظة',
    desc: 'تبقى سلة العميل على جهازه بين الزيارات، مع تعديل الكميات قبل إتمام الطلب.',
  },
  {
    icon: <Smartphone size={18} strokeWidth={1.75} aria-hidden />,
    title: 'مصمم للهاتف أولاً',
    desc: 'صفحة سريعة تعمل كتطبيق على الهاتف، حيث يأتي معظم زوار المتاجر الصغيرة.',
  },
  {
    icon: <LayoutDashboard size={18} strokeWidth={1.75} aria-hidden />,
    title: 'لوحة تشغيل واضحة',
    desc: 'المنتجات والتصنيفات والطلبات والمظهر والرابط في مكان واحد، بلا قوائم متشعبة.',
  },
  {
    icon: <Link2 size={18} strokeWidth={1.75} aria-hidden />,
    title: 'رابط واحد للمشاركة',
    desc: 'رابط ثابت لمتجرك تضعه في البايو أو ترسله في محادثة، ويعمل على كل الأجهزة.',
  },
];

const steps: Step[] = [
  {
    title: 'أنشئ الحساب وبيانات المتجر',
    desc: 'الاسم ورقم واتساب والشعار. يُنشأ رابط المتجر مباشرة بعد الإعداد.',
  },
  {
    title: 'أضف المنتجات وخصّص المظهر',
    desc: 'صور، أسعار، تصنيفات، ألوان ومقاسات، مع معاينة لما يراه العميل.',
  },
  {
    title: 'شارك الرابط واستقبل الطلبات',
    desc: 'انشر الرابط. تصل الطلبات إلى واتساب بكل التفاصيل، وتديرها من اللوحة.',
  },
];

function Receipt(): React.JSX.Element {
  const items = demoProducts.slice(0, 3);
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <figure className="m-0 w-full max-w-[420px] justify-self-center lg:justify-self-end">
      <div className="relative border border-border border-t-[3px] border-t-foreground bg-surface px-5 pb-5 pt-4">
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-border pb-4">
          <div>
            <p className="text-[11px] font-medium text-fg-subtle">طلب جديد</p>
            <p className="mt-0.5 font-display text-lg font-semibold text-foreground" dir="ltr">
              #1042
            </p>
          </div>
          <div className="text-end">
            <p className="text-label font-semibold text-foreground">متجر النخبة</p>
            <p className="text-[11px] text-fg-subtle">14:32 — اليوم</p>
          </div>
        </div>

        <ul className="divide-y divide-border" aria-label="عناصر الطلب">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 py-2.5">
              <span className="min-w-0 truncate text-label text-foreground">
                <span className="text-fg-subtle" data-numeric>
                  ×1
                </span>{' '}
                {item.name}
              </span>
              <span className="shrink-0 text-label font-medium text-foreground" data-numeric>
                {item.price} ر.س
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-label text-fg-muted">المجموع</span>
          <span className="font-display text-xl font-semibold text-foreground" data-numeric>
            {total} ر.س
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-dashed border-border pt-3 text-[12px]">
          <dt className="text-fg-subtle">العميل</dt>
          <dd className="m-0 text-foreground">سارة العتيبي</dd>
          <dt className="text-fg-subtle">الهاتف</dt>
          <dd className="m-0 text-foreground" dir="ltr">
            +966 55 123 4567
          </dd>
          <dt className="text-fg-subtle">التوصيل</dt>
          <dd className="m-0 text-foreground">الرياض — حي الياسمين</dd>
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3 bg-success px-3 py-2.5 text-success-foreground">
          <span className="flex items-center gap-2 text-[12px] font-medium">
            <MessageCircle size={15} strokeWidth={1.75} aria-hidden />
            أُرسل إلى واتساب
          </span>
          <Check size={15} strokeWidth={2} aria-hidden />
        </div>

        <span
          aria-hidden
          className="absolute -top-3 end-4 -rotate-6 border-2 border-accent bg-surface px-2 py-0.5 font-display text-[11px] font-bold text-accent"
        >
          مؤكد
        </span>
      </div>

      <figcaption className="mt-3 text-[12px] leading-relaxed text-fg-subtle">
        واجهة الطلب كما تصل إلى واتساب المتجر — بيانات تجريبية.
      </figcaption>
    </figure>
  );
}

function Landing(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:border focus:border-border focus:bg-surface focus:px-4 focus:py-2 focus:text-label focus:text-foreground"
      >
        تخطَّ إلى المحتوى
      </a>

      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link to="/" className="inline-flex min-h-11 items-center" aria-label="StoreBuilder — الرئيسية">
            <Wordmark size="md" />
          </Link>

          <nav className="flex items-center gap-1" aria-label="التنقل الرئيسي">
            <Link
              to="/store/demo"
              className="hidden h-11 items-center px-3 text-label font-medium text-fg-muted transition-colors hover:text-foreground sm:inline-flex"
            >
              متجر تجريبي
            </Link>
            <Link
              to="/terms"
              className="hidden h-11 items-center px-3 text-label font-medium text-fg-muted transition-colors hover:text-foreground sm:inline-flex"
            >
              الشروط
            </Link>
            <span aria-hidden className="mx-2 hidden h-5 w-px bg-border sm:block" />
            <Link
              to="/admin"
              className="inline-flex h-11 items-center px-3 text-label font-medium text-fg-muted transition-colors hover:text-foreground"
            >
              دخول التجار
            </Link>
            <Button asChild size="default" className="ms-1">
              <Link to="/admin">ابدأ متجرك</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="border-b border-border" aria-labelledby="hero-title">
          <div className="container grid items-center gap-12 py-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 lg:py-20">
            <div>
              <h1
                id="hero-title"
                className="max-w-[17ch] font-display text-[2.35rem] font-semibold leading-[1.25] text-foreground sm:text-[3rem] lg:text-[3.6rem]"
              >
                متجر إلكتروني جاهز للمشاركة، وطلباتك تصل على{' '}
                <span className="highlight-mark">واتساب</span>.
              </h1>

              <p className="mt-6 max-w-[54ch] text-body leading-relaxed text-fg-muted sm:text-[1.0625rem]">
                أضف منتجاتك، خصّص المظهر، وشارك رابطاً واحداً. كل طلب يصل إلى رقمك
                برقمه وتفاصيله — بلا عمولات، وبلا بوابات دفع معقدة.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button asChild size="lg">
                  <Link to="/admin">
                    أنشئ متجرك
                    <ArrowLeft size={17} strokeWidth={1.75} aria-hidden />
                  </Link>
                </Button>
                <Link
                  to="/store/demo"
                  className="inline-flex min-h-11 items-center gap-1.5 text-label font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
                >
                  افتح المتجر التجريبي
                  <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
                </Link>
              </div>

              <dl className="mt-10 grid grid-cols-3 border-t border-border">
                {[
                  { value: '7', unit: 'أيام', label: 'تجربة كاملة' },
                  { value: '0', unit: '٪', label: 'عمولة على الطلبات' },
                  { value: '1', unit: 'رابط', label: 'لكل متجر' },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={index === 0 ? 'py-4 pe-4' : 'border-s border-border py-4 pe-4 ps-4'}
                  >
                    <dt className="text-[12px] text-fg-subtle">{item.label}</dt>
                    <dd className="m-0 mt-1 flex items-baseline gap-1.5">
                      <span className="font-display text-2xl font-semibold text-foreground" data-numeric>
                        {item.value}
                      </span>
                      <span className="text-[12px] text-fg-muted">{item.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <Receipt />
          </div>
        </section>

        {/* Feature ledger */}
        <section className="border-b border-border" aria-labelledby="features-title">
          <div className="container py-14 sm:py-20">
            <div className="grid gap-x-16 gap-y-4 border-b border-border pb-8 lg:grid-cols-2 lg:items-end">
              <h2
                id="features-title"
                className="max-w-[20ch] font-display text-[1.75rem] font-semibold leading-snug text-foreground sm:text-[2.1rem]"
              >
                كل ما تحتاجه لإدارة البيع اليومي
              </h2>
              <p className="max-w-[56ch] text-body leading-relaxed text-fg-muted lg:justify-self-end">
                مصمم للمهام المتكررة عند التاجر: إضافة منتج، مراجعة طلب، تعديل سعر.
                كل شيء في مسار واحد بلا خطوات زائدة.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 lg:gap-x-16">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="grid grid-cols-[22px_1fr] gap-x-4 border-b border-border py-6"
                >
                  <span className="mt-0.5 text-accent">{feature.icon}</span>
                  <div>
                    <h3 className="font-display text-[1.0625rem] font-semibold leading-snug text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-fg-muted">
                      {feature.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="border-b border-border bg-surface-sunken/40" aria-labelledby="how-title">
          <div className="container py-14 sm:py-20">
            <div className="grid gap-x-16 gap-y-4 border-b border-border pb-8 lg:grid-cols-2 lg:items-end">
              <h2
                id="how-title"
                className="max-w-[22ch] font-display text-[1.75rem] font-semibold leading-snug text-foreground sm:text-[2.1rem]"
              >
                من التسجيل إلى أول طلب في ثلاث خطوات
              </h2>
              <p className="max-w-[52ch] text-body leading-relaxed text-fg-muted lg:justify-self-end">
                لا تحتاج خبرة تقنية ولا إعداد خادم. أنشئ الحساب، أضف منتجك الأول،
                وشارك الرابط.
              </p>
            </div>

            <ol className="grid md:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className={
                    index === 0
                      ? 'py-8 md:pe-8'
                      : 'border-t border-border py-8 md:border-s md:border-t-0 md:pe-8 md:ps-8'
                  }
                >
                  <span
                    className="font-display text-[2rem] font-medium leading-none text-fg-subtle"
                    data-numeric
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-5 font-display text-h3 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[40ch] text-[0.9375rem] leading-relaxed text-fg-muted">
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary text-primary-foreground" aria-labelledby="cta-title">
          <div className="container grid gap-8 py-14 sm:py-16 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
            <div>
              <span aria-hidden className="mb-6 block h-0.5 w-12 bg-highlight" />
              <h2
                id="cta-title"
                className="max-w-[24ch] font-display text-[1.9rem] font-semibold leading-snug sm:text-[2.4rem]"
              >
                ابدأ بمتجر واحد، وأضف الباقي عندما يطلب السوق.
              </h2>
              <p className="mt-4 max-w-[52ch] text-body leading-relaxed text-primary-foreground/75">
                أنشئ حسابك، أضف منتجك الأول، وشارك الرابط مع عملائك.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 lg:flex-col lg:items-start">
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Link to="/admin">
                  أنشئ متجرك مجاناً
                  <ArrowLeft size={17} strokeWidth={1.75} aria-hidden />
                </Link>
              </Button>
              <Link
                to="/store/demo"
                className="inline-flex min-h-11 items-center gap-1.5 text-label font-medium text-primary-foreground/80 underline decoration-primary-foreground/30 underline-offset-4 hover:text-primary-foreground hover:decoration-primary-foreground"
              >
                جرّب المتجر أولاً
                <ArrowUpRight size={15} strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background py-8">
        <div className="container flex flex-col items-start justify-between gap-5 text-start sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <Wordmark size="sm" />
            <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />
            <p className="text-[12px] text-fg-subtle">
              © {new Date().getFullYear()} جميع الحقوق محفوظة.
            </p>
          </div>

          <nav className="flex items-center gap-5" aria-label="روابط التذييل">
            <Link
              to="/store/demo"
              className="inline-flex min-h-11 items-center text-[13px] text-fg-muted transition-colors hover:text-foreground"
            >
              متجر تجريبي
            </Link>
            <Link
              to="/terms"
              className="inline-flex min-h-11 items-center text-[13px] text-fg-muted transition-colors hover:text-foreground"
            >
              الشروط والأحكام
            </Link>
            <Link
              to="/admin"
              className="inline-flex min-h-11 items-center text-[13px] text-fg-muted transition-colors hover:text-foreground"
            >
              دخول التجار
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
