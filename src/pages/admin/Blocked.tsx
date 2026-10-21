/**
 * Blocked Page — unified shell.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AuthShell from '../../components/auth/AuthShell';
import { ShieldOff, LogOut } from 'lucide-react';

function Blocked(): React.JSX.Element {
  const { logout, adminData } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/admin');
  };

  return (
    <AuthShell
      title="تم إيقاف لوحة التحكم"
      subtitle="تم إيقاف الوصول إلى لوحة التحكم الخاصة بك. يرجى التواصل مع الإدارة لمزيد من المعلومات."
      icon={<ShieldOff size={30} aria-hidden />}
    >
      {adminData?.storeName && (
        <div className="mb-4 border-y border-border py-3 text-start">
          <p className="m-0 text-label text-fg-muted">
            المتجر: <strong className="text-foreground">{adminData.storeName}</strong>
          </p>
        </div>
      )}
      <button
        onClick={() => void handleLogout()}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-danger/30 text-label font-medium text-danger transition-colors hover:bg-danger/5"
      >
        <LogOut size={17} aria-hidden />
        تسجيل الخروج
      </button>
    </AuthShell>
  );
}

export default Blocked;
