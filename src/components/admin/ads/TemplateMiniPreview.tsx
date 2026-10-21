import { cn } from '../../../lib/utils';
import type { AdTemplate } from './adTemplates';

function OriginalRef({
  originalPrice,
  compact = false,
  className,
}: {
  originalPrice: number | null;
  compact?: boolean;
  className?: string;
}): React.JSX.Element | null {
  if (originalPrice == null) return null;
  return (
    <span className={cn('line-through', className)}>
      {compact ? `${originalPrice.toLocaleString('en-US')} ر.س` : `قبل الخصم: ${originalPrice.toLocaleString('en-US')} ر.س`}
    </span>
  );
}

/**
 * مصغّر 9:16 يعكس نفس فروع القالب في المعاينة الحية والتصدير، حتى لا تختلف
 * النسختان. هوية المتجر محذوفة هنا لأنها غير مقروءة بهذا الحجم.
 */
export function TemplateMiniPreview({
  template,
  image,
  name,
  price,
  originalPrice,
  selected,
}: {
  template: AdTemplate;
  image: string;
  name: string;
  price: number;
  originalPrice: number | null;
  selected: boolean;
}): React.JSX.Element {
  const id = template.id;
  const accentText = template.accentColor === '#f2c14e' ? '#191710' : '#ffffff';
  return (
    <span
      aria-hidden
      className="relative block aspect-[9/16] w-full overflow-hidden rounded-md"
      style={{
        background: template.background,
        outline: selected ? `2px solid ${template.accentColor}` : undefined,
        outlineOffset: selected ? 1 : undefined,
      }}
    >
      {id === 'elegant' ? <span className="pointer-events-none absolute inset-1 rounded-sm border border-white/30" /> : null}
      {id === 'luxury' ? (
        <>
          <span className="pointer-events-none absolute inset-1 rounded-sm border" style={{ borderColor: 'rgba(216,178,92,0.9)' }} />
          <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[7px]" style={{ color: '#d8b25c' }}>◆</span>
        </>
      ) : null}
      {id === 'offer' ? <span className="pointer-events-none absolute inset-x-3 top-8 h-px bg-white/50" /> : null}

      {id === 'elegant' ? (
        <span className="absolute left-1/2 top-2 -translate-x-1/2 border border-white/70 px-2 py-px text-[7px] text-white/90">
          {template.badge}
        </span>
      ) : id === 'luxury' ? (
        <span className="absolute left-1/2 top-3 -translate-x-1/2 border bg-black/30 px-2 py-px text-[7px] font-bold" style={{ borderColor: '#d8b25c', color: '#d8b25c' }}>
          {template.badge}
        </span>
      ) : id === 'new' ? (
        <span className="absolute start-1.5 top-2 bg-white px-1.5 py-px text-[7px] font-bold" style={{ color: '#191710' }}>
          {template.badge}
        </span>
      ) : (
        <span className="absolute end-1.5 top-2 bg-white px-1.5 py-px text-[7px] font-bold" style={{ color: '#191710' }}>
          {template.badge}
        </span>
      )}

      {id === 'discount' ? (
        <span className="absolute end-0.5 top-4 w-12 -rotate-[25deg] bg-black/80 py-px text-center text-[7px] font-bold text-white">
          تخفيض
        </span>
      ) : null}

      {image ? (
        id === 'offer' || id === 'fresh' ? (
          <img src={image} alt="" loading="lazy" className="absolute inset-x-0 top-0 h-[38%] w-full object-cover" />
        ) : (
          <span
            className={cn(
              'absolute left-1/2 -translate-x-1/2',
              id === 'discount' && 'top-[12%] w-[86%] bg-white p-1',
              id === 'luxury' && 'top-[16%] w-[72%] p-px',
              id === 'elegant' && 'top-[15%] w-[62%] border border-white/40 bg-black/45 p-1',
              id === 'new' && 'top-[16%] w-[74%] bg-white p-1',
            )}
            style={id === 'luxury' ? { background: '#d8b25c' } : undefined}
          >
            <img src={image} alt="" loading="lazy" className="block h-auto w-full rounded-sm" />
          </span>
        )
      ) : (
        <span className="absolute left-1/2 top-[16%] flex aspect-square w-[70%] -translate-x-1/2 items-center justify-center rounded bg-white/85 text-[8px] font-bold text-fg-muted">
          {name.slice(0, 8)}
        </span>
      )}

      {id === 'offer' ? (
        <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-px px-1 pb-1.5 pt-1" style={{ background: template.accentColor, color: accentText }}>
          <span className="block max-w-full truncate text-[7px] font-bold">{name}</span>
          <span className="text-[8px] font-bold">{price.toLocaleString('en-US')} ر.س</span>
        </span>
      ) : id === 'fresh' ? (
        <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-px bg-black/70 px-1 pb-1.5 pt-1.5">
          <span className="h-0.5 w-full" style={{ background: template.accentColor }} />
          <span className="block max-w-full truncate text-[7px] font-bold text-white">{name}</span>
          <OriginalRef originalPrice={originalPrice} compact className="text-[6px] text-white/70" />
          <span className="px-1.5 py-px text-[7px] font-bold" style={{ background: template.accentColor, color: accentText }}>
            {price.toLocaleString('en-US')} ر.س
          </span>
        </span>
      ) : id === 'elegant' ? (
        <span className="absolute inset-x-0 bottom-0 flex flex-col items-end gap-px bg-black/70 px-1.5 pb-1.5 pt-1.5 text-end">
          <span className="block max-w-full truncate text-[7px] text-white">{name}</span>
          <span className="flex items-center gap-1">
            <span className="text-[8px] text-white">{price.toLocaleString('en-US')} ر.س</span>
            <OriginalRef originalPrice={originalPrice} compact className="text-[6px] text-white/70" />
          </span>
          <span className="h-px w-8" style={{ background: template.accentColor }} />
        </span>
      ) : (
        <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-px bg-black/70 px-1 pb-1.5 pt-1.5">
          <span className="block max-w-full truncate text-[7px] font-bold text-white">{name}</span>
          {id === 'luxury' ? (
            <span className="flex items-center gap-0.5" aria-hidden>
              <span className="h-px w-4" style={{ background: '#d8b25c' }} />
              <span className="text-[6px]" style={{ color: '#d8b25c' }}>◆</span>
              <span className="h-px w-4" style={{ background: '#d8b25c' }} />
            </span>
          ) : null}
          {id === 'discount' ? (
            <>
              <span className="px-2 py-px text-[8px] font-bold" style={{ background: template.accentColor, color: accentText }}>
                {price.toLocaleString('en-US')} ر.س
              </span>
              <OriginalRef originalPrice={originalPrice} compact className="text-[6px] text-white/75" />
            </>
          ) : (
            <>
              <OriginalRef originalPrice={originalPrice} compact className="text-[6px] text-white/75" />
              <span className="px-1.5 py-px text-[7px] font-bold" style={{ background: template.accentColor, color: accentText }}>
                {price.toLocaleString('en-US')} ر.س
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
