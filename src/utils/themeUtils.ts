/**
 * Theme Utilities
 * أدوات إدارة الثيم والألوان
 */

import type { CSSProperties } from 'react';
import type { Plan } from '../config/plans';

// Theme interface
export interface ThemeConfig {
  name: string;
  minPlan: Plan['id'];
  primary: string;
  secondary: string;
  accent: string;
  headerBg: string;
  headerText: string;
  bodyBg: string;
  cardBg: string;
  footerBg: string;
  footerText: string;
  buttonRadius: string;
  cardRadius: string;
}

// Preset themes type
export type PresetThemeKey =
  | 'default'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'royal'
  | 'elegant'
  | 'rose'
  | 'dark'
  | 'luxury'
  | 'neon'
  | 'minimal';

// الثيمات الجاهزة مع مستوى الخطة المطلوب
export const presetThemes: Record<PresetThemeKey, ThemeConfig> = {
  default: {
    name: 'الافتراضي',
    minPlan: 'trial',
    primary: '#191710',
    secondary: '#33564a',
    accent: '#a8470a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#f4f1e8',
    cardBg: '#fcfaf3',
    footerBg: '#191710',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  ocean: {
    name: 'المحيط',
    minPlan: 'monthly',
    primary: '#1f4e6b',
    secondary: '#33564a',
    accent: '#a8470a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#eff2f1',
    cardBg: '#fcfaf3',
    footerBg: '#1f4e6b',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  sunset: {
    name: 'الغروب',
    minPlan: 'monthly',
    primary: '#a8470a',
    secondary: '#8a5a00',
    accent: '#1e6b4a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#f6f0e8',
    cardBg: '#fcfaf3',
    footerBg: '#2b2418',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  forest: {
    name: 'الغابة',
    minPlan: 'monthly',
    primary: '#1e6b4a',
    secondary: '#33564a',
    accent: '#a8470a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#f0f3ee',
    cardBg: '#fcfaf3',
    footerBg: '#143d2f',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  royal: {
    name: 'الكحلي',
    minPlan: 'semiAnnual',
    primary: '#1f3a5f',
    secondary: '#33564a',
    accent: '#a8470a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#eef1f4',
    cardBg: '#fcfaf3',
    footerBg: '#15263d',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  elegant: {
    name: 'الأنيق',
    minPlan: 'semiAnnual',
    primary: '#191710',
    secondary: '#33564a',
    accent: '#8a5a00',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#f4f1e8',
    cardBg: '#fcfaf3',
    footerBg: '#191710',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  rose: {
    name: 'الطيني',
    minPlan: 'semiAnnual',
    primary: '#9a3b3b',
    secondary: '#a8470a',
    accent: '#1e6b4a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#f6efea',
    cardBg: '#fcfaf3',
    footerBg: '#3a1f1f',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  dark: {
    name: 'الداكن',
    minPlan: 'semiAnnual',
    primary: '#a8470a',
    secondary: '#33564a',
    accent: '#f2c14e',
    headerBg: '#191710',
    headerText: '#fcfaf3',
    bodyBg: '#14120e',
    cardBg: '#211d16',
    footerBg: '#0f0d09',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  luxury: {
    name: 'الفاخر',
    minPlan: 'annual',
    primary: '#7a5a00',
    secondary: '#5a5446',
    accent: '#d8b25c',
    headerBg: '#191710',
    headerText: '#f2c14e',
    bodyBg: '#1a1712',
    cardBg: '#241f18',
    footerBg: '#0f0d09',
    footerText: '#d8b25c',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  neon: {
    name: 'الرمادي',
    minPlan: 'annual',
    primary: '#3f4a5a',
    secondary: '#191710',
    accent: '#a8470a',
    headerBg: '#f4f1e8',
    headerText: '#191710',
    bodyBg: '#f2f2ef',
    cardBg: '#fcfaf3',
    footerBg: '#26303c',
    footerText: '#fcfaf3',
    buttonRadius: '4px',
    cardRadius: '6px',
  },
  minimal: {
    name: 'بسيط',
    minPlan: 'annual',
    primary: '#191710',
    secondary: '#5a5446',
    accent: '#a8470a',
    headerBg: '#fcfaf3',
    headerText: '#191710',
    bodyBg: '#f4f1e8',
    cardBg: '#fcfaf3',
    footerBg: '#191710',
    footerText: '#fcfaf3',
    buttonRadius: '0px',
    cardRadius: '0px',
  },
};

// ترتيب الخطط للمقارنة
const planOrder: Plan['id'][] = ['trial', 'monthly', 'semiAnnual', 'annual'];

// Plan names map
const planNames: Record<Plan['id'], string> = {
  trial: 'تجريبي',
  monthly: 'شهري',
  semiAnnual: '6 أشهر',
  annual: 'سنوي',
};

// التحقق إذا كان الثيم متاح للخطة
export function isThemeAvailable(
  themeKey: PresetThemeKey,
  currentPlanId: Plan['id'] | undefined
): boolean {
  const theme = presetThemes[themeKey];
  if (!theme) return false;

  const themeMinPlanIndex = planOrder.indexOf(theme.minPlan);
  const currentPlanIndex = planOrder.indexOf(currentPlanId ?? 'trial');

  return currentPlanIndex >= themeMinPlanIndex;
}

// الحصول على الثيمات المتاحة للخطة
export function getAvailableThemes(
  currentPlanId: Plan['id'] | undefined
): [PresetThemeKey, ThemeConfig][] {
  return (Object.entries(presetThemes) as [PresetThemeKey, ThemeConfig][]).filter(
    ([key]) => isThemeAvailable(key, currentPlanId)
  );
}

// التحقق إذا كان تخصيص الألوان متاح
export function canCustomizeColors(currentPlanId: Plan['id'] | undefined): boolean {
  return currentPlanId === 'annual';
}

// الحصول على اسم الخطة المطلوبة للثيم
export function getRequiredPlanName(themeKey: PresetThemeKey): string {
  const theme = presetThemes[themeKey];
  if (!theme) return '';
  return planNames[theme.minPlan] ?? '';
}

// Theme input for applyTheme (partial theme)
export interface ThemeInput {
  primary?: string | undefined;
  secondary?: string | undefined;
  accent?: string | undefined;
  headerBg?: string | undefined;
  headerText?: string | undefined;
  bodyBg?: string | undefined;
  cardBg?: string | undefined;
  footerBg?: string | undefined;
  footerText?: string | undefined;
  buttonRadius?: string | undefined;
  cardRadius?: string | undefined;
  primaryColor?: string | undefined;
  secondaryColor?: string | undefined;
  backgroundColor?: string | undefined;
  textColor?: string | undefined;
  accentColor?: string | undefined;
  fontFamily?: string | undefined;
  borderRadius?: string | undefined;
}

// تطبيق الثيم على الصفحة
export function applyTheme(theme: ThemeInput | null | undefined): void {
  if (!theme) {
    // Apply default theme if no theme provided
    applyTheme(defaultTheme);
    return;
  }

  const root = document.documentElement;
  const vars = buildStoreThemeVars(theme);
  Object.entries(vars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
}

/** نسبة سطوع نسبية وفق WCAG. */
function relativeLuminance(hex: string): number {
  const raw = hex.replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return 0;
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(full.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

/** نسبة التباين بين لونين (1–21). */
export function getContrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/** أفضل نص (حبر أو كريمي) على خلفية معيّنة، بغض النظر عن عتبة isLightColor. */
function bestTextOn(background: string): string {
  return getContrastRatio('#191710', background) >= getContrastRatio('#fcfaf3', background)
    ? '#191710'
    : '#fcfaf3';
}

/**
 * يبني كل متغيرات المتجر من ثيم واحد. يستخدمه المتجر الحقيقي ومعاينة الأدمن
 * معاً، فلا يمكن أن تختلف المعاينة عن النتيجة المحفوظة.
 */
export function buildStoreThemeVars(theme: ThemeInput): Record<string, string> {
  const primary = theme.primary ?? theme.primaryColor ?? '#191710';
  const secondary = theme.secondary ?? theme.secondaryColor ?? '#33564a';
  const accent = theme.accent ?? theme.accentColor ?? '#a8470a';
  const bodyBg = theme.bodyBg ?? theme.backgroundColor ?? '#f4f1e8';
  const cardBg = theme.cardBg ?? '#fcfaf3';
  const headerBg = theme.headerBg ?? theme.backgroundColor ?? '#f4f1e8';
  const footerBg = theme.footerBg ?? '#191710';
  const cardIsLight = isLightColor(cardBg);

  // نصوص الهيدر/الفوتر المخصّصة تُحترم إن كانت مقروءة، وإلا نختار الأفضل تبايناً.
  const preferredHeaderText = theme.headerText ?? bestTextOn(headerBg);
  const headerText =
    getContrastRatio(preferredHeaderText, headerBg) >= 4.5
      ? preferredHeaderText
      : bestTextOn(headerBg);
  const preferredFooterText = theme.footerText ?? bestTextOn(footerBg);
  const footerText =
    getContrastRatio(preferredFooterText, footerBg) >= 4.5
      ? preferredFooterText
      : bestTextOn(footerBg);

  return {
    '--store-primary': primary,
    '--store-secondary': secondary,
    '--store-accent': accent,
    '--store-header-bg': headerBg,
    '--store-header-text': headerText,
    '--store-body-bg': bodyBg,
    '--store-card-bg': cardBg,
    '--store-footer-bg': footerBg,
    '--store-footer-text': footerText,
    '--store-border': cardIsLight ? '#d8d2c2' : '#3a352b',
    '--store-button-radius': theme.buttonRadius ?? '4px',
    '--store-card-radius': theme.cardRadius ?? '6px',
    '--store-primary-dark': darkenColor(primary, 15),
    '--store-card-text': bestTextOn(cardBg),
    '--store-card-secondary': cardIsLight ? '#5a5446' : '#c9c2b3',
    '--store-body-text': bestTextOn(bodyBg),
    '--store-button-text': bestTextOn(primary),
    '--store-primary-text': cardIsLight
      ? getContrastRatio(primary, cardBg) >= 4.5
        ? primary
        : `color-mix(in srgb, ${primary} 55%, #191710)`
      : `color-mix(in srgb, ${primary} 40%, #fcfaf3)`,
    '--store-danger-text': cardIsLight ? '#a32a1e' : '#f0a49c',
    '--store-success-text': cardIsLight ? '#1e6b4a' : '#7bd0a8',
  };
}

/**
 * إزالة متغيرات ثيم التاجر من الجذر، فتعود قيم `:root` الافتراضية.
 * تُستدعى عند مغادرة صفحة المتجر لمنع تسرّب ألوان تاجر إلى آخر أو للوحة.
 */
export function resetTheme(): void {
  const root = document.documentElement;
  [
    '--store-primary',
    '--store-primary-dark',
    '--store-secondary',
    '--store-accent',
    '--store-header-bg',
    '--store-header-text',
    '--store-body-bg',
    '--store-card-bg',
    '--store-footer-bg',
    '--store-footer-text',
    '--store-button-radius',
    '--store-card-radius',
    '--store-card-text',
    '--store-card-secondary',
    '--store-body-text',
    '--store-border',
    '--store-button-text',
    '--store-primary-text',
    '--store-danger-text',
    '--store-success-text',
  ].forEach((property) => root.style.removeProperty(property));
}

/**
 * Keeps platform primitives (Dialog, Sheet, Input, Button) inside the
 * storefront on the merchant's palette. Apply it to the store root and to every
 * portal surface (cart, checkout, product modal) because portals render
 * outside that root. Without it, a dark merchant theme leaves paper-coloured
 * sheets and inputs on top of a dark store.
 */
export const storeScopeStyle = {
  '--bg': 'var(--store-body-bg)',
  '--background': 'var(--store-body-bg)',
  '--fg': 'var(--store-card-text)',
  '--foreground': 'var(--store-card-text)',
  '--fg-muted': 'var(--store-card-secondary)',
  '--fg-subtle': 'var(--store-card-secondary)',
  '--muted-foreground': 'var(--store-card-secondary)',
  '--surface': 'var(--store-card-bg)',
  '--surface-raised': 'var(--store-card-bg)',
  '--surface-sunken': 'var(--store-body-bg)',
  '--card': 'var(--store-card-bg)',
  '--card-foreground': 'var(--store-card-text)',
  '--popover': 'var(--store-card-bg)',
  '--popover-foreground': 'var(--store-card-text)',
  '--border': 'var(--store-border)',
  '--border-strong': 'var(--store-border)',
  '--input': 'var(--store-border)',
  '--muted': 'var(--store-body-bg)',
  '--primary': 'var(--store-primary)',
  '--primary-fg': 'var(--store-button-text)',
  '--primary-foreground': 'var(--store-button-text)',
  '--primary-light': 'var(--store-primary)',
  '--primary-dark': 'var(--store-primary)',
  '--accent': 'var(--store-primary)',
  '--accent-fg': 'var(--store-button-text)',
  '--ring': 'var(--store-primary)',
} as CSSProperties;

// تحويل اللون إلى أغمق
export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
  const B = Math.max((num & 0x0000ff) - amt, 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// التحقق إذا كان اللون فاتح
export function isLightColor(hex: string | null | undefined): boolean {
  if (!hex) return true;
  const c = hex.replace('#', '');
  const rgb = parseInt(c, 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 128;
}

// الثيم الافتراضي
export const defaultTheme: ThemeConfig = presetThemes.default;
