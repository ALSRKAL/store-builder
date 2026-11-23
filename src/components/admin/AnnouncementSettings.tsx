/**
 * AnnouncementSettings — إعداد الشريط الإعلاني.
 * كل السلاسل بقيت كما هي، لكن الـmarkup تحوّل إلى توكنات + `Switch` + أيقونات
 * lucide فقط (أُزيلت الإيموجي من القوالب).
 */

import { useMemo, useState } from 'react';
import AnnouncementBar from '../store/AnnouncementBar';
import {
  Check,
  Clock,
  Gift,
  Link as LinkIcon,
  Megaphone,
  Palette,
  Percent,
  RotateCcw,
  Sparkles,
  Tag,
  Truck,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Input, Label, Switch, Textarea } from '../ui';

interface IconInfo { id: string; icon: LucideIcon; label: string }
interface ColorPreset { bg: string; text: string; name: string }
interface Template { message: string; icon: string }

export interface AnnouncementData {
  enabled: boolean;
  message: string;
  backgroundColor: string;
  textColor: string;
  icon: string;
  isScrolling: boolean;
  canClose: boolean;
  link: string;
  linkText: string;
}

interface AnnouncementSettingsProps {
  announcement?: AnnouncementData | null | undefined;
  onSave: (settings: AnnouncementData) => void | Promise<void>;
  saving?: boolean;
}

const AVAILABLE_ICONS: IconInfo[] = [
  { id: 'megaphone', icon: Megaphone, label: 'إعلان' },
  { id: 'sparkles', icon: Sparkles, label: 'عرض' },
  { id: 'tag', icon: Tag, label: 'تخفيض' },
  { id: 'truck', icon: Truck, label: 'شحن' },
  { id: 'clock', icon: Clock, label: 'وقت' },
  { id: 'gift', icon: Gift, label: 'هدية' },
  { id: 'percent', icon: Percent, label: 'خصم' },
];

const PRESET_COLORS: ColorPreset[] = [
  { bg: '#191710', text: '#fcfaf3', name: 'حِبري' },
  { bg: '#1e6b4a', text: '#fcfaf3', name: 'غابة' },
  { bg: '#a8470a', text: '#fcfaf3', name: 'طيني' },
  { bg: '#1f4e6b', text: '#fcfaf3', name: 'كحلي' },
  { bg: '#5a6b3b', text: '#fcfaf3', name: 'زيتوني' },
  { bg: '#6b2f3a', text: '#fcfaf3', name: 'نبيذي' },
  { bg: '#3f4a5a', text: '#fcfaf3', name: 'فحمي' },
  { bg: '#e8dcbe', text: '#191710', name: 'رملي' },
];

const TEMPLATES: Template[] = [
  { message: 'خصم 20% على جميع المنتجات!', icon: 'percent' },
  { message: 'شحن مجاني للطلبات فوق 200 ريال', icon: 'truck' },
  { message: 'عرض محدود — ينتهي قريباً', icon: 'clock' },
  { message: 'اشترِ 2 واحصل على الثالث مجاناً', icon: 'gift' },
  { message: 'وصلتنا تشكيلة جديدة', icon: 'sparkles' },
  { message: 'تابعنا على انستقرام للعروض الحصرية', icon: 'megaphone' },
];

const DEFAULT_SETTINGS: AnnouncementData = {
  enabled: false,
  message: '',
  backgroundColor: '#191710',
  textColor: '#fcfaf3',
  icon: 'megaphone',
  isScrolling: false,
  canClose: true,
  link: '',
  linkText: '',
};

