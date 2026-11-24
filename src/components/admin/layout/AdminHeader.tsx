/**
 * AdminHeader — شريط التطبيق العلوي للوحة التاجر.
 *
 * يعرض: هوية المتجر على الجوال (لأن الشريط الجانبي مخفي)، معاينة المتجر، نسخ
 * رابط المتجر، مولّد الإعلانات، وإعادة تشغيل جولة التعريف.
 *
 * كل زر أيقوني هنا يحمل `aria-label` صريحاً + Tooltip بصرياً؛ لا نعتمد على
 * `title` الأصلي للمتصفح لأنه بطيء ولا يظهر على اللمس.
 *
 * `sticky top-0` مع `backdrop-blur`: المستخدم يبقى قادراً على الوصول إلى
 * معاينة المتجر أثناء التمرير في قوائم طويلة (طلبات، منتجات).
 * لاحظ أن بانرات الخطة أسفل الهيدر ليست sticky — كانت كذلك سابقاً، وكانت
 * تتكدّس مع تنبيه الاشتراك فتأكل ثلث الشاشة على الجوال.
 */

import { useNavigate } from 'react-router-dom';
import { Copy, ExternalLink, Megaphone, Sparkles, Store } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import { Button, Tooltip, toast } from '../../ui';
import { cn } from '../../../lib/utils';

function AdminHeader(): React.JSX.Element {
  const { adminData } = useAuth();
  const { publicStoreUrl, products, openAdGenerator, startTour } = useDashboard();
  const navigate = useNavigate();

  const absoluteStoreUrl = publicStoreUrl
    ? new URL(publicStoreUrl, window.location.origin).toString()
    : null;

  const handleCopyLink = async (): Promise<void> => {
    if (!absoluteStoreUrl) {
      toast.error('لا يوجد رابط متجر بعد', 'أكمل إعداد المتجر أولاً.');
      return;
    }
    try {
      await navigator.clipboard.writeText(absoluteStoreUrl);
      toast.success('تم نسخ رابط المتجر');
    } catch {
      // Clipboard API يفشل في بعض السياقات غير الآمنة أو عند رفض الإذن.
      // نعرض الرابط للمستخدم بدل الفشل الصامت.
      toast.info('انسخ الرابط يدوياً', absoluteStoreUrl);
    }
  };

  const handleAdGenerator = (): void => {
    const first = products[0];
    if (!first) {
      toast.info('لا توجد منتجات بعد', 'أضف منتجاً واحداً على الأقل لتصميم إعلان له.');
      return;
    }
    openAdGenerator(first);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-[80] flex h-14 shrink-0 items-center gap-2',
        'border-b border-border bg-background px-3 sm:px-4',
      )}
    >
      {/* هوية مختصرة — للجوال فقط */}
      <button
        type="button"
        onClick={() => navigate('/admin/dashboard/products')}
        className="flex min-h-11 min-w-0 items-center gap-2 rounded-md px-0.5 -ms-0.5 lg:hidden"
        aria-label="الانتقال إلى المنتجات"
      >
        {adminData?.logo ? (
          <img
            src={adminData.logo}
            alt=""
            className="size-9 shrink-0 rounded-md border border-border object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-sunken text-fg-muted"
          >
            <Store size={17} strokeWidth={1.75} />
          </span>
        )}
        <span className="truncate text-label font-semibold text-foreground">
          {adminData?.storeName ?? 'المتجر'}
        </span>
      </button>

      {/* اسم الخطة يظهر في الشريط السياقي أسفل الهيدر مباشرة؛ إبقاؤه هنا
          كان يزاحم اسم المتجر على 375px فيقتطعه. */}

      <div className="ms-auto flex items-center gap-1 sm:gap-2">
        <Tooltip content="إعادة جولة التعريف">
          <Button
            variant="ghost"
            size="icon"
            onClick={startTour}
            aria-label="إعادة جولة التعريف"
          >
            <Sparkles className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        </Tooltip>

        <Tooltip content="مولّد الإعلانات">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleAdGenerator}
            aria-label="فتح مولّد الإعلانات"
          >
            <Megaphone className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        </Tooltip>

        <Tooltip content="نسخ رابط المتجر">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleCopyLink()}
            aria-label="نسخ رابط المتجر"
          >
            <Copy className="size-5" strokeWidth={1.75} aria-hidden />
          </Button>
        </Tooltip>

        {absoluteStoreUrl ? (
          <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
            <a href={absoluteStoreUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
              معاينة المتجر
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled className="hidden sm:inline-flex">
            <ExternalLink className="size-4" aria-hidden />
            معاينة المتجر
          </Button>
        )}

        {/* على الجوال: أيقونة فقط بدل زر نصي يأكل عرض الشاشة */}
        {absoluteStoreUrl ? (
          <Button variant="outline" size="icon" asChild className="sm:hidden">
            <a
              href={absoluteStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="معاينة المتجر"
            >
              <ExternalLink className="size-5" strokeWidth={1.75} aria-hidden />
            </a>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

export default AdminHeader;