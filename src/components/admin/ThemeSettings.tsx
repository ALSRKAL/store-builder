/**
 * ThemeSettings — منسّق تخصيص المظهر.
 *
 * كان الملف 1007 أسطر: معاينة، وضع عرض، ثيمات جاهزة، منتقي ألوان، أشكال،
 * ونافذة ترقية. قُسّم إلى `theme/` مع الحفاظ على الـprops ومنطق الحفظ حرفياً.
 * نافذة الترقية المحلية استُبدلت بـ`UpgradeDialog` الموحّد.
 */

import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  presetThemes,
  defaultTheme,
  isThemeAvailable,
  canCustomizeColors,
  type ThemeConfig,
  type PresetThemeKey,
} from '../../utils/themeUtils';
import { Button } from '../ui';
import { UpgradeDialog } from './subscription';
import { ThemePreview } from './theme/ThemePreview';
import { DisplayModeSelector } from './theme/DisplayModeSelector';
import { PresetThemes } from './theme/PresetThemes';
import { ColorCustomizer } from './theme/ColorCustomizer';
import type { DisplayMode } from './theme/demoTheme';

export interface ThemeWithDisplayMode extends ThemeConfig {
  displayMode?: DisplayMode | undefined;
}

interface ThemeSettingsProps {
  currentTheme: ThemeWithDisplayMode | null | undefined;
  onSave: (theme: ThemeWithDisplayMode) => void | Promise<void>;
  loading: boolean;
  storeCurrency?: string;
}

/** Old/partial theme JSON must not render black color inputs. */
function normalizeTheme(theme: ThemeWithDisplayMode | null | undefined): ThemeConfig {
  const normalized: ThemeConfig = { ...defaultTheme };
  if (!theme) return normalized;
  const colorAndShapeKeys = ['primary', 'secondary', 'accent', 'headerBg', 'headerText', 'bodyBg', 'cardBg', 'footerBg', 'footerText', 'buttonRadius', 'cardRadius'] as const;
  for (const key of colorAndShapeKeys) {
    const value = theme[key];
    if (typeof value === 'string' && value.trim()) normalized[key] = value;
  }
  return normalized;
}

function ThemeSettings({ currentTheme, onSave, loading, storeCurrency = 'SAR' }: ThemeSettingsProps): React.JSX.Element {
  const { currentPlan, adminData } = useAuth();
  const [theme, setTheme] = useState<ThemeConfig>(() => normalizeTheme(currentTheme));
  const [activePreset, setActivePreset] = useState<PresetThemeKey | null>(currentTheme ? null : 'default');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches ? 'mobile' : 'desktop',
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>(currentTheme?.displayMode ?? 'grid');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!currentTheme) {
      // متجر جديد بلا ثيم محفوظ: «الافتراضي» هو الاختيار الصالح للحفظ
      // لأصحاب الخطط غير السنوية، بدل أن يُدفعوا لنافذة الترقية.
      setTheme(defaultTheme);
      setDisplayMode('grid');
      setActivePreset('default');
      return;
    }
    setTheme(normalizeTheme(currentTheme));
    setDisplayMode(currentTheme.displayMode ?? 'grid');
    const preset = (Object.entries(presetThemes) as [PresetThemeKey, ThemeConfig][]).find(
      ([, candidate]) =>
        candidate.primary === currentTheme.primary &&
        candidate.headerBg === currentTheme.headerBg &&
        candidate.accent === currentTheme.accent &&
        candidate.bodyBg === currentTheme.bodyBg,
    );
    setActivePreset(preset ? preset[0] : null);
  }, [currentTheme]);

  const storyAvailable = ['monthly', 'semiAnnual', 'annual'].includes(currentPlan.id ?? 'trial');
  const colorsUnlocked = canCustomizeColors(currentPlan.id);

  const handlePresetSelect = (key: PresetThemeKey): void => {
    setTheme(presetThemes[key]);
    setActivePreset(key);
  };

  const handleColorChange = (key: keyof ThemeConfig, value: string): void => {
    setTheme((current) => ({ ...current, [key]: value }));
    setActivePreset(null);
  };

  const handleSave = async (): Promise<void> => {
    if (activePreset && !isThemeAvailable(activePreset, currentPlan.id)) {
      setUpgradeOpen(true);
      return;
    }
    if (!activePreset && !colorsUnlocked) {
      setUpgradeOpen(true);
      return;
    }
    try {
      await onSave({ ...theme, displayMode });
    } catch {
      // الـContext يعرض Toast بالفعل؛ الحالة المحلية تبقى كما هي لإعادة المحاولة.
    }
  };

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <ThemePreview
        theme={theme}
        displayMode={displayMode}
        previewDevice={previewDevice}
        onDeviceChange={setPreviewDevice}
        storeName={adminData?.storeName}
        storeLogo={adminData?.logo ?? adminData?.storeLogo}
        currency={storeCurrency}
      />

      <div className="border border-border bg-card p-5">
        <div className="mb-5 border-b border-border pb-4">
          <h2 className="font-display text-h3 font-semibold text-foreground">خيارات المظهر</h2>
          <p className="mt-1 text-label text-fg-muted">اختر ثيماً جاهزاً أو خصّص الألوان، ثم احفظ لتظهر في متجرك.</p>
        </div>

        <DisplayModeSelector
          value={displayMode}
          onChange={setDisplayMode}
          storyAvailable={storyAvailable}
          onLockedClick={() => setUpgradeOpen(true)}
        />

        <PresetThemes
          currentPlanId={currentPlan.id}
          activePreset={activePreset}
          onSelect={handlePresetSelect}
        />

        <ColorCustomizer
          theme={theme}
          locked={!colorsUnlocked}
          onChange={handleColorChange}
          onUpgrade={() => setUpgradeOpen(true)}
        />

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTheme(defaultTheme);
              setActivePreset('default');
            }}
            className="gap-2 sm:w-auto"
          >
            <RotateCcw className="size-4" strokeWidth={1.75} aria-hidden />
            إعادة تعيين
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={loading} className="min-h-11 w-full gap-2 sm:flex-1">
            <Save className="size-4" strokeWidth={1.75} aria-hidden />
            {loading ? 'جاري الحفظ…' : 'حفظ التغييرات'}
          </Button>
        </div>
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        plan={currentPlan}
        storeName={adminData?.storeName}
        reason="theme"
      />
    </div>
  );
}

export default ThemeSettings;
