/**
 * ErrorBoundary — احتواء الأخطاء على مستوى القسم أو التطبيق.
 *
 * قبل هذه المرحلة كانت الحدود موجودة في موضعين فقط (`Store.tsx` و`Dashboard.tsx`)،
 * بلا حدّ جذري: أي خطأ خارج هذين النطاقين (مثلاً داخل `AuthProvider` أو مسار
 * كسول فشل تحميله) كان يُفرّغ الشاشة بالكامل إلى صفحة بيضاء.
 *
 * الاستخدامات:
 *   - جذري في `App.tsx` مع `fullScreen` — آخر خط دفاع.
 *   - موضعي في القشرة والتبويبات بـ `section="الطلبات"` — يعزل الخطأ ويُبقي
 *     بقية اللوحة قابلة للاستخدام.
 *
 * التصميم: توكنات `danger` بدل `red-50/red-200` المباشرة، وزر إعادة محاولة
 * واضح يستخدم نفس زر النظام.
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** اسم القسم الظاهر في العنوان، مثل "الطلبات". */
  section?: string;
  /** يملأ الشاشة — يُستخدم للحدّ الجذري فقط. */
  fullScreen?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown): void {
    // نُبقي التفاصيل في الكونسول للتشخيص، والواجهة تبقى قابلة للاستخدام.
    console.error('ErrorBoundary caught:', error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { section, fullScreen } = this.props;
    const isRoot = Boolean(fullScreen);

    return (
      <div
        role="alert"
        className={cn(
          'flex flex-col items-center justify-center gap-3 px-4 text-center',
          isRoot ? 'min-h-dvh bg-background' : 'my-8',
        )}
      >
        <div
          className={cn(
            'flex w-full max-w-lg flex-col items-center gap-3 rounded-lg border border-danger/20 bg-danger/5 p-8',
          )}
        >
          <span
            aria-hidden
            className="flex size-10 items-center justify-center border border-danger/25 text-danger"
          >
            <AlertTriangle size={20} strokeWidth={1.75} />
          </span>

          <h2 className="m-0 font-display text-h2 font-semibold text-foreground">
            {isRoot ? 'تعذّر تحميل التطبيق' : `تعذّر عرض ${section ?? 'هذا القسم'}`}
          </h2>

          <p className="m-0 text-body leading-relaxed text-fg-muted">
            {isRoot
              ? 'حدث خطأ غير متوقع أثناء بدء التشغيل. أعد المحاولة، وإن استمر الخطأ فأعد تحميل الصفحة.'
              : 'حدث خطأ غير متوقع أثناء تحميل هذه البيانات. بقية الصفحة تعمل بشكل طبيعي.'}
          </p>

          <Button onClick={this.handleRetry} className="mt-1 gap-2">
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;