import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthShell from './AuthShell';
import { Button } from '../ui';

/** Initial profile outages must not masquerade as a new/expired account. */
export default function ProfileRetry(): React.JSX.Element {
  const { profileError, refreshAdminData, logout } = useAuth();
  const [retrying, setRetrying] = useState(false);
  const retry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await refreshAdminData();
    } catch {
      // AuthContext retains the error until an authoritative response arrives.
    } finally {
      setRetrying(false);
    }
  };
  return (
    <AuthShell title="تعذّر التحقق من الحساب" subtitle="بيانات اشتراكك لم تتغير">
      <p role="alert" className="mb-4 text-label text-danger">{profileError}</p>
      <Button className="w-full" disabled={retrying} onClick={() => void retry()}>
        {retrying ? 'جاري المحاولة...' : 'إعادة المحاولة'}
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={() => void logout()}>
        تسجيل الخروج
      </Button>
    </AuthShell>
  );
}
