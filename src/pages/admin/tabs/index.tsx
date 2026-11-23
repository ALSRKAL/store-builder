/**
 * مسارات تبويبات اللوحة.
 *
 * كل تبويب هنا مكوّن رقيق (thin wrapper) مهمته الوحيدة: قراءة الحالة المشتركة
 * من `DashboardContext` وتمريرها إلى المكوّن الأصلي بنفس الـ props التي كان
 * `Dashboard.tsx` يمرّرها حرفياً. بهذا لا نلمس `OrdersManager` أو `ThemeSettings`
 * أو `SettingsTab` في هذه المرحلة إطلاقاً — صفر مخاطرة على منطقها.
 *
 * المكوّنات الثقيلة تُحمَّل كسولاً حتى لا يتحمّلها من يفتح تبويب المنتجات فقط.
 * حدود `Suspense` موجودة في `AdminShell`.
 */

import { lazy } from 'react';
import { useDashboard } from '../../../contexts/DashboardContext';
import PageHeader from '../../../components/admin/layout/PageHeader';
import ProductManager from '../../../components/admin/ProductManager';
import { buildSettingsAdminData } from './settingsAdminData';

const OrdersManager = lazy(() => import('../../../components/admin/OrdersManager'));
const ThemeSettings = lazy(() => import('../../../components/admin/ThemeSettings'));
const SettingsTab = lazy(() => import('../../../components/admin/SettingsTab'));
const DeliverySettings = lazy(() => import('../../../components/admin/DeliverySettings'));

/* ===== المنتجات ===== */
export function ProductsRoute(): React.JSX.Element {
  // ProductManager يرسم رأسه وإجراءاته بنفسه لأنه يملك أزرار الإضافة وحدود الخطة.
  return <ProductManager />;
}

/* ===== الطلبات ===== */
export function OrdersRoute(): React.JSX.Element {
  const { storeCurrency, ordersCache, handleOrdersUpdate } = useDashboard();

  return (
    <>
      <PageHeader
        title="الطلبات"
        description="راجع طلبات عملائك، وحدّث حالتها من التأكيد حتى التسليم."
      />
      <OrdersManager
        currency={storeCurrency}
        cachedData={
          ordersCache.loaded
            ? (ordersCache as NonNullable<Parameters<typeof OrdersManager>[0]['cachedData']>)
            : null
        }
        onDataUpdate={handleOrdersUpdate}
      />
    </>
  );
}

/* ===== التوصيل ===== */
export function DeliveryRoute(): React.JSX.Element {
  return (
    <>
      <PageHeader
        title="التوصيل"
        description="إعدادات مناطق وأسعار التوصيل."
      />
      <DeliverySettings />
    </>
  );
}

/* ===== المظهر ===== */
export function ThemeRoute(): React.JSX.Element {
  const { storeTheme, savingTheme, saveTheme, storeCurrency } = useDashboard();

  return (
    <>
      <PageHeader
        title="تخصيص المظهر"
        description="اختر ألوان متجرك وخطه وعرضه، وشاهد النتيجة قبل الحفظ."
      />
      <ThemeSettings
        currentTheme={
          storeTheme as Parameters<typeof ThemeSettings>[0]['currentTheme']
        }
        onSave={saveTheme}
        loading={savingTheme}
        storeCurrency={storeCurrency}
      />
    </>
  );
}

/* ===== الإعدادات ===== */
export function SettingsRoute(): React.JSX.Element {
  const {
    user,
    adminData,
    currentPlan,
    hideUpgradeUI,
    storeCurrency,
    storeLocation,
    storeAnnouncement,
    storeSocialLinks,
    products,
    categories,
    saveCurrency,
    saveLocation,
    toggleLocationVisibility,
    updateStoreInfo,
    saveAnnouncement,
    saveSocialLinks,
    navigateToTab,
    startTour,
    logout,
  } = useDashboard();

  if (!adminData || !user) {
    return (
      <PageHeader
        title="الإعدادات"
        description="تعذّر تحميل بيانات الحساب. أعد تحميل الصفحة."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="الإعدادات"
        description="معلومات المتجر، العملة، الموقع، الروابط، الإشعارات ووسائل الدفع."
      />
      <SettingsTab
        adminData={buildSettingsAdminData(adminData, user.uid)}
        storeCurrency={storeCurrency}
        storeIsActive={adminData.storeIsActive !== false}
        onSaveCurrency={saveCurrency}
        storeLocation={storeLocation}
        onSaveLocation={saveLocation}
        onToggleLocationVisibility={toggleLocationVisibility}
        onUpdateStoreInfo={updateStoreInfo}
        storeAnnouncement={storeAnnouncement ?? null}
        onSaveAnnouncement={
          saveAnnouncement as Parameters<typeof SettingsTab>[0]['onSaveAnnouncement']
        }
        storeSocialLinks={storeSocialLinks ?? null}
        onSaveSocialLinks={
          saveSocialLinks as Parameters<typeof SettingsTab>[0]['onSaveSocialLinks']
        }
        onRenewalSuccess={() => window.location.reload()}
        productsCount={products.length}
        categoriesCount={categories.length}
        onNavigate={navigateToTab}
        onShowTour={startTour}
        onLogout={() => void logout()}
        hideUpgradeUI={hideUpgradeUI}
        isAnnualPlan={currentPlan.id === 'annual'}
      />
    </>
  );
}