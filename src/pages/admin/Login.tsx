/**
 * Login Page — unified auth shell, labelled fields, honest states.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Button, Input, Label } from '../../components/ui';
import AuthShell from '../../components/auth/AuthShell';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowRight, Loader2 } from 'lucide-react';
import { getEntitlementRoute } from '../../lib/authEntitlement';
import ProfileRetry from '../../components/auth/ProfileRetry';

interface FirebaseError extends Error {
  code?: string;
}

function Login(): React.JSX.Element {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    login,
    register,
    loginWithGoogle,
    resetPassword,
    user,
    adminData,
    loading: authLoading,
    profileError,
  } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user && (!profileError || adminData)) {
      navigate(getEntitlementRoute(adminData), { replace: true });
    }
  }, [user, adminData, authLoading, profileError, navigate]);

  if (authLoading) {
    return (
      <AuthShell title="جاري التحقق..." subtitle="لحظة واحدة">
        <div className="flex flex-col items-center gap-3 py-6" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
          <p className="text-label text-fg-muted">جاري التحقق من الجلسة...</p>
        </div>
      </AuthShell>
    );
  }

  if (user && profileError && !adminData) return <ProfileRetry />;

  const getErrorMessage = (err: FirebaseError): string => {
    switch (err.code) {
      case 'auth/user-not-found':
        return 'البريد الإلكتروني غير مسجل';
      case 'auth/wrong-password':
        return 'كلمة المرور غير صحيحة';
      case 'auth/invalid-credential':
        return 'البريد أو كلمة المرور غير صحيحة';
      case 'auth/email-already-in-use':
        return 'البريد الإلكتروني مستخدم بالفعل';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)';
      case 'auth/popup-closed-by-user':
        return 'تم إغلاق نافذة تسجيل الدخول';
      case 'auth/popup-blocked':
        return 'تم حظر النافذة المنبثقة، يرجى السماح بها';
      case 'auth/invalid-email':
        return 'البريد الإلكتروني غير صالح';
      default:
        return 'حدث خطأ، حاول مرة أخرى';
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(getErrorMessage(err as FirebaseError));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setLoading(false);
      setError(getErrorMessage(err as FirebaseError));
    }
  };

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!email) {
      setError('أدخل البريد الإلكتروني أولاً');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني');
    } catch (err) {
      setError(getErrorMessage(err as FirebaseError));
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <AuthShell
        title="نسيت كلمة المرور"
        subtitle="أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
        footer={
          <button
            onClick={() => {
              setShowForgotPassword(false);
              setError('');
              setSuccess('');
            }}
            className="inline-flex min-h-11 items-center gap-1.5 text-label font-medium text-accent hover:text-foreground"
          >
            <ArrowRight size={16} aria-hidden />
            العودة لتسجيل الدخول
          </button>
        }
      >
        <form onSubmit={(e) => void handleForgotPassword(e)} noValidate={false}>
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-start text-label text-danger">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="mb-4 rounded-md border border-success/25 bg-success/5 px-3.5 py-2.5 text-start text-label text-success">
              {success}
            </div>
          )}
          <div className="mb-3">
            <Label htmlFor="forgot-email" className="mb-2 block">البريد الإلكتروني</Label>
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
              <Mail className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                className="h-11 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} size="lg" className="mt-2 w-full">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'إرسال رابط إعادة التعيين'}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
      subtitle={isLogin ? 'مرحباً بعودتك! أدِر متجرك من مكان واحد' : 'أنشئ حسابك وابدأ إعداد متجرك في دقائق'}
      footer={
        <p className="text-label text-fg-muted">
          {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="min-h-11 px-1 text-label font-medium text-accent hover:text-foreground"
          >
            {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </p>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)}>
        {error && (
          <div role="alert" className="mb-4 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-start text-label text-danger">
            {error}
          </div>
        )}
        <div className="mb-3">
          <Label htmlFor="auth-email" className="mb-2 block">البريد الإلكتروني</Label>
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
            <Mail className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="h-11 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="mb-2">
          <Label htmlFor="auth-password" className="mb-2 block">كلمة المرور</Label>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface pe-1 ps-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
            <Lock className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <Input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="on"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-muted hover:text-foreground"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" aria-hidden /> : <Eye className="h-[18px] w-[18px]" aria-hidden />}
            </button>
          </div>
        </div>
        {isLogin && (
          <div className="mb-3 text-start">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="min-h-11 text-label font-medium text-accent hover:text-foreground"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        )}
        <Button type="submit" disabled={loading} size="lg" className="mt-2 w-full">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : isLogin ? (
            <>
              <LogIn size={18} aria-hidden />
              تسجيل الدخول
            </>
          ) : (
            <>
              <UserPlus size={18} aria-hidden />
              إنشاء حساب
            </>
          )}
        </Button>
      </form>
      <div className="my-4 flex items-center" aria-hidden>
        <div className="h-px flex-1 bg-border" />
        <span className="px-3 text-xs text-fg-subtle">أو</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={() => void handleGoogleLogin()}
        disabled={loading}
        className={cn(
          'flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-surface text-label font-medium text-foreground',
          'transition-colors hover:border-border-strong hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70'
        )}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        المتابعة مع جوجل
      </button>
    </AuthShell>
  );
}

export default Login;
