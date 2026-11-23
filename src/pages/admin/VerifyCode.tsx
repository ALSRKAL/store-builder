/**
 * VerifyCode — subscription verification with unified shell.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getEntitlementRoute } from '../../lib/authEntitlement';
import ProfileRetry from '../../components/auth/ProfileRetry';
import { cn } from '../../lib/utils';
import { Button, Input, Label } from '../../components/ui';
import AuthShell from '../../components/auth/AuthShell';
import {
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  LogOut,
  MessageCircle,
  Gift,
  Check,
  Loader2,
} from 'lucide-react';
import { getWhatsAppLink, WHATSAPP_MESSAGES } from '../../config/contact';
import { PLANS } from '../../config/plans';

type ErrorType = 'used' | 'invalid' | 'expired' | 'trial-used' | 'active' | 'error' | '';

const translateError = (message: string): string => {
  if (message === 'PROFILE_REFRESH_FAILED') return 'تم التفعيل، لكن تعذّر تحميل بيانات الحساب. أعد المحاولة للتحقق من حالة الاشتراك.';
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('already used') || lowerMsg.includes('used by another'))
    return 'هذا الرمز مستخدم من قبل حساب آخر';
  if (lowerMsg.includes('invalid') || lowerMsg.includes('not found'))
    return 'رمز الاشتراك غير صحيح أو غير موجود';
  if (lowerMsg.includes('expired')) return 'انتهت صلاحية هذا الرمز';
  if (lowerMsg.includes('استخدمت الفترة التجريبية') || lowerMsg.includes('trial'))
    return message;
  if (lowerMsg.includes('اشتراك نشط')) return message;
  return 'حدث خطأ أثناء التحقق من الرمز';
};

const getErrorType = (message: string): ErrorType => {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('used')) return 'used';
  if (lowerMsg.includes('invalid') || lowerMsg.includes('not found')) return 'invalid';
  if (lowerMsg.includes('expired')) return 'expired';
  if (lowerMsg.includes('استخدمت الفترة التجريبية') || lowerMsg.includes('trial'))
    return 'trial-used';
  if (lowerMsg.includes('اشتراك نشط')) return 'active';
  return 'error';
};

function VerifyCode(): React.JSX.Element {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<ErrorType>('');
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const { user, adminData, logout, refreshAdminData, entitlement, profileError, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const trialUnavailable = !entitlement.canStartTrial;

  useEffect(() => {
    if (authLoading) return;
    if (user && entitlement.active) {
      navigate(getEntitlementRoute(adminData), { replace: true });
      return;
    }
    setCheckingSubscription(false);
  }, [user, adminData, entitlement.active, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setErrorType('');
    setLoading(true);
    // نُبقي الشرطات كما هي: رموز الاشتراك تُنشأ بصيغة XXXX-XXXX-XXXX
    // ويقارنها الخادم نصياً. إزالة الشرطات كانت تجعل كل رمز جديد غير صالح.
    const formatted = code.trim().toUpperCase();
    const rawLength = formatted.replace(/[\s-]/g, '').length;
    if (rawLength < 8 || rawLength > 20) {
      setError('يرجى إدخال رمز اشتراك صحيح');
      setErrorType('invalid');
      setLoading(false);
      return;
    }
    try {
      const result = await api.subscriptions.verify(formatted);
      if (result.success) {
        const refreshed = await refreshAdminData();
        if (!refreshed) throw new Error('PROFILE_REFRESH_FAILED');
        navigate(getEntitlementRoute(refreshed), { replace: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      setError(translateError(errorMessage));
      setErrorType(getErrorType(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const startTrial = async (): Promise<void> => {
    if (authLoading || profileError || trialUnavailable || loading || trialLoading) return;
    setTrialLoading(true);
    setError('');
    setErrorType('');
    try {
      await api.subscriptions.startTrial();
      const refreshed = await refreshAdminData();
      if (!refreshed) throw new Error('PROFILE_REFRESH_FAILED');
      navigate(getEntitlementRoute(refreshed), { replace: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ أثناء بدء الفترة التجريبية';
      setError(translateError(errorMsg));
      setErrorType(getErrorType(errorMsg));
    } finally {
      setTrialLoading(false);
    }
  };

  const getIcon = (): React.JSX.Element => {
    if (errorType === 'used') return <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />;
    if (errorType === 'expired') return <Clock className="h-4 w-4 shrink-0" aria-hidden />;
    return <XCircle className="h-4 w-4 shrink-0" aria-hidden />;
  };

  if (profileError && !adminData) return <ProfileRetry />;

  if (checkingSubscription || authLoading) {
    return (
      <AuthShell title="جاري التحقق..." subtitle="نتحقق من حالة اشتراكك">
        <div className="flex flex-col items-center gap-3 py-6" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
          <p className="text-label text-fg-muted">جاري التحقق...</p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="تفعيل الاشتراك"
      subtitle="أدخل رمز الاشتراك لتفعيل حسابك والمتابعة لإعداد متجرك"
      icon={<Key size={30} aria-hidden />}
      footer={
        <button
          onClick={() => void logout()}
          className="inline-flex min-h-11 items-center gap-1.5 text-label font-medium text-danger hover:text-danger/80"
        >
          <LogOut size={16} aria-hidden />
          تسجيل الخروج
        </button>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)}>
        {profileError && (
          <div className="mb-4 rounded-md border border-warning/25 bg-warning/5 px-3.5 py-2.5 text-label text-warning">
            <p role="alert">{profileError}</p>
            <Button type="button" variant="ghost" onClick={() => {
              void refreshAdminData().catch(() => { /* Retry remains available. */ });
            }}>إعادة تحميل بيانات الحساب</Button>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className={cn(
              'mb-4 flex items-start justify-start gap-2 rounded-md border px-3.5 py-2.5 text-start text-label',
              errorType === 'used' && 'border-warning/25 bg-warning/5 text-warning',
              errorType === 'expired' && 'border-border bg-muted text-fg-muted',
              errorType === 'trial-used' && 'border-warning/25 bg-warning/5 text-warning',
              errorType === 'active' && 'border-info/25 bg-info/5 text-info',
              (!errorType || errorType === 'invalid' || errorType === 'error') &&
                'border-danger/25 bg-danger/5 text-danger'
            )}
          >
            {getIcon()}
            <span>{error}</span>
          </div>
        )}
        <div className="mb-3">
          <Label htmlFor="sub-code" className="mb-2 block">رمز الاشتراك</Label>
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
            <Key className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <Input
              id="sub-code"
              type="text"
              autoComplete="off"
              placeholder="XXXX-XXXX-XXXX"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              required
              maxLength={20}
              dir="ltr"
              aria-describedby="sub-code-hint"
              className="h-11 flex-1 border-0 bg-transparent p-0 text-center text-lg font-semibold tracking-[2px] focus-visible:ring-0"
            />
          </div>
          <p id="sub-code-hint" className="mt-1.5 text-label text-fg-subtle">ستجد الرمز في رسالة الاشتراك المرسلة إليك</p>
        </div>
        <Button type="submit" disabled={loading || trialLoading} size="lg" className="mt-2 w-full">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <>
              <CheckCircle size={18} aria-hidden />
              تفعيل الاشتراك
            </>
          )}
        </Button>
      </form>

      <div className="mt-6">
        <div className="my-4 flex items-center" aria-hidden>
          <div className="h-px flex-1 bg-border" />
          <span className="px-3 text-xs text-fg-subtle">أو</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        {trialUnavailable ? (
          <div role="note" className="flex items-center justify-start gap-2.5 rounded-md border border-warning/25 bg-warning/5 px-5 py-3.5 text-start text-label font-medium text-warning">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            <span>{entitlement.state === 'paid-expired'
              ? 'انتهى اشتراكك. أدخل رمز اشتراك جديد للمتابعة'
              : 'لقد استخدمت الفترة التجريبية من قبل'}</span>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void startTrial()}
              disabled={trialLoading || loading || !!profileError}
              className="w-full gap-2.5"
            >
              {trialLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : (
                <>
                  <Gift size={18} aria-hidden />
                  ابدأ فترة تجريبية مجانية (7 أيام)
                </>
              )}
            </Button>
            <ul className="mt-4 grid gap-x-5 gap-y-1.5 sm:grid-cols-2" aria-label="مزايا الفترة التجريبية">
              {PLANS.trial.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-label text-fg-muted">
                  <Check size={14} strokeWidth={2} className="mt-1 shrink-0 text-success" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-label font-semibold text-foreground">تحتاج مساعدة؟</p>
        <a
          href={getWhatsAppLink(WHATSAPP_MESSAGES.getSubscription)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-11 items-center gap-2 text-label font-medium text-success underline decoration-success/30 underline-offset-4 hover:decoration-success"
        >
          <MessageCircle size={17} aria-hidden />
          تواصل معنا عبر واتساب
        </a>
      </div>
    </AuthShell>
  );
}

export default VerifyCode;
