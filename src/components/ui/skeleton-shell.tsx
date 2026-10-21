import { Skeleton } from './skeleton';
import { cn } from '../../lib/utils';

/**
 * SkeletonShell — هياكل تحميل بنفس شكل المحتوى النهائي.
 *
 * كان مكوّن `Skeleton` موجوداً في المشروع لكنه لم يُستخدم ولو مرة واحدة، وكان
 * بديله هيكل يدوي داخل ProductCard وبوّابة تحميل واحدة لكل صفحة (`loading`
 * واحد يُخفي الشبكة كاملة). النتيجة: قفزة تخطيط (CLS) وإحساس انتظار أطول.
 *
 * الفكرة: الشكل يحاكي المكوّن الحقيقي في المقاسات، فتحلّ العناصر في مكانها
 * بلا إزاحة. استخدم هذه الهياكل في `Suspense fallback` وأثناء جلب البيانات.
 */

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  /** عرض السطر الأخير — الأقصر يحاكي نهاية الفقرة الطبيعية. */
  lastLineClassName?: string;
}

export function SkeletonText({ lines = 3, className, lastLineClassName }: SkeletonTextProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4 w-full', index === lines - 1 && cn('w-2/3', lastLineClassName))}
        />
      ))}
    </div>
  );
}

/** بطاقة إحصائية (تُستخدم في OrdersManager وDashboard) */
export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-md border border-border bg-card p-4', className)}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-7 w-16" />
    </div>
  );
}

export function SkeletonStatsRow({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonStatCard key={index} />
      ))}
    </div>
  );
}

/** بطاقة منتج في شبكة اللوحة أو المتجر */
export function SkeletonProductCard({ className }: { className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonProductCard key={index} />
      ))}
    </div>
  );
}

/** صفوف قائمة (طلبات، وسائل دفع، عناصر سلة) */
export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
        >
          <Skeleton className="size-11 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/4" />
          </div>
          <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** جدول بلوحة الطلبات */
export function SkeletonTable({
  rows = 6,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-card', className)}>
      <div className="flex gap-4 border-b border-border bg-muted/50 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 border-b border-border px-4 py-3 last:border-0">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * PageSkeleton — بديل `PageLoader` في App.tsx عند تحميل مسار كسولاً.
 * الشكل العام (رأس + محتوى) يمنع "وميض الشاشة الفارغة" بين المسارات.
 */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="جارٍ تحميل الصفحة"
      className={cn('mx-auto w-full max-w-6xl p-4 sm:p-6', className)}
    >
      <Skeleton className="h-7 w-48" />
      <Skeleton className="mt-2 h-4 w-72" />
      <SkeletonStatsRow className="mt-6" />
      <SkeletonProductGrid className="mt-6" count={6} />
    </div>
  );
}