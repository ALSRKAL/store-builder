import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { Spinner } from './spinner';
import { cn } from '../../lib/utils';
import { storeScopeStyle } from '../../utils/themeUtils';

/**
 * ConfirmDialog — بديل موحّد لكل `window.confirm` في المشروع
 * (كان مستخدماً في Dashboard نحو 20 مرة، وفي PaymentSettings وOrdersManager).
 *
 * الفروق عن `window.confirm`:
 *   - يحترم RTL ويأخذ هوية التصميم بدل نافذة المتصفح الأصلية.
 *   - القرار الخطر: التركيز الأولي يذهب إلى "إلغاء" لا إلى "تأكيد"، فلا يُنفَّذ
 *     حذف بضغطة Enter عابرة.
 *   - حالة `loading` على زر التأكيد تمنع الضغط المزدوج (مصدر أخطاء تكرار الطلبات).
 *   - قابل للاختبار وللترجمة، ويُقرأ صحيحاً بواسطة قارئ الشاشة.
 */

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` للأفعال غير القابلة للإرجاع (حذف، إلغاء، تصفير). */
  tone?: 'default' | 'danger';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  tone = 'default',
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = React.useState(false);
  const { pathname } = useLocation();
  const inStore = pathname.startsWith('/store/');
  const isBusy = loading || busy;

  const handleConfirm = async () => {
    // حماية إضافية ضد الضغط المزدوج: نُقفل فوراً قبل انتظار الـPromise.
    if (isBusy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (!isBusy ? onOpenChange(next) : undefined)}>
      <DialogContent
        size="sm"
        showClose={false}
        title={title}
        style={inStore ? storeScopeStyle : undefined}
        onOpenAutoFocus={(event) => {
          // نمنع التركيز التلقائي على أول عنصر داخل المحتوى، ونضعه على "إلغاء".
          event.preventDefault();
          cancelRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (isBusy) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isBusy) event.preventDefault();
        }}
      >
        <div className="flex gap-3 px-5 py-4">
          {tone === 'danger' ? (
            <span
              aria-hidden
              className={cn(
                'mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full',
                'bg-danger/10 text-[var(--store-danger-text)]',
              )}
            >
              <AlertTriangle className="size-5" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            {description ? (
              <DialogDescription className="p-0 text-body text-fg-muted">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === 'danger' ? 'destructive' : 'default'}
            onClick={() => void handleConfirm()}
            disabled={isBusy}
          >
            {isBusy ? <Spinner size="sm" className="text-current" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmRequest {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
}

/**
 * useConfirm — يقلّص تكرار حالة الفتح إلى سطرين عند نقطة الاستخدام.
 *
 * مثال:
 *   const { ask, dialog } = useConfirm();
 *   const onDelete = () => ask({ title: 'حذف المنتج', tone: 'danger', onConfirm: doDelete });
 *   return <>{content}{dialog}</>;
 */
export function useConfirm() {
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null);

  const ask = React.useCallback((next: ConfirmRequest) => setRequest(next), []);

  const dialog = (
    <ConfirmDialog
      open={request !== null}
      onOpenChange={(open) => {
        if (!open) setRequest(null);
      }}
      title={request?.title ?? ''}
      description={request?.description}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      tone={request?.tone}
      onConfirm={async () => {
        await request?.onConfirm();
        setRequest(null);
      }}
    />
  );

  return { ask, dialog };
}