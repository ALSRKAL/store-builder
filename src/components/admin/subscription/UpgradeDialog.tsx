/**
 * UpgradeDialog — نافذة واحدة لكل ما يتعلق بالخطة:
 *   - الترقية وعرض الخطط (كان `PlanBanner.UpgradeModal` + `LimitAlert` + نافذة
 *     ThemeSettings، ثلاث نوافذ منفصلة بتصميم وسمات مختلفة).
 *   - التجديد بكود (كان `RenewalModal`).
 *
 * لماذا الدمج: كل هذه النوافذ تتحدث عن القرار نفسه — "خطتك الحالية وما بعدها".
 * وجودها منفصلة خلق ثلاث تجارب، وثلاث نسخ من قواعد `hideUpgradeUI`، وخللاً
 * فعلياً في `LimitAlert` الذي كان يعرض زر الترقية حتى عندما يكون
 * `hideUpgradeUI = true`.
 *
 * البناء على Radix Dialog يمنحنا focus trap، وإرجاع التركيز، وEscape، وقفل
 * تمرير الصفحة — وكلها كانت مفقودة أو مكتوبة يدوياً في النسخ السابقة.
 */

import { useEffect, useState } from 'react';
import {
  ArrowUp,
  Check,
  CheckCircle2,
  Crown,
  Key,
  Loader2,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { getNextPlan, PLANS, type Plan } from '../../../config/plans';
import {
  getAdminWhatsApp,
  getWhatsAppLink,
  WHATSAPP_MESSAGES,
  loadAdminWhatsApp,
} from '../../../config/contact';
import { api } from '../../../services/api';
import { cn } from '../../../lib/utils';
import { Button, Dialog, DialogContent, Input, Label } from '../../ui';

export type UpgradeReason = 'plans' | 'renew' | 'limit' | 'theme' | 'feature';

export interface RenewalSuccessData {
  newEndDate: string;
  planId: string;
  subscriptionMonths: number;
  daysAdded: number;
}

export interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null | undefined;
  storeName?: string | null | undefined;
  hideUpgradeUI?: boolean;
  reason?: UpgradeReason;
  limitType?: 'products' | 'categories' | 'images';
  onRenewalSuccess?: (data: RenewalSuccessData) => void;
}

const LIMIT_COPY: Record<'products' | 'categories' | 'images', { title: string; body: string }> = {
  products: { title: 'وصلت للحد الأقصى من المنتجات', body: 'احذف منتجاً غير مستخدم أو ارفع خطتك لإضافة المزيد.' },
  categories: { title: 'وصلت للحد الأقصى من التصنيفات', body: 'احذف تصنيفاً فارغاً أو ارفع خطتك لإضافة المزيد.' },
  images: { title: 'وصلت للحد الأقصى من الصور', body: 'الحد الأقصى لصور المنتج في خطتك الحالية. ارفع خطتك لعدد صور أكبر.' },
};

function reasonTitle(reason: UpgradeReason, limitType?: UpgradeDialogProps['limitType']): string {
  if (reason === 'limit' && limitType) return LIMIT_COPY[limitType].title;
  if (reason === 'theme') return 'هذه الميزة تتطلب خطة أعلى';
  if (reason === 'feature') return 'ميزة غير متاحة في خطتك';
  if (reason === 'renew') return 'تجديد الاشتراك';
  return 'الترقية والاشتراك';
}

