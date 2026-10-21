/**
 * Subscription Plans Configuration
 * Type-safe plan definitions
 */

// Plan interface
export interface Plan {
  id: 'trial' | 'monthly' | 'semiAnnual' | 'annual';
  name: string;
  nameEn: string;
  months: number;
  maxProducts: number;
  maxImagesPerProduct: number;
  maxCategories: number;
  color: string;
  icon: string;
  features: string[];
}

// Plans record type
export type PlansRecord = Record<Plan['id'], Plan>;

// خطط الاشتراك
export const PLANS: PlansRecord = {
  trial: {
    id: 'trial',
    name: 'تجريبي',
    nameEn: 'Trial',
    months: 0,
    maxProducts: 4,
    maxImagesPerProduct: 2,
    maxCategories: 2,
    color: '#9CA3AF',
    icon: '🎁',
    features: [
      '4 منتجات فقط',
      '2 صور لكل منتج',
      '2 تصنيفات',
      'دعم محدود',
    ],
  },
  monthly: {
    id: 'monthly',
    name: 'شهري',
    nameEn: 'Monthly',
    months: 1,
    maxProducts: 10,
    maxImagesPerProduct: 3,
    maxCategories: 3,
    color: '#3B82F6',
    icon: '⭐',
    features: [
      '10 منتجات',
      '3 صور لكل منتج',
      '3 تصنيفات',
      'دعم عبر الواتساب',
    ],
  },
  semiAnnual: {
    id: 'semiAnnual',
    name: '6 أشهر',
    nameEn: '6 Months',
    months: 6,
    maxProducts: 30,
    maxImagesPerProduct: 4,
    maxCategories: 10,
    color: '#8B5CF6',
    icon: '💎',
    features: [
      '30 منتج',
      '4 صور لكل منتج',
      '10 تصنيفات',
      'دعم أولوية',
    ],
  },
  annual: {
    id: 'annual',
    name: 'سنوي',
    nameEn: 'Annual',
    months: 12,
    maxProducts: 100,
    maxImagesPerProduct: 7,
    maxCategories: 999,
    color: '#F59E0B',
    icon: '👑',
    features: [
      '100 منتج',
      '7 صور لكل منتج',
      'تصنيفات غير محدودة',
      'جميع الثيمات + تخصيص الألوان',
      'إخفاء علامة StoreBuilder',
      'دعم VIP على مدار الساعة',
    ],
  },
};

// Current counts interface
export interface CurrentCounts {
  products: number;
  categories: number;
}

// Limits interface
export interface PlanLimits {
  canAddProduct: boolean;
  canAddCategory: boolean;
  canAddImages: (currentImages: number) => boolean;
  remainingProducts: number;
  remainingCategories: number;
  maxImagesPerProduct: number;
}

// الحصول على الخطة بناءً على عدد الأشهر
export function getPlanByMonths(months: number): Plan {
  if (!months || months === 0) return PLANS.trial;
  if (months === 1) return PLANS.monthly;
  if (months >= 2 && months <= 6) return PLANS.semiAnnual;
  return PLANS.annual;
}

// الحصول على الخطة التالية للترقية
export function getNextPlan(currentPlan: Plan | null | undefined): Plan | null {
  const order: Plan['id'][] = ['trial', 'monthly', 'semiAnnual', 'annual'];
  const currentIndex = order.indexOf(currentPlan?.id ?? 'trial');
  if (currentIndex < order.length - 1) {
    const nextPlanId = order[currentIndex + 1];
    if (nextPlanId) {
      return PLANS[nextPlanId];
    }
  }
  return null;
}

// التحقق من الحدود
export function checkLimits(plan: Plan, currentCounts: CurrentCounts): PlanLimits {
  return {
    canAddProduct: currentCounts.products < plan.maxProducts,
    canAddCategory: currentCounts.categories < plan.maxCategories,
    canAddImages: (currentImages: number) => currentImages < plan.maxImagesPerProduct,
    remainingProducts: plan.maxProducts - currentCounts.products,
    remainingCategories: plan.maxCategories - currentCounts.categories,
    maxImagesPerProduct: plan.maxImagesPerProduct,
  };
}

// Limit message types
export type LimitType = 'products' | 'categories' | 'images' | 'upgrade';

// رسائل التحذير
export function getLimitMessage(
  type: LimitType,
  plan: Plan,
  nextPlan: Plan | null
): string {
  const messages: Record<LimitType, string> = {
    products: `وصلت للحد الأقصى من المنتجات (${plan.maxProducts})`,
    categories: `وصلت للحد الأقصى من التصنيفات (${plan.maxCategories})`,
    images: `الحد الأقصى للصور في خطتك هو ${plan.maxImagesPerProduct} صور لكل منتج`,
    upgrade: nextPlan
      ? `قم بالترقية إلى خطة "${nextPlan.name}" للحصول على المزيد`
      : '',
  };

  return messages[type] ?? '';
}
