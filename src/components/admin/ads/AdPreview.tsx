import { cn } from '../../../lib/utils';
import type { AdTemplate } from './adTemplates';
import { AD_EXPORT_HEIGHT, AD_EXPORT_WIDTH } from './adTemplates';

function OriginalRef({ originalPrice, compact = false, className }: { originalPrice: number | null; compact?: boolean; className?: string }): React.JSX.Element | null {
  if (originalPrice == null) return null;
  return <span className={cn('line-through', className)}>{compact ? `${originalPrice.toLocaleString('en-US')} ر.س` : `قبل الخصم: ${originalPrice.toLocaleString('en-US')} ر.س`}</span>;
}

function PricePill({ price, accentColor, className }: { price: number; accentColor: string; className?: string }): React.JSX.Element {
  return (
    <span
      className={cn('font-bold', className)}
      style={{ background: accentColor, color: accentColor === '#f2c14e' ? '#191710' : '#ffffff' }}
    >
      {price.toLocaleString('en-US')} ر.س
    </span>
  );
}

interface AdPreviewProps {
  template: AdTemplate;
  image: string;
  name: string;
  price: number;
  originalPrice: number | null;
  customDiscount: string;
  showPrice: boolean;
  showStoreName: boolean;
  storeName: string | null | undefined;
  imageKey: number;
  hasMultipleImages: boolean;
  imageCount: number;
}

/**
 * معاينة الإعلان 9:16 — مطابقة للتصدير 1080×1920.
 * كل فروع القالب هنا تقابل `renderAdCanvas` سطراً بسطر.
 */
