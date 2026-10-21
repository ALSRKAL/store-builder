/**
 * App Component - Optimized with Lazy Loading
 * تحميل كسول للصفحات لتسريع التحميل الأولي
 */

import { useEffect, Suspense, lazy, type ReactNode } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { loadAdminWhatsApp } from './config/contact';

// مكتبة الواجهة الموحّدة — تُركّب طبقاتها العامة مرة واحدة هنا
import { Toaster, TooltipProvider } from './components/ui';
import ErrorBoundary from './components/common/ErrorBoundary';
import { isDashboardTab, tabPath } from './lib/dashboardTabs';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StoreProvider } from './contexts/StoreContext';
import { CartProvider } from './contexts/CartContext';
import { PaymentProvider } from './contexts/PaymentContext';

import type { AdminProfile } from './schemas';

// ===== Lazy Loading للصفحات =====
// الصفحات الرئيسية - تحميل فوري
import Landing from './pages/Landing';

// صفحات المتجر - تحميل كسول
const Store = lazy(() => import('./pages/Store'));
const Terms = lazy(() => import('./pages/Terms'));
const ThemePreviewFrame = lazy(() => import('./pages/ThemePreviewFrame'));

// صفحات الأدمن - تحميل كسول
const Login = lazy(() => import('./pages/admin/Login'));
const VerifyCode = lazy(() => import('./pages/admin/VerifyCode'));
const Setup = lazy(() => import('./pages/admin/Setup'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Success = lazy(() => import('./pages/admin/Success'));
const Blocked = lazy(() => import('./pages/admin/Blocked'));

// ===== تبويبات اللوحة - تحميل كسول =====
// كل تبويب وحدة منفصلة حتى لا تُحمَّل شاشات الطلبات/الإعدادات على من يفتح
// المنتجات فقط. نستورد من نفس الوحدة لأنها رقيقة (الغلاف فقط) والمكوّنات
// الثقيلة بداخلها lazy أيضاً.
const ProductsRoute = lazy(() =>
  import('./pages/admin/tabs').then((m) => ({ default: m.ProductsRoute })),
);
const OrdersRoute = lazy(() =>
  import('./pages/admin/tabs').then((m) => ({ default: m.OrdersRoute })),
);
const DeliveryRoute = lazy(() =>
  import('./pages/admin/tabs').then((m) => ({ default: m.DeliveryRoute })),
);
const ThemeRoute = lazy(() =>
  import('./pages/admin/tabs').then((m) => ({ default: m.ThemeRoute })),
);
const SettingsRoute = lazy(() =>
  import('./pages/admin/tabs').then((m) => ({ default: m.SettingsRoute })),
);

// ===== Loading Component =====
// يستخدم توكنات التصميم بدل قيم HEX مكتوبة يدوياً، ويبقى على شكل دوّام مركزي
// لأنه يُعرض قبل معرفة شكل الصفحة (مسارات المصادقة مثلاً).
function PageLoader(): React.JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="جاري تحميل الصفحة"
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background"
    >
      <div
        aria-hidden
        className="size-10 rounded-full border-[3px] border-border border-t-primary animate-spin"
      />
      <p className="text-label text-fg-muted">جاري التحميل...</p>
    </div>
  );
}

// ===== Helper Functions =====
function isSubscriptionValid(adminData: AdminProfile | null): boolean {
  if (!adminData?.subscriptionEnd) return false;
  return new Date(adminData.subscriptionEnd) > new Date();
}

// ===== Store Wrapper =====
function StoreWrapper(): React.JSX.Element {
  const { storeId } = useParams<{ storeId: string }>();
  if (!storeId) return <Navigate to="/" replace />;
  
  return (
    <StoreProvider storeId={storeId}>
      <CartProvider storeId={storeId}>
        <PaymentProvider>
          <Suspense fallback={<PageLoader />}>
            <Store />
          </Suspense>
        </PaymentProvider>
      </CartProvider>
    </StoreProvider>
  );
}

// ===== Protected Route =====
interface ProtectedRouteProps {
  children: ReactNode;
  requireSetup?: boolean;
  checkDashboard?: boolean;
  requireSubscription?: boolean;
}

function ProtectedRoute({ children, requireSetup = false, checkDashboard = false, requireSubscription = false }: ProtectedRouteProps): React.JSX.Element {
  const { user, adminData, loading, isDashboardActive } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin" replace />;
  if (requireSubscription && !isSubscriptionValid(adminData)) return <Navigate to="/admin/verify" replace />;
  if (checkDashboard && !isDashboardActive) return <Navigate to="/admin/blocked" replace />;
  if (requireSetup && !adminData?.storeName) return <Navigate to="/admin/setup" replace />;

  return <>{children}</>;
}

