/**
 * PaymentSettings — إدارة وسائل الدفع (الخطة السنوية).
 * القسم الضخم (838 سطراً) قُسّم إلى:
 *   - `payments/PaymentMethodCard` لعرض الطريقة.
 *   - `payments/PaymentMethodDialog` لمعالج الإضافة/التعديل.
 *   - هذا الملف للجلب والحذف والتفعيل فقط.
 * كل `alert`/`confirm` استُبدل بـToast و`ConfirmDialog`.
 */

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';
import type { PaymentMethod } from '../../schemas/payment';
import { Button, EmptyState, ErrorState, SkeletonList, toast, useConfirm } from '../ui';
import { PaymentMethodCard } from './payments/PaymentMethodCard';
import { PaymentMethodDialog } from './payments/PaymentMethodDialog';

function PaymentSettings(): React.JSX.Element {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const { ask, dialog } = useConfirm();

  const fetchMethods = useCallback(async (refresh = false): Promise<void> => {
    if (!refresh) setLoading(true);
    if (!refresh) setError(null);
    try {
      const result = await api.payments.getAll();
      const list = Array.isArray(result) ? result : (result as unknown as { data?: unknown }).data;
      setMethods(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      if (refresh) toast.error('تعذّر تحديث طرق الدفع، القائمة السابقة محفوظة');
      else setError('تعذّر جلب طرق الدفع.');
    } finally {
      setLoading(false);
    }
  }, []);

  const closeDialog = useCallback((): void => {
    setDialogOpen(false);
    setEditing(null);
  }, []);
  const refreshMethods = useCallback(() => fetchMethods(true), [fetchMethods]);

  useEffect(() => {
    void fetchMethods();
  }, [fetchMethods]);

  const toggle = async (method: PaymentMethod): Promise<void> => {
    setMethods((current) => current.map((item) => (item.id === method.id ? { ...item, isActive: !item.isActive } : item)));
    try {
      await api.payments.toggle(method.id);
    } catch (err) {
      console.error('Error toggling payment method:', err);
      setMethods((current) => current.map((item) => (item.id === method.id ? { ...item, isActive: method.isActive } : item)));
      toast.error('تعذّر تغيير حالة طريقة الدفع');
    }
  };

  const remove = (method: PaymentMethod): void => {
    const name = method.label ?? method.name ?? 'طريقة الدفع';
    ask({
      title: 'حذف طريقة الدفع',
      description: `سيُحذف «${name}» ولن يظهر للعملاء في صفحة الدفع.`,
      confirmLabel: 'حذف',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await api.payments.delete(method.id);
          setMethods((current) => current.filter((item) => item.id !== method.id));
          toast.success('تم حذف طريقة الدفع');
        } catch (err) {
          console.error('Error deleting payment method:', err);
          toast.error('تعذّر حذف طريقة الدفع');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <SkeletonList count={3} />
        <span className="sr-only" role="status" aria-live="polite">جاري تحميل طرق الدفع…</span>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="تعذّر تحميل طرق الدفع" description="لم نتمكن من الوصول إلى بيانات الدفع. أعد المحاولة." onRetry={() => void fetchMethods()} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {dialog}

      {methods.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="لا توجد طرق دفع"
          description="أضف المحافظ أو الحسابات البنكية التي يقبلها متجرك ليتمكن العملاء من الدفع."
          action={
            <Button
              type="button"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" aria-hidden />
              إضافة طريقة دفع
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-label text-fg-muted" data-numeric>
              {methods.filter((method) => method.isActive).length} مفعّلة من {methods.length}
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="size-4" aria-hidden />
              إضافة
            </Button>
          </div>
          <div className="border-y border-border">
            {methods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method}
                onToggle={() => void toggle(method)}
                onEdit={() => {
                  setEditing(method);
                  setDialogOpen(true);
                }}
                onDelete={() => remove(method)}
              />
            ))}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => void refreshMethods()} className="gap-2 self-start text-fg-muted">
            <RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden />
            تحديث القائمة
          </Button>
        </>
      )}

      <PaymentMethodDialog
        open={dialogOpen}
        editingMethod={editing}
        onClose={closeDialog}
        onSaved={refreshMethods}
      />
    </div>
  );
}

export default PaymentSettings;
