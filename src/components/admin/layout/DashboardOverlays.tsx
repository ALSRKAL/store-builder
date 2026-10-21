/**
 * DashboardOverlays — كل الطبقات العائمة التي يمكن لأي تبويب فتحها.
 *
 * لماذا هنا لا داخل التبويبات: نماذج المنتج/التصنيف ومولّد الإعلانات هي
 * إجراءات على مستوى اللوحة، تُفتح من قسم المنتجات ومن الهيدر معاً. لو وضعناها
 * داخل مسار واحد لَفُقدت عند الانتقال، ولكان على كل تبويب أن يعيد تركيبها.
 * بتركيبها مرة واحدة فوق `<Outlet />` تبقى حالتها متسقة ولا تتكرّر.
 */

import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import ProductForm from '../ProductForm';
import CategoryForm from '../CategoryForm';
import AdGenerator from '../AdGenerator';
import { UpgradeDialog } from '../subscription';
import OnboardingTour from '../OnboardingTour';

export function DashboardOverlays(): React.JSX.Element {
  const { adminData, currentPlan, hideUpgradeUI } = useAuth();
  const {
    showProductForm,
    editingProduct,
    categories,
    closeProductForm,
    saveProduct,
    showCategoryForm,
    editingCategory,
    closeCategoryForm,
    saveCategory,
    adGeneratorProduct,
    closeAdGenerator,
    limitAlert,
    closeLimitAlert,
    showOnboarding,
    completeOnboarding,
  } = useDashboard();

  return (
    <>
      <AnimatePresence>
        {showProductForm ? (
          <ProductForm
            product={editingProduct}
            categories={categories}
            onSave={saveProduct}
            onClose={closeProductForm}
          />
        ) : null}
        {showCategoryForm ? (
          <CategoryForm
            category={editingCategory}
            onSave={saveCategory}
            onClose={closeCategoryForm}
          />
        ) : null}
      </AnimatePresence>

      {adGeneratorProduct ? (
        <AdGenerator
          product={adGeneratorProduct}
          storeName={adminData?.storeName}
          onClose={closeAdGenerator}
        />
      ) : null}

      <UpgradeDialog
        open={limitAlert.show}
        onOpenChange={(open) => {
          if (!open) closeLimitAlert();
        }}
        plan={currentPlan}
        storeName={adminData?.storeName}
        hideUpgradeUI={hideUpgradeUI}
        reason="limit"
        {...(limitAlert.type === 'products' || limitAlert.type === 'categories'
          ? { limitType: limitAlert.type }
          : {})}
      />

      <AnimatePresence>
        {showOnboarding ? (
          <OnboardingTour
            storeName={adminData?.storeName}
            onComplete={completeOnboarding}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default DashboardOverlays;
