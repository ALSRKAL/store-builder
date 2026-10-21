import { Check, Lock } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  isThemeAvailable,
  getRequiredPlanName,
  presetThemes,
  type PresetThemeKey,
  type ThemeConfig,
} from '../../../utils/themeUtils';
import type { Plan } from '../../../config/plans';

interface PresetThemesProps {
  currentPlanId: Plan['id'] | undefined;
  activePreset: PresetThemeKey | null;
  onSelect: (key: PresetThemeKey) => void;
}

export function PresetThemes({ currentPlanId, activePreset, onSelect }: PresetThemesProps): React.JSX.Element {
  return (
    <section className="mb-6 border-b border-border pb-5" aria-labelledby="preset-themes">
      <h3 id="preset-themes" className="mb-3 text-body font-semibold text-foreground">
        الثيمات الجاهزة
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {(Object.entries(presetThemes) as [PresetThemeKey, ThemeConfig][]).map(([key, preset]) => {
          const available = isThemeAvailable(key, currentPlanId);
          const required = getRequiredPlanName(key);
          const selected = activePreset === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              aria-label={`الثيم ${preset.name}${available ? '' : ` — يتطلب خطة ${required}`}`}
              onClick={() => onSelect(key)}
              className={cn(
                'relative flex flex-col items-start gap-2 border bg-card p-3 text-start transition-colors',
                selected ? 'border-accent' : 'border-border hover:border-border-strong',
              )}
            >
              <span className="flex flex-wrap gap-1">
                {[preset.primary, preset.secondary, preset.headerBg, preset.footerBg].map((color, index) => (
                  <span key={index} className="size-4 shrink-0 border border-border" style={{ background: color }} />
                ))}
              </span>
              <span className="flex w-full items-center justify-between gap-1 text-[11px] font-medium leading-tight text-foreground">
                {preset.name}
                {selected ? <Check className="size-3.5 text-accent" strokeWidth={2} aria-hidden /> : null}
              </span>
              {!available ? (
                <span className="flex items-center gap-1 text-[11px] text-fg-subtle" aria-hidden>
                  <Lock className="size-2.5" strokeWidth={1.75} />
                  {required}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
