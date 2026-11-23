/**
 * Demo Data for Store Preview
 * Type-safe demo store, products, and categories
 */

import type { Store, Product, Category, Theme } from '../schemas';

// Demo theme
const demoTheme: Theme = {
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
  displayMode: 'grid',
  primaryColor: '#191710',
  secondaryColor: '#33564a',
  backgroundColor: '#f4f1e8',
  textColor: '#191710',
  accentColor: '#a8470a',
};

// Demo store
export const demoStore: Store = {
  id: 'demo',
  adminId: 'demo-admin',
  name: 'متجر الأناقة',
  slug: 'demo',
  description: 'متجر تجريبي لعرض المنتجات',
  logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
  whatsapp: '+966500000000',
  currency: 'SAR',
  isActive: true,
  theme: demoTheme,
};

// Demo categories
export const demoCategories: Category[] = [
  {
    id: 'cat1',
    storeId: 'demo',
    name: 'ملابس رجالية',
    order: 0,
    isActive: true,
  },
  {
    id: 'cat2',
    storeId: 'demo',
    name: 'ملابس نسائية',
    order: 1,
    isActive: true,
  },
  {
    id: 'cat3',
    storeId: 'demo',
    name: 'أحذية',
    order: 2,
    isActive: true,
  },
  {
    id: 'cat4',
    storeId: 'demo',
    name: 'إكسسوارات',
    order: 3,
    isActive: true,
  },
];

// Demo products
export const demoProducts: Product[] = [
  {
    id: 'prod1',
    storeId: 'demo',
    categoryId: 'cat1',
    name: 'قميص كلاسيكي أزرق',
    description:
      'قميص رجالي كلاسيكي مصنوع من القطن الفاخر، مناسب للمناسبات الرسمية والعمل. يتميز بخامة ناعمة ومريحة.',
    price: 199,
    originalPrice: 299,
    colors: ['#1e3a5f', '#ffffff', '#000000'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600',
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600',
    ],
    isActive: true,
    isFeatured: true,
    order: 0,
  },
  {
    id: 'prod2',
    storeId: 'demo',
    categoryId: 'cat2',
    name: 'فستان سهرة أنيق',
    description:
      'فستان سهرة فاخر بتصميم عصري، مناسب للحفلات والمناسبات الخاصة. مصنوع من أجود أنواع الأقمشة.',
    price: 599,
    originalPrice: 799,
    colors: ['#000000', '#8b0000', '#000080'],
    sizes: ['S', 'M', 'L'],
    images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600',
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600',
    ],
    isActive: true,
    isFeatured: true,
    order: 1,
  },
  {
    id: 'prod3',
    storeId: 'demo',
    categoryId: 'cat3',
    name: 'حذاء رياضي أحمر',
    description:
      'حذاء رياضي مريح للاستخدام اليومي، مصنوع من مواد عالية الجودة مع نعل مرن.',
    price: 349,
    colors: ['#ffffff', '#000000', '#ff0000'],
    sizes: ['40', '41', '42', '43', '44', '45'],
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600',
    ],
    isActive: true,
    isFeatured: false,
    order: 2,
  },
  {
    id: 'prod4',
    storeId: 'demo',
    categoryId: 'cat4',
    name: 'ساعة يد فاخرة',
    description:
      'ساعة يد أنيقة بتصميم كلاسيكي، مقاومة للماء مع سوار جلد طبيعي.',
    price: 899,
    originalPrice: 1299,
    colors: ['#c0c0c0', '#ffd700', '#000000'],
    sizes: [],
    images: [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
    ],
    isActive: true,
    isFeatured: true,
    order: 3,
  },
  {
    id: 'prod5',
    storeId: 'demo',
    categoryId: 'cat1',
    name: 'بنطلون جينز',
    description:
      'بنطلون جينز عصري بقصة مريحة، مناسب للإطلالات اليومية الكاجوال.',
    price: 249,
    colors: ['#1e3a5f', '#000000', '#808080'],
    sizes: ['30', '32', '34', '36', '38'],
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600',
      'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600',
    ],
    isActive: true,
    isFeatured: false,
    order: 4,
  },
  {
    id: 'prod6',
    storeId: 'demo',
    categoryId: 'cat4',
    name: 'حقيبة يد نسائية',
    description:
      'حقيبة يد أنيقة من الجلد الصناعي الفاخر، تتسع للأغراض اليومية.',
    price: 399,
    originalPrice: 499,
    colors: ['#000000', '#8b4513', '#ffc0cb'],
    sizes: [],
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600',
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600',
    ],
    isActive: true,
    isFeatured: false,
    order: 5,
  },
];
