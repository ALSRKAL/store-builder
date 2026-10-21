import { Check, Crown, LayoutGrid, Lock, Play } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { DisplayMode } from './demoTheme';

interface DisplayModeSelectorProps {
  value: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  storyAvailable: boolean;
  onLockedClick: () => void;
}

export function DisplayModeSelector({ value, onChange, storyAvailable, onLockedClick }: DisplayModeSelectorProps): React.JSX.Element {
  return (
    <section className="mb-6 border-b border-border pb-5" aria-labelledby="display-mode">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h3 id="display-mode" className="flex items-center gap-2 text-body font-semibold text-foreground">
          <LayoutGrid className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
          وضع عرض المنتجات
        </h3>
        {!storyAvailable ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle">
            <Crown className="size-3" strokeWidth={1.75} aria-hidden />
            شهري+
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-label text-fg-muted">اختر طريقة عرض المنتجات في متجرك.</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {([
          {
            id: 'grid' as const,
            title: 'الشبكة الكلاسيكية',
            description: 'عرض منظم لجميع المنتجات',
            icon: LayoutGrid,
            preview: (
              <div className="grid size-20 shrink-0 grid-cols-2 gap-1 rounded-md border border-border bg-card p-2" aria-hidden>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="aspect-square rounded-sm bg-muted" />
                ))}
              </div>
            ),
          },
          {
            id: 'story' as const,
            title: 'وضع الستوري',
            description: 'تجربة القصص المألوفة لعملائك',
            icon: Play,
            preview: (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-fg" aria-hidden>
                <div className="h-[58px] w-9 rounded-sm bg-black p-1">
                  <div className="relative size-full overflow-hidden rounded-sm bg-primary">
                    <div className="absolute inset-x-1 top-1 flex gap-0.5">
                      <span className="h-0.5 flex-1 bg-white" />
                      <span className="h-0.5 flex-1 bg-white/30" />
                      <span className="h-0.5 flex-1 bg-white/30" />
                    </div>
                    <div className="absolute inset-x-1 bottom-3 h-2.5 bg-white/20" />
                  </div>
                </div>
              </div>
            ),
          },
        ]).map((option) => {
          const active = value === option.id;
          const locked = option.id === 'story' && !storyAvailable;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              aria-label={`${option.title} — ${option.description}`}
              onClick={() => (locked ? onLockedClick() : onChange(option.id))}
              className={cn(
                'relative flex items-center gap-3 border bg-card p-3 text-start transition-colors',
                active ? 'border-accent' : 'border-border hover:border-border-strong',
                locked && 'opacity-75',
              )}
            >
              {option.preview}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-label font-semibold text-foreground">
                  <Icon className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                  {option.title}
                </span>
                <span className="text-[11px] text-fg-muted">{option.description}</span>
              </span>
              {active ? (
                <span aria-hidden className="absolute end-2 top-2 inline-flex size-4 items-center justify-center bg-accent text-accent-foreground">
                  <Check className="size-3" strokeWidth={2} />
                </span>
              ) : null}
              {locked && !active ? (
                <span aria-hidden className="absolute end-2 top-2 inline-flex size-4 items-center justify-center text-fg-subtle">
                  <Lock className="size-3" strokeWidth={1.75} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
