/**
 * Success Page — unified shell.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui';
import AuthShell from '../../components/auth/AuthShell';
import { CheckCircle, ArrowLeft } from 'lucide-react';

function Success(): React.JSX.Element {
  const { adminData } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthShell
      title="تم إنشاء متجرك بنجاح"
      subtitle={
        adminData?.storeName
          ? `مرحباً بك في ${adminData.storeName} — خطوة واحدة تفصلك عن البيع`
          : 'مرحباً بك — خطوة واحدة تفصلك عن البيع'
      }
      icon={<CheckCircle size={30} aria-hidden />}
    >
      <ol className="my-2 divide-y divide-border border-y border-border">
        <li className="flex items-start gap-3 py-4">
          <span className="mt-0.5 font-display text-label font-semibold text-fg-subtle" data-numeric aria-hidden>
            01
          </span>
          <span className="text-start">
            <span className="block text-label font-semibold text-foreground">الخطوة التالية</span>
            <span className="mt-0.5 block text-label leading-relaxed text-fg-muted">انتقل إلى لوحة التحكم وأضف منتجاتك وتصنيفاتك الأولى.</span>
          </span>
        </li>
        <li className="flex items-start gap-3 py-4">
          <span className="mt-0.5 font-display text-label font-semibold text-fg-subtle" data-numeric aria-hidden>
            02
          </span>
          <span className="text-start">
            <span className="block text-label font-semibold text-foreground">رابط متجرك</span>
            <span className="mt-0.5 block text-label leading-relaxed text-fg-muted">سيظهر رابط المشاركة في الإعدادات بعد إضافة منتج واحد على الأقل.</span>
          </span>
        </li>
      </ol>
      <Button
        onClick={() => navigate('/admin/dashboard', { replace: true })}
        size="lg"
        className="mt-5 w-full"
      >
        انتقل إلى لوحة التحكم
        <ArrowLeft size={17} strokeWidth={1.75} aria-hidden />
      </Button>
    </AuthShell>
  );
}

export default Success;
