import { Check, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Button, toast } from '../../ui';

interface StoreStatusCardProps {
  ready: boolean;
  active?: boolean;
  storeUrl: string;
  onAddProduct: () => void;
}

/**
 * Store status: one strip, one status dot, one URL. No card-in-card, no icon tile.
 */
export function StoreStatusCard({ ready, active = true, storeUrl, onAddProduct }: StoreStatusCardProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success('تم نسخ رابط المتجر');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('تعذّر النسخ', 'حدّد الرابط وانسخه يدوياً.');
    }
  };

  if (!ready) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warning" />
        <div className="min-w-0 flex-1">
          <h2 className="text-label font-semibold text-foreground">متجرك غير منشور بعد</h2>
          <p className="mt-0.5 text-label text-fg-muted">أضف منتجاً واحداً على الأقل ليصبح رابط متجرك جاهزاً للمشاركة.</p>
        </div>
        <Button type="button" onClick={onAddProduct} className="shrink-0">
          إضافة منتج
        </Button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-danger/25 bg-danger/5 p-4 sm:flex-row sm:items-center">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-danger" />
        <div className="min-w-0 flex-1">
          <h2 className="text-label font-semibold text-foreground">متجرك موقوف مؤقتاً</h2>
          <p className="mt-0.5 text-label text-fg-muted">أوقفت الإدارة ظهور المتجر للزوار. تواصل مع الدعم لإعادة تفعيله.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="flex items-start gap-2.5">
        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-success" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-label font-semibold text-foreground">متجرك منشور</h2>
            <span className="text-[11px] font-medium text-success">نشط</span>
          </div>
          <p className="mt-0.5 break-all text-[12px] text-fg-muted" dir="ltr">
            {storeUrl}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => void copy()} className="min-h-11 w-full gap-2 sm:flex-1">
          {copied ? <Check className="size-4" strokeWidth={1.75} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
          {copied ? 'تم النسخ' : 'نسخ الرابط'}
        </Button>
        <Button asChild className="min-h-11 w-full gap-2 sm:flex-1">
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
            فتح المتجر
          </a>
        </Button>
      </div>
    </div>
  );
}
