/**
 * AdminShell — القشرة الكاملة للوحة التحكم.
 *
 * التخطيط: flex أفقي، الشريط الجانبي أول عنصر فيأخذ موضعه على بداية السطر
 * (يمين في RTL) تلقائياً. لا `position: fixed` ولا `margin-right` وهو ما ينهي
 * نهائياً تضارب `md:mr-[248px]` مع تحوّل الشريط إلى شريط سفلي عند `lg`.
 *
 * المسؤوليات:
 *   - تركيب الشريط الجانبي (ديسكتوب) وشريط التبويبات (جوال).
 *   - الهيدر العلوي + شريط سياقي واحد للخطة/الاشتراك (ارتفاع 44px).
 *   - `<Outlet />` للتبويب الحالي داخل `ErrorBoundary` مفتاحه المسار، فأي خطأ
 *     في تبويب يُحتوى ولا يُسقط اللوحة، ويُعاد ضبطه بمجرد تغيير التبويب.
 *   - حشو سفلي كافٍ على الجوال (`pb-24`) حتى لا يغطي شريط التنقّل آخر عنصر
 *     أو أزرار الحفظ.
 */

import { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboard } from '../../../contexts/DashboardContext';
import ErrorBoundary from '../../common/ErrorBoundary';
import { PageSkeleton } from '../../ui';
import Sidebar from './Sidebar';
import AdminHeader from './AdminHeader';
import MobileTabBar from './MobileTabBar';
import DashboardOverlays from './DashboardOverlays';
import { ContextualBanner, UpgradeDialog } from '../subscription';

function AdminShell(): React.JSX.Element {
  const { currentPlan, adminData, hideUpgradeUI } = useAuth();
  const { daysRemaining } = useDashboard();
  const location = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [dialog, setDialog] = useState<'plans' | 'renew' | null>(null);

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader />

        {!bannerDismissed ? (
          <ContextualBanner
            plan={currentPlan}
            daysRemaining={daysRemaining}
            hideUpgradeUI={hideUpgradeUI}
            onRenew={() => setDialog('renew')}
            onUpgrade={() => setDialog('plans')}
            onDismiss={() => setBannerDismissed(true)}
          />
        ) : null}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:pb-10">
          <ErrorBoundary key={location.pathname} section="لوحة التحكم">
            <Suspense fallback={<PageSkeleton className="p-0" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <MobileTabBar />
      <DashboardOverlays />

      <UpgradeDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        plan={currentPlan}
        storeName={adminData?.storeName}
        hideUpgradeUI={hideUpgradeUI}
        reason={dialog === 'renew' ? 'renew' : 'plans'}
      />
    </div>
  );
}

export default AdminShell;
