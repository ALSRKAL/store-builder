import {
  Package,
  Palette,
  Settings,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardTab } from '../../../lib/dashboardTabs';

/**
 * تعريف واحد لقائمة تنقّل اللوحة، يستهلكه الشريط الجانبي (ديسكتوب) وشريط
 * التبويبات (جوال). قبل التفكيك كانت القائمة مكرّرة داخل `Sidebar.tsx`
 * و`Dashboard.tsx` معاً، وأي إضافة تبويب تحتاج تعديل موضعين.
 *
 * لا يستورد هذا الملف أي شيء من الـ context أو الـ API، فيمكن استخدامه في
 * أي مكان بلا تكلفة على الحزمة الأولية.
 */

export interface DashboardMenuItem {
  id: DashboardTab;
  /** التسمية الكاملة في الشريط الجانبي. */
  label: string;
  /** تسمية مختصرة لشريط الجوال. */
  shortLabel: string;
  icon: LucideIcon;
  /** ميزة متاحة للخطة السنوية فقط (تُخفى لا تُعطَّل). */
  annualOnly?: boolean;
}

const MENU_ITEMS: DashboardMenuItem[] = [
  { id: 'products', label: 'المنتجات', shortLabel: 'المنتجات', icon: Package },
  { id: 'orders', label: 'الطلبات', shortLabel: 'الطلبات', icon: ShoppingCart, annualOnly: true },
  { id: 'delivery', label: 'التوصيل', shortLabel: 'التوصيل', icon: Truck, annualOnly: true },
  { id: 'theme', label: 'تخصيص المظهر', shortLabel: 'المظهر', icon: Palette },
  { id: 'settings', label: 'الإعدادات', shortLabel: 'الإعدادات', icon: Settings },
];

export function getMenuItems(isAnnualPlan: boolean): DashboardMenuItem[] {
  return isAnnualPlan ? MENU_ITEMS : MENU_ITEMS.filter((item) => !item.annualOnly);
}

/** المسار المطلق لتبويب — للتحويلات البرمجية (redirects) فقط. */
export function tabPath(tab: DashboardTab): string {
  return `/admin/dashboard/${tab}`;
}

/**
 * المسار النسبي المستخدم في روابط التنقّل.
 *
 * نستخدم مساراً نسبياً (`products` بدل `/admin/dashboard/products`) لأن
 * المكوّن يُرسم داخل عنصر المسار الأب، فيحلّه React Router مقابل مسار الأب:
 *   - في التطبيق   → /admin/dashboard/products
 *   - في أدوات الاختبار التي تُركّب نفس القشرة تحت بادئة أخرى → تعمل أيضاً
 * هذا يزيل تكرار البادئة من مكوّني التنقّل ويجعل الحالة النشطة صحيحة أينما
 * رُكّبت القشرة.
 */
export function tabRoute(tab: DashboardTab): string {
  return tab;
}