// ===== Verify Route =====
function VerifyRoute(): React.JSX.Element {
  const { user, adminData, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/admin" replace />;
  if (isSubscriptionValid(adminData)) {
    return <Navigate to={adminData?.storeName ? '/admin/dashboard' : '/admin/setup'} replace />;
  }
  return (
    <Suspense fallback={<PageLoader />}>
      <VerifyCode />
    </Suspense>
  );
}

// ===== Blocked Route =====
function BlockedRoute(): React.JSX.Element {
  const { isDashboardActive } = useAuth();
  if (isDashboardActive) return <Navigate to="/admin/dashboard" replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Blocked />
    </Suspense>
  );
}

// ===== Dashboard Index Redirect =====
/**
 * الوصول إلى `/admin/dashboard` بلا مسار فرعي:
 *   - إن حمل رابطاً قديماً `?tab=orders` نحوّله إلى المسار الفرعي المقابل
 *     (روابط محفوظة أو مشاركة سابقة لا تتوقف عن العمل).
 *   - وإلا إلى `products`.
 * `replace` إلزامي: بدونه يبقى المسار الأب في التاريخ فيعلق زر الرجوع.
 */
function DashboardIndexRedirect(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const legacyTab = searchParams.get('tab');
  const target = isDashboardTab(legacyTab) ? tabPath(legacyTab) : tabPath('products');
  return <Navigate to={target} replace />;
}

// ===== App Routes =====
function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/theme-preview"
        element={
          <Suspense fallback={<PageLoader />}>
            <ThemePreviewFrame />
          </Suspense>
        }
      />
      <Route path="/terms" element={<Suspense fallback={<PageLoader />}><Terms /></Suspense>} />
      {/*
        مسار شقيق (splat) يحافظ على بقاء `Store` مركّباً عند الانتقال بين
        /store/:slug و /store/:slug/product/:id و /cart و /checkout، فلا يُفقد
        موضع التمرير ولا تُعاد جلب البيانات، ويعمل زر الرجوع طبيعياً.
      */}
      <Route path="/store/:storeId/*" element={<StoreWrapper />} />
      <Route path="/admin" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
      <Route path="/admin/verify" element={<VerifyRoute />} />
      <Route path="/admin/setup" element={
        <ProtectedRoute requireSubscription>
          <Suspense fallback={<PageLoader />}><Setup /></Suspense>
        </ProtectedRoute>
      } />
      <Route path="/admin/success" element={
        <ProtectedRoute requireSubscription>
          <Suspense fallback={<PageLoader />}><Success /></Suspense>
        </ProtectedRoute>
      } />
      {/*
        اللوحة كمسار أب: `Dashboard` يركّب المزوّد والقشرة مرة واحدة ويبقى
        مركّباً عند تبديل التبويبات، فلا يُعاد الجلب ولا تُفقد حالة النماذج.
      */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requireSetup requireSubscription checkDashboard>
            <Suspense fallback={<PageLoader />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardIndexRedirect />} />
        <Route path="products" element={<ProductsRoute />} />
        <Route path="orders" element={<OrdersRoute />} />
        <Route path="delivery" element={<DeliveryRoute />} />
        <Route path="theme" element={<ThemeRoute />} />
        <Route path="settings" element={<SettingsRoute />} />
        {/* أي مسار فرعي غير معروف داخل اللوحة يعود للمنتجات بدل صفحة 404 */}
        <Route path="*" element={<Navigate to={tabPath('products')} replace />} />
      </Route>
      <Route path="/admin/blocked" element={
        <ProtectedRoute><BlockedRoute /></ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App(): React.JSX.Element {
  useEffect(() => { void loadAdminWhatsApp(); }, []);
  return (
    <BrowserRouter>
      {/*
        MotionConfig reducedMotion="user": يجعل framer-motion يحترم
        prefers-reduced-motion تلقائياً. قبل ذلك كان احترام الإعداد مقصوراً على
        حركات CSS (index.css) بينما 171 حركة JS في المشروع تستمر كما هي.
      */}
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={300} skipDelayDuration={200}>
            <AuthProvider>
              {/* حدّ الخطأ الجذري: يمنع تحوّل أي خطأ غير محتوى إلى شاشة بيضاء */}
              <ErrorBoundary section="التطبيق" fullScreen>
                <AppRoutes />
              </ErrorBoundary>
              {/* شريط التنبيهات العالمي — بديل window.alert */}
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </MotionConfig>
    </BrowserRouter>
  );
}

export default App;
