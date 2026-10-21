import { Crown, Lock } from 'lucide-react';
import { Button } from '../../ui';
import { cn } from '../../../lib/utils';
import type { ThemeConfig } from '../../../utils/themeUtils';
import { ColorPicker } from './ColorPicker';

interface ColorCustomizerProps {
  theme: ThemeConfig;
  locked: boolean;
  onChange: (key: keyof ThemeConfig, value: string) => void;
  onUpgrade: () => void;
}

const ROUNDNESS = [
  { label: 'الأزرار', key: 'buttonRadius' as const, values: ['4px', '8px', '12px', '50px'] },
  { label: 'البطاقات', key: 'cardRadius' as const, values: ['0px', '8px', '16px', '24px'] },
];

export function ColorCustomizer({ theme, locked, onChange, onUpgrade }: ColorCustomizerProps): React.JSX.Element {
  return (
    <section className="mb-6 border-b border-border pb-5" aria-labelledby="color-customizer">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 id="color-customizer" className="text-body font-semibold text-foreground">
          تخصيص الألوان
        </h3>
        <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle">
          <Crown className="size-3" strokeWidth={1.75} aria-hidden />
          سنوي
        </span>
      </div>

      {locked ? (
        <div className="border-y border-border py-5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-fg-subtle">
            <Lock className="size-3.5" strokeWidth={1.75} aria-hidden />
            ميزة الخطة السنوية
          </p>
          <p className="mt-2 max-w-[52ch] text-label leading-relaxed text-fg-muted">
            تخصيص الألوان والخطوط متاح للخطة السنوية. يمكنك في الوقت الحالي اختيار أحد الثيمات الجاهزة.
          </p>
          <Button type="button" variant="outline" onClick={onUpgrade} className="mt-3 gap-2">
            <Crown className="size-4" strokeWidth={1.75} aria-hidden />
            ترقية للخطة السنوية
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <ColorPicker label="الأساسي" value={theme.primary} onChange={(value) => onChange('primary', value)} />
            <ColorPicker label="الثانوي" value={theme.secondary} onChange={(value) => onChange('secondary', value)} />
            <ColorPicker label="التمييز" value={theme.accent} onChange={(value) => onChange('accent', value)} />
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <ColorPicker label="خلفية الهيدر" value={theme.headerBg} onChange={(value) => onChange('headerBg', value)} />
            <ColorPicker label="نص الهيدر" value={theme.headerText} onChange={(value) => onChange('headerText', value)} />
            <ColorPicker label="خلفية الصفحة" value={theme.bodyBg} onChange={(value) => onChange('bodyBg', value)} />
            <ColorPicker label="خلفية البطاقات" value={theme.cardBg} onChange={(value) => onChange('cardBg', value)} />
            <ColorPicker label="خلفية الفوتر" value={theme.footerBg} onChange={(value) => onChange('footerBg', value)} />
            <ColorPicker label="نص الفوتر" value={theme.footerText} onChange={(value) => onChange('footerText', value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {ROUNDNESS.map((group) => (
              <div key={group.key}>
                <span className="mb-2 block text-label text-fg-muted">{group.label}</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label={`استدارة ${group.label}`}>
                  {group.values.map((radius) => {
                    const active = theme[group.key] === radius;
                    return (
                      <button
                        key={radius}
                        type="button"
                        aria-pressed={active}
                        aria-label={`${group.label} — ${radius}`}
                        onClick={() => onChange(group.key, radius)}
                        className={cn(
                          'inline-flex min-h-11 min-w-11 items-center justify-center border-2 bg-card px-3 text-label text-fg-muted transition-colors',
                          active ? 'border-accent text-foreground' : 'border-border hover:border-border-strong',
                        )}
                        style={{ borderRadius: radius }}
                      >
                        {group.key === 'buttonRadius' ? 'زر' : <span aria-hidden className="block h-4 w-6 bg-border-strong" style={{ borderRadius: radius }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