export default function AnnouncementSettings({ announcement, onSave, saving = false }: AnnouncementSettingsProps): React.JSX.Element {
  const baseline = useMemo<AnnouncementData>(
    () => ({ ...DEFAULT_SETTINGS, ...(announcement ?? {}) }),
    [announcement],
  );
  const baselineKey = JSON.stringify(baseline);
  const [draft, setDraft] = useState<{ baseline: string; settings: AnnouncementData } | null>(null);
  const settings = draft?.baseline === baselineKey ? draft.settings : baseline;
  const hasChanges = JSON.stringify(settings) !== baselineKey;
  const setSettings = (next: AnnouncementData | ((current: AnnouncementData) => AnnouncementData)): void => {
    setDraft({ baseline: baselineKey, settings: typeof next === 'function' ? next(settings) : next });
  };

  const update = <K extends keyof AnnouncementData>(key: K, value: AnnouncementData[K]): void => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="flex flex-col gap-5">
      {settings.message ? (
        <div className="border-y border-border py-3">
          <p className="mb-2 text-[11px] text-fg-subtle">معاينة</p>
          <AnnouncementBar announcement={settings} preview />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-y border-border py-3">
        <div>
          <p className="text-label font-medium text-foreground">تفعيل الشريط الإعلاني</p>
          <p className="mt-0.5 text-[11px] text-fg-muted">يظهر أعلى متجرك مباشرة.</p>
        </div>
        <Switch checked={settings.enabled} onCheckedChange={(checked) => update('enabled', checked)} aria-label="تفعيل الشريط الإعلاني" />
      </div>

      <div>
        <Label htmlFor="announcement-message" className="mb-1.5 flex items-center gap-1.5">
          <Type className="size-4 text-fg-muted" aria-hidden />
          نص الإعلان
        </Label>
        <Textarea
          id="announcement-message"
          value={settings.message}
          onChange={(event) => update('message', event.target.value)}
          placeholder="اكتب رسالتك الإعلانية هنا…"
          maxLength={150}
          rows={2}
        />
        <p className="mt-1 text-end text-[11px] text-fg-subtle" dir="ltr">{settings.message.length}/150</p>
      </div>

      <div>
        <p className="mb-2 text-label font-medium text-foreground">قوالب جاهزة</p>
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.message}
              type="button"
              onClick={() => setSettings((current) => ({ ...current, message: template.message, icon: template.icon, enabled: true }))}
              className="min-h-11 truncate bg-card px-3 py-2.5 text-start text-[12px] text-fg-muted transition-colors hover:bg-muted hover:text-foreground"
            >
              {template.message}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-label font-medium text-foreground">الأيقونة</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_ICONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={settings.icon === id}
              aria-label={label}
              onClick={() => update('icon', id)}
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-md border transition-colors',
                settings.icon === id
                  ? 'border-accent bg-accent/5 text-foreground'
                  : 'border-border bg-card text-fg-muted hover:border-border-strong',
              )}
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-label font-medium text-foreground">
          <Palette className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
          الألوان
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              aria-pressed={settings.backgroundColor === preset.bg}
              aria-label={`لون ${preset.name}`}
              onClick={() => setSettings((current) => ({ ...current, backgroundColor: preset.bg, textColor: preset.text }))}
              className={cn(
                'inline-flex size-11 items-center justify-center rounded-full border-2 transition-colors',
                settings.backgroundColor === preset.bg ? 'border-foreground' : 'border-transparent',
              )}
              style={{ backgroundColor: preset.bg, color: preset.text }}
            >
              {settings.backgroundColor === preset.bg ? <Check size={14} aria-hidden /> : null}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex min-h-11 flex-1 items-center gap-3 border border-border px-3 text-label text-fg-muted">
            <span>لون الخلفية</span>
            <input
              type="color"
              value={settings.backgroundColor}
              onChange={(event) => update('backgroundColor', event.target.value)}
              className="h-11 w-11 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
          <label className="flex min-h-11 flex-1 items-center gap-3 border border-border px-3 text-label text-fg-muted">
            <span>لون النص</span>
            <input
              type="color"
              value={settings.textColor}
              onChange={(event) => update('textColor', event.target.value)}
              className="h-11 w-11 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="announcement-link" className="mb-1.5 flex items-center gap-1.5">
          <LinkIcon className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
          رابط (اختياري)
        </Label>
        <Input
          id="announcement-link"
          type="url"
          value={settings.link}
          onChange={(event) => update('link', event.target.value)}
          placeholder="https://example.com"
          dir="ltr"
          className="text-start"
        />
        {settings.link ? (
          <Input
            value={settings.linkText}
            onChange={(event) => update('linkText', event.target.value)}
            placeholder="نص الرابط (مثال: تسوق الآن)"
            className="mt-2"
          />
        ) : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-label font-medium text-foreground">طريقة عرض النص</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: 'ثابت', description: 'النص كامل بدون حركة' },
            { value: true, label: 'متحرك', description: 'يتحرك مثل شريط الأخبار' },
          ].map((option) => (
            <label key={option.label} className={cn(
              'flex min-h-16 cursor-pointer items-center gap-3 rounded-md border px-3 py-2',
              settings.isScrolling === option.value ? 'border-foreground bg-muted' : 'border-border',
            )}>
              <input type="radio" name="announcement-motion" value={String(option.value)} checked={settings.isScrolling === option.value} onChange={() => update('isScrolling', option.value)} className="size-4" />
              <span>
                <span className="block text-label font-medium text-foreground">{option.label}</span>
                <span className="block text-[12px] text-fg-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="divide-y divide-border border-y border-border">
        <label className="flex min-h-12 items-center justify-between gap-3 py-2 text-label text-fg-muted">
          <span>السماح للزائر بإغلاق الشريط</span>
          <Switch
            checked={settings.canClose}
            onCheckedChange={(checked) => update('canClose', checked)}
            aria-label="السماح للزائر بإغلاق الشريط"
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => setSettings(DEFAULT_SETTINGS)} disabled={saving} className="gap-2">
          <RotateCcw className="size-4" aria-hidden />
          إعادة تعيين
        </Button>
        <Button type="button" onClick={() => void onSave(settings)} disabled={saving || !hasChanges} className="flex-1 gap-2">
          <Check className="size-4" aria-hidden />
          {saving ? 'جاري الحفظ…' : 'حفظ التغييرات'}
        </Button>
      </div>
    </div>
  );
}
