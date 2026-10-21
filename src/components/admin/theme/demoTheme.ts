import type { ThemeConfig } from '../../../utils/themeUtils';

export type DisplayMode = 'grid' | 'story';

export interface DemoProduct {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  colors: string[];
}

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    id: 1,
    name: 'قميص كلاسيكي',
    price: 199,
    oldPrice: 299,
    image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300',
    colors: ['#1e3a5f', '#ffffff', '#000000'],
  },
  {
    id: 2,
    name: 'فستان سهرة',
    price: 599,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300',
    colors: ['#000000', '#8b0000'],
  },
  {
    id: 3,
    name: 'حذاء رياضي',
    price: 349,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300',
    colors: ['#ffffff', '#000000', '#ff0000'],
  },
  {
    id: 4,
    name: 'ساعة فاخرة',
    price: 899,
    oldPrice: 1299,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300',
    colors: ['#c0c0c0', '#ffd700'],
  },
];

export const DEMO_CATEGORIES = ['الكل', 'ملابس', 'أحذية', 'إكسسوارات'];

export type DemoTheme = ThemeConfig;