export function AdPreview({
  template,
  image,
  name,
  price,
  originalPrice,
  customDiscount,
  showPrice,
  showStoreName,
  storeName,
  imageKey,
  hasMultipleImages,
  imageCount,
}: AdPreviewProps): React.JSX.Element {
  const badgeText = customDiscount ? `${customDiscount}% خصم` : template.badge;
  return (
    <div className="flex flex-col items-center md:sticky md:top-0 md:self-start">
      <div
        data-testid="ad-preview"
        data-export-width={AD_EXPORT_WIDTH}
        data-export-height={AD_EXPORT_HEIGHT}
        data-template={template.id}
        role="img"
        aria-label={`معاينة الإعلان بنسبة 9:16 — ${name} ${price.toLocaleString('en-US')} ر.س`}
        className="relative aspect-[9/16] w-full max-w-[168px] overflow-hidden rounded-md border border-black/10 md:max-w-[260px]"
        style={{ background: template.background }}
      >
        {template.id === 'elegant' ? <div className="pointer-events-none absolute inset-2 rounded-sm border-2 border-white/30" /> : null}
        {template.id === 'luxury' ? (
          <>
            <div className="pointer-events-none absolute inset-2 rounded-sm border-2" style={{ borderColor: 'rgba(216,178,92,0.9)' }} />
            <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-[10px]" style={{ color: '#d8b25c' }} aria-hidden>◆</div>
          </>
        ) : null}
        {template.id === 'offer' ? <div className="pointer-events-none absolute inset-x-6 top-16 h-px bg-white/50" /> : null}
        {template.id === 'discount' ? (
          <div className="absolute end-2 top-6 z-10 w-24 -rotate-[25deg] bg-black/80 py-1 text-center text-[11px] font-bold text-white" aria-hidden>
            تخفيض
          </div>
        ) : null}

        {template.id === 'elegant' ? (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 border border-white/70 px-4 py-1.5 text-[10px] text-white/90">{badgeText}</div>
        ) : template.id === 'luxury' ? (
          <div className="absolute left-1/2 top-6 z-10 -translate-x-1/2 border bg-black/30 px-4 py-1.5 text-[10px] font-bold" style={{ borderColor: '#d8b25c', color: '#d8b25c' }}>{badgeText}</div>
        ) : template.id === 'new' ? (
          <div className="absolute start-4 top-4 z-10 bg-white px-3 py-1.5 text-[10px] font-bold" style={{ color: '#191710' }}>{badgeText}</div>
        ) : (
          <div className="absolute end-4 top-4 z-10 bg-white px-3.5 py-2 text-[11px] font-bold" style={{ color: '#191710' }}>{badgeText}</div>
        )}

        {image && (template.id === 'offer' || template.id === 'fresh') ? (
          <div className="absolute inset-x-0 top-0 z-[5]">
            <img src={image} alt={name} className="block h-auto w-full" key={imageKey} />
          </div>
        ) : image ? (
          <div
            className={cn(
              'absolute left-1/2 z-[5] -translate-x-1/2',
              template.id === 'discount' && 'top-[13%] w-[86%] bg-white p-2',
              template.id === 'luxury' && 'top-[17%] w-[72%] p-1',
              template.id === 'elegant' && 'top-[16%] w-[62%] border border-white/40 bg-black/45 p-1.5',
              (template.id === 'new' || template.id === 'fresh') && 'top-[17%] w-[74%] bg-white p-1.5',
            )}
            style={template.id === 'luxury' ? { background: '#d8b25c' } : undefined}
          >
            <img src={image} alt={name} className="block h-auto w-full" key={imageKey} />
          </div>
        ) : null}

        {template.id === 'offer' ? (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 px-3" style={{ background: template.accentColor }}>
            <div className="pt-2 text-center text-[13px] font-bold leading-tight text-white">{name}</div>
            {showPrice ? (
              <>
                <OriginalRef originalPrice={originalPrice} className="text-[9px] text-white/85" />
                <div className="pb-1 text-[15px] font-extrabold text-white">{price.toLocaleString('en-US')} ر.س</div>
              </>
            ) : null}
            {showStoreName && storeName ? <div className="pb-2 text-[9px] text-white/90">{storeName}</div> : null}
          </div>
        ) : template.id === 'fresh' ? (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 bg-black/75 px-3 pb-4 pt-3">
            <div className="h-1.5 w-full" style={{ background: template.accentColor }} />
            <div className="text-center text-[13px] font-bold leading-tight text-white">{name}</div>
            {showPrice ? (
              <>
                <OriginalRef originalPrice={originalPrice} className="text-[9px] text-white/70" />
                <PricePill price={price} accentColor={template.accentColor} className="px-3.5 py-1 text-[12px]" />
              </>
            ) : null}
            {showStoreName && storeName ? <div className="text-[9px] text-white/80">{storeName}</div> : null}
          </div>
        ) : template.id === 'elegant' ? (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-end gap-1.5 bg-black/75 pb-4 pe-4 ps-5 pt-3 text-end">
            <div className="text-[13px] leading-tight text-white">{name}</div>
            {showPrice ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="text-[14px] text-white">{price.toLocaleString('en-US')} ر.س</div>
                  <OriginalRef originalPrice={originalPrice} compact className="text-[9px] text-white/70" />
                </div>
                <div className="h-[2px] w-16" style={{ background: template.accentColor }} />
              </>
            ) : null}
            {showStoreName && storeName ? <div className="text-[10px] text-white/65">{storeName}</div> : null}
          </div>
        ) : (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-black/75 px-4 pb-5 pt-3">
            <div className="text-center text-[15px] font-bold leading-tight text-white">{name}</div>
            {template.id === 'luxury' ? (
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="h-px w-8" style={{ background: '#d8b25c' }} />
                <span className="text-[8px]" style={{ color: '#d8b25c' }}>◆</span>
                <span className="h-px w-8" style={{ background: '#d8b25c' }} />
              </div>
            ) : null}
            {showPrice ? (
              template.id === 'discount' ? (
                <>
                  <PricePill price={price} accentColor={template.accentColor} className="px-5 py-2 text-[15px] font-extrabold" />
                  <OriginalRef originalPrice={originalPrice} className="text-[9px] text-white/75" />
                </>
              ) : (
                <>
                  <OriginalRef originalPrice={originalPrice} className="text-[9px] text-white/75" />
                  <PricePill price={price} accentColor={template.accentColor} className="px-4 py-1.5 text-[13px]" />
                </>
              )
            ) : null}
            {showStoreName && storeName ? (
              <div className="mt-1 text-[10px]" style={{ color: template.id === 'luxury' ? 'rgba(216,178,92,0.9)' : 'rgba(255,255,255,0.8)' }}>{storeName}</div>
            ) : null}
          </div>
        )}
      </div>
      <p className="mt-3 text-start text-[11px] text-fg-muted" data-testid="ad-export-label">
        معاينة بنسبة <span dir="ltr">9:16</span> — التصدير <span dir="ltr">{AD_EXPORT_WIDTH}×{AD_EXPORT_HEIGHT}</span> (ستوري)
        {hasMultipleImages ? <span className="font-semibold text-fg-muted"> · {imageCount} صور متاحة</span> : null}
      </p>
    </div>
  );
}
