export interface AdTemplate {
  id: string;
  name: string;
  background: string;
  badge: string;
  accentColor: string;
  /** وصف قصير للتكوين يظهر في المعاينة المصغّرة */
  layoutHint: string;
}

export const AD_TEMPLATES: AdTemplate[] = [
  { id: 'discount', name: 'تخفيض', background: '#a32a1e', badge: 'خصم', accentColor: '#f2c14e', layoutHint: 'شريط تخفيض مائل وسعر بارز أولاً' },
  { id: 'new', name: 'جديد', background: '#1f4e6b', badge: 'جديد', accentColor: '#f2c14e', layoutHint: 'شارة علوية وصورة وسطية' },
  { id: 'offer', name: 'عرض خاص', background: '#8a5a00', badge: 'عرض خاص', accentColor: '#fcfaf3', layoutHint: 'شريط سفلي عريض للسعر' },
  { id: 'elegant', name: 'أنيق', background: '#191710', badge: 'حصري', accentColor: '#b5ac97', layoutHint: 'داكن هادئ بحدود رفيعة' },
  { id: 'fresh', name: 'منعش', background: '#1e6b4a', badge: 'طازج', accentColor: '#f2c14e', layoutHint: 'شريط أخضر سفلي وصورة كاملة' },
  { id: 'luxury', name: 'فاخر', background: '#2b2418', badge: 'فاخر', accentColor: '#d8b25c', layoutHint: 'إطار ذهبي وعنوان مركزي' },
];

/** مقاس التصدير المعتمد (9:16). */
export const AD_EXPORT_WIDTH = 1080;
export const AD_EXPORT_HEIGHT = 1920;
