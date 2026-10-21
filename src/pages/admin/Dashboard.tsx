/**
 * Dashboard — نقطة تركيب اللوحة.
 *
 * كان هذا الملف 993 سطراً: القشرة + الجلب + المعالجات + قسم المنتجات + كل
 * النوافذ. الآن مسؤوليته الوحيدة:
 *
 *   DashboardProvider  ← الحالة المشتركة (تبقى مركّبة عبر تغيير التبويبات)
 *     └── AdminShell    ← الشريط الجانبي + الهيدر + شريط الجوال + <Outlet/>
 *
 * `react-router` يُبقي عنصر المسار الأب مركّباً عند التنقل بين المسارات
 * الفرعية، لذلك لا يُعاد الجلب ولا تُفقد حالة النماذج عند تبديل التبويب.
 *
 * حُذف من هنا: كتلة `popstate` التي كانت تُعيد دفع حالة إلى `history` وتمنع
 * زر الرجوع من مغادرة اللوحة. التنقّل الآن تاريخ متصفح طبيعي: رجوع من الطلبات
 * يعيدك إلى المنتجات، ورجوع من المنتجات يعيدك إلى الصفحة السابقة.
 */

import { DashboardProvider } from '../../contexts/DashboardContext';
import AdminShell from '../../components/admin/layout/AdminShell';

function Dashboard(): React.JSX.Element {
  return (
    <DashboardProvider>
      <AdminShell />
    </DashboardProvider>
  );
}

export default Dashboard;