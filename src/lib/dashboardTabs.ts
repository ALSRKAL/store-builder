/**
 * تعريف تبويبات اللوحة في وحدة معزولة.
 *
 * السبب: `App.tsx` يحتاج التحقق من صحة `?tab=` والمسارات الفرعية. لو استورد
 * هذا التحقق من `DashboardContext` لسحب معه `services/api` و`r2Service` وFirebase
 * إلى الحزمة الأولية، بينما اللوحة كلها يجب أن تبقى lazy. هذه الوحدة لا تستورد
 * شيئاً، فيمكن استخدامها في أي مكان بلا تكلفة.
 */

export const DASHBOARD_TABS = ['products', 'orders', 'delivery', 'theme', 'settings'] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export function isDashboardTab(value: string | null | undefined): value is DashboardTab {
  return value !== null && value !== undefined && (DASHBOARD_TABS as readonly string[]).includes(value);
}

/** المسار الفرعي الكامل لتبويب. */
export function tabPath(tab: DashboardTab): string {
  return `/admin/dashboard/${tab}`;
}