export function UpgradeDialog({
  open,
  onOpenChange,
  plan,
  storeName,
  hideUpgradeUI = false,
  reason = 'plans',
  limitType,
  onRenewalSuccess,
}: UpgradeDialogProps): React.JSX.Element {
  const [tab, setTab] = useState<'plans' | 'renew'>(reason === 'renew' ? 'renew' : 'plans');

  useEffect(() => {
    if (!open) return;
    setTab(reason === 'renew' ? 'renew' : 'plans');
  }, [open, reason]);

  const plans = Object.values(PLANS).filter((p) => p.id !== 'trial');
  const nextPlan = getNextPlan(plan ?? undefined);
  const currentPlanId = plan?.id ?? 'trial';
  const showPlans = !hideUpgradeUI;

  const description = ((): string => {
    if (reason === 'limit' && limitType) {
      const copy = LIMIT_COPY[limitType];
      return `${copy.body} خطتك الحالية: ${plan?.name ?? 'تجريبي'}.`;
    }
    if (reason === 'theme') return 'الثيم المختار أو تخصيص الألوان متاح في خطة أعلى.';
    if (reason === 'feature') return 'هذه الميزة متاحة في الخطة السنوية.';
    return 'اختر ما يناسب متجرك — تُحدَّد الأسعار عبر واتساب قبل الاشتراك.';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" title={reasonTitle(reason, limitType)} description={description}>
        <div className="px-5 py-4">
          {showPlans ? (
            <div className="mb-5 flex border-b border-border" role="tablist" aria-label="خيارات الاشتراك">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'plans'}
                onClick={() => setTab('plans')}
                className={cn(
                  'relative flex h-11 items-center justify-center gap-2 px-4 text-label transition-colors',
                  tab === 'plans'
                    ? 'font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent'
                    : 'text-fg-muted hover:text-foreground',
                )}
              >
                <ArrowUp className="size-4" strokeWidth={1.75} aria-hidden />
                الترقية
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'renew'}
                onClick={() => setTab('renew')}
                className={cn(
                  'relative flex h-11 items-center justify-center gap-2 px-4 text-label transition-colors',
                  tab === 'renew'
                    ? 'font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent'
                    : 'text-fg-muted hover:text-foreground',
                )}
              >
                <Key className="size-4" strokeWidth={1.75} aria-hidden />
                التجديد بكود
              </button>
            </div>
          ) : null}

          {showPlans && tab === 'plans' ? (
            <div className="grid gap-2 sm:grid-cols-3">
              {plans.map((item) => {
                const isCurrent = item.id === currentPlanId;
                return (
                  <article
                    key={item.id}
                    className={cn(
                      'relative flex flex-col border bg-card p-4',
                      isCurrent ? 'border-accent' : 'border-border',
                    )}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Crown className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                      <h3 className="text-body font-semibold text-foreground">{item.name}</h3>
                      {isCurrent ? (
                        <span className="ms-auto text-[11px] font-medium text-accent">
                          خطتك
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-3 font-display text-h3 font-semibold text-foreground" data-numeric>
                      {item.months} <span className="text-label font-normal text-fg-muted">شهر</span>
                    </p>
                    <ul className="mb-4 flex-1 space-y-1.5">
                      {item.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-label text-fg-muted">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2} aria-hidden />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span className="flex h-11 items-center justify-center border border-border bg-surface-sunken text-label font-medium text-fg-muted">
                        مفعّلة
                      </span>
                    ) : (
                      <a
                        href={getWhatsAppLink(`أريد الاشتراك في خطة ${item.name}`, storeName ?? undefined)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-label font-medium text-primary-foreground transition-colors hover:bg-primary-light"
                      >
                        <MessageCircle className="size-4" strokeWidth={1.75} aria-hidden />
                        اطلب عبر واتساب
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          ) : null}

          {showPlans && tab === 'renew' ? (
            <RenewPanel onSuccess={onRenewalSuccess} onDone={() => onOpenChange(false)} />
          ) : null}

          {!showPlans ? <RenewPanel onSuccess={onRenewalSuccess} onDone={() => onOpenChange(false)} /> : null}

          {showPlans && tab === 'plans' && nextPlan ? (
            <p className="mt-4 flex items-center gap-2 border-t border-border pt-3 text-label text-fg-muted">
              <Zap className="size-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
              الخطوة التالية المقترحة: <strong className="font-semibold text-foreground">{nextPlan.name}</strong>
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RenewPanel({
  onSuccess,
  onDone,
}: {
  onSuccess?: UpgradeDialogProps['onRenewalSuccess'];
  onDone: () => void;
}): React.JSX.Element {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [newEndDate, setNewEndDate] = useState<Date | null>(null);
  const [adminWhatsApp, setAdminWhatsApp] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      await loadAdminWhatsApp();
      setAdminWhatsApp(getAdminWhatsApp());
    };
    void load();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError('أدخل كود التجديد');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.subscriptions.renew(normalized);
      if (result.success) {
        if (result.subscriptionEnd) setNewEndDate(new Date(result.subscriptionEnd));
        setSuccess(true);
        if (onSuccess && result.subscriptionEnd && result.planId && result.months) {
          onSuccess({
            newEndDate: result.subscriptionEnd,
            planId: result.planId,
            subscriptionMonths: result.months,
            daysAdded: result.months * 30,
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء تجديد الاشتراك';
      if (message.includes('Invalid') || message.includes('غير موجود')) setError('الكود غير صالح');
      else if (message.includes('used') || message.includes('مستخدم')) setError('هذا الكود مستخدم مسبقاً');
      else if (message.includes('expired') || message.includes('انتهى')) setError('انتهت صلاحية هذا الكود');
      else setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-start py-4">
        <CheckCircle2 className="mb-3 size-6 text-success" strokeWidth={1.75} aria-hidden />
        <h3 className="font-display text-h3 font-semibold text-foreground">تم التجديد بنجاح</h3>
        <p className="mt-1 text-body text-fg-muted">اشتراكك سارٍ حتى:</p>
        <p className="mt-2 text-body font-semibold text-success" data-numeric>
          {newEndDate?.toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
        <Button type="button" className="mt-5 w-full" onClick={onDone}>
          تم
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto flex max-w-md flex-col gap-4">
      <div>
        <Label htmlFor="renew-code" className="mb-2 block">
          كود التجديد
        </Label>
        <Input
          id="renew-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError('');
          }}
          placeholder="XXXX-XXXX-XXXX"
          maxLength={24}
          dir="ltr"
          autoComplete="off"
          disabled={loading}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'renew-code-error' : 'renew-code-hint'}
          className="text-center font-semibold tracking-[0.18em]"
        />
        <p id="renew-code-hint" className="mt-1.5 text-label text-fg-muted">
          ستجد الكود في رسالة الاشتراك المرسلة إليك.
        </p>
        {error ? (
          <p id="renew-code-error" role="alert" className="mt-2 text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={loading || !code.trim()} className="w-full">
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Key className="size-4" aria-hidden />}
        {loading ? 'جاري التحقق…' : 'تجديد الاشتراك'}
      </Button>
      {adminWhatsApp ? (
        <p className="text-center text-label text-fg-muted">
          ليس لديك كود؟{' '}
          <a
            href={`https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(WHATSAPP_MESSAGES.getSubscription)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:text-foreground hover:underline"
          >
            تواصل معنا
          </a>
        </p>
      ) : null}
    </form>
  );
}
