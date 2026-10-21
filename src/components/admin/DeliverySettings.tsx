/**
 * DeliverySettings — حالة "قريباً" صادقة، لا واجهة وهمية.
 * كانت البطاقة تستخدم `slate-*`؛ الآن تقرأ من التوكنات وتستخدم `EmptyState` الموحّد.
 */

import { Truck } from 'lucide-react';
import { EmptyState } from '../ui';

function DeliverySettings(): React.JSX.Element {
  return (
    <EmptyState
      icon={Truck}
      title="إدارة التوصيل قريباً"
      description="نعمل على مناطق التوصيل وأسعار الشحن وربطها بالطلبات. ستظهر إعدادات التوصيل هنا فور إطلاقها."
      hint="حالياً تُدار عناوين التوصيل ضمن تفاصيل كل طلب في تبويب الطلبات."
    />
  );
}

export default DeliverySettings;
