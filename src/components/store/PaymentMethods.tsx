/**
 * PaymentMethods — عرض طرق الدفع للعميل (مكوّن مستقل اختياري).
 * أُعيد بناؤه على التوكنات وRadix Dialog، وكل `alert` صار Toast. لم يُعد
 * يستخدمه `Store` بعد أن انتقل اختيار الدفع إلى CheckoutModal، لكنه يبقى
 * متوافقاً مع أي تضمين مستقبلي.
 */

import { useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Copy, CreditCard, Loader2, QrCode, Upload, X, ZoomIn } from 'lucide-react';
import { getProviderById } from '../../config/paymentProviders';
import { usePayment } from '../../contexts/PaymentContext';
import { api } from '../../services/api';
import { compressImage, getSupportedFormats, isValidImageFile } from '../../utils/imageCompressor';
import { parseNumber } from '../../utils/numberUtils';
import type { PaymentMethod } from '../../schemas';
import { storeScopeStyle } from '../../utils/themeUtils';
import { Button, Dialog, DialogContent, Input, Textarea, toast } from '../ui';

interface PaymentMethodsProps {
  storeSlug: string;
}

interface ReceiptData {
  customerName: string;
  customerPhone: string;
  amount: string;
  notes: string;
}

export default function PaymentMethods({ storeSlug }: PaymentMethodsProps): React.JSX.Element | null {
  const { paymentMethods: methods, loading } = usePayment();
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData>({ customerName: '', customerPhone: '', amount: '', notes: '' });
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loading || methods.length === 0) return null;

  const copy = async (text: string, id: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const openReceipt = (method: PaymentMethod): void => {
    setSelectedMethod(method);
    setReceiptData({ customerName: '', customerPhone: '', amount: '', notes: '' });
    setReceiptImage(null);
    setReceiptPreview(null);
    setReceiptOpen(true);
  };

  const chooseReceipt = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isValidImageFile(file)) {
      toast.error('صيغة غير مدعومة', 'استخدم JPG أو PNG أو WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم الصورة كبير', 'الحد الأقصى 10 ميجابايت.');
      return;
    }
    setCompressing(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85, maxSizeMB: 2, outputFormat: 'webp' });
      setReceiptImage(compressed);
      const reader = new FileReader();
      reader.onload = (loadEvent) => setReceiptPreview(loadEvent.target?.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      setReceiptImage(file);
      const reader = new FileReader();
      reader.onload = (loadEvent) => setReceiptPreview(loadEvent.target?.result as string);
      reader.readAsDataURL(file);
    } finally {
      setCompressing(false);
      event.target.value = '';
    }
  };

  const submitReceipt = async (): Promise<void> => {
    if (!receiptImage) {
      toast.warning('اختر صورة الإيصال أولاً');
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(receiptImage);
      });
      await api.publicPayments.submitReceipt(storeSlug, {
        paymentMethodId: selectedMethod?.id ?? '',
        customerName: receiptData.customerName,
        customerPhone: receiptData.customerPhone,
        amount: receiptData.amount ? parseNumber(receiptData.amount) : 0,
        receiptImage: base64,
        notes: receiptData.notes,
        orderId: '',
      });
      toast.success('تم رفع الإيصال', 'سيراجعه صاحب المتجر.');
      setReceiptOpen(false);
    } catch (error) {
      console.error('Error submitting receipt:', error);
      toast.error('تعذّر رفع الإيصال', 'أعد المحاولة.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="my-5 overflow-hidden rounded-md border border-[var(--store-border)]" style={{ backgroundColor: 'var(--store-card-bg)' }}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex min-h-12 w-full items-center gap-2.5 px-5 py-3 text-start max-sm:px-4"
      >
        <CreditCard className="size-4 text-[var(--store-primary-text)]" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 text-label font-medium" style={{ color: 'var(--store-card-text)' }}>طرق الدفع المتاحة</span>
        <span className="text-[11px] font-medium text-[var(--store-card-secondary)]" data-numeric>
          {methods.length}
        </span>
        {expanded ? <ChevronUp className="size-4 text-[var(--store-card-secondary)]" strokeWidth={1.75} aria-hidden /> : <ChevronDown className="size-4 text-[var(--store-card-secondary)]" strokeWidth={1.75} aria-hidden />}
      </button>

      {expanded ? (
        <div className="border-t border-[var(--store-border)]">
          {methods.map((method) => {
            const provider = getProviderById(method.providerId ?? method.provider);
            const config = ((method as Record<string, unknown>).displayInfo ?? method.configDetails ?? {}) as Record<string, string>;
            const display = {
              phone: config['phone'],
              accountName: config['accountName'] ?? method.accountName,
              bankName: config['bankName'] ?? method.bankName,
              accountNumber: config['accountNumber'] ?? method.accountNumber,
              iban: config['iban'] ?? method.iban,
              instructions: config['instructions'] ?? method.receiptInstructions ?? method.instructions,
              qrCodeImage: config['qrCodeImage'] ?? method.qrCodeImage,
            };
            const name = method.label ?? method.name ?? provider?.name ?? 'طريقة دفع';
            const requiresReceipt = method.requireReceipt ?? method.requiresReceipt;

            return (
              <div key={method.id} className="border-b border-[var(--store-border)] px-5 py-4 last:border-0 max-sm:px-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex size-9 items-center justify-center border border-[var(--store-border)] text-[var(--store-primary-text)]" aria-hidden>
                    <CreditCard className="size-4" strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="text-label font-medium" style={{ color: 'var(--store-card-text)' }}>{name}</p>
                    {provider ? <p className="text-[11px] text-[var(--store-card-secondary)]">{provider.type === 'bank' ? 'تحويل بنكي' : 'محفظة إلكترونية'}</p> : null}
                  </div>
                </div>

                <dl className="space-y-1.5 border-y border-[var(--store-border)] py-3 text-label">
                  {display.phone ? <Row label="رقم المحفظة" value={display.phone} id={`${method.id}-phone`} copiedId={copiedId} onCopy={copy} /> : null}
                  {display.accountName ? <Row label="اسم الحساب" value={display.accountName} /> : null}
                  {display.bankName ? <Row label="البنك" value={display.bankName} /> : null}
                  {display.accountNumber ? <Row label="رقم الحساب" value={display.accountNumber} id={`${method.id}-account`} copiedId={copiedId} onCopy={copy} /> : null}
                  {display.iban ? <Row label="IBAN" value={display.iban} id={`${method.id}-iban`} copiedId={copiedId} onCopy={copy} /> : null}
                  {display.instructions ? (
                    <div>
                      <dt className="text-[11px] text-[var(--store-card-secondary)]">تعليمات</dt>
                      <dd className="leading-relaxed text-[var(--store-card-text)]">{display.instructions}</dd>
                    </div>
                  ) : null}
                </dl>

                {display.qrCodeImage ? (
                  <button type="button" onClick={() => setQrImage(display.qrCodeImage ?? null)} className="mt-3 flex min-h-11 items-center gap-2 text-label font-medium text-[var(--store-primary-text)]">
                    <QrCode className="size-4" strokeWidth={1.75} aria-hidden />
                    عرض رمز QR
                    <ZoomIn className="size-3.5" strokeWidth={1.75} aria-hidden />
                  </button>
                ) : null}

                {requiresReceipt ? (
                  <Button type="button" variant="outline" onClick={() => openReceipt(method)} className="mt-3 w-full gap-2 border-[var(--store-border)]">
                    رفع إيصال الدفع
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent size="sm" title="رفع إيصال الدفع" style={storeScopeStyle}>
          <div className="flex flex-col gap-3 p-5">
            <button
              type="button"
              onClick={() => !compressing && fileInputRef.current?.click()}
              className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card p-3 text-fg-muted hover:border-accent"
            >
              {compressing ? (
                <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
              ) : receiptPreview ? (
                <span className="relative w-full">
                  <img src={receiptPreview} alt="إيصال" className="mx-auto max-h-56 rounded-md object-contain" />
                  <span aria-hidden className="absolute end-1 top-1 inline-flex size-11 items-center justify-center rounded-md bg-danger text-white">
                    <X className="size-4" strokeWidth={1.75} />
                  </span>
                </span>
              ) : (
                <>
                  <Upload className="size-6" strokeWidth={1.5} aria-hidden />
                  <span className="text-label">اضغط لاختيار صورة الإيصال</span>
                  <span className="text-[11px] text-fg-subtle">PNG, JPG, WebP, HEIC — حتى 10MB</span>
                </>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept={getSupportedFormats()} onChange={(event) => void chooseReceipt(event)} className="sr-only" />
            <Input placeholder="الاسم (اختياري)" value={receiptData.customerName} onChange={(event) => setReceiptData((current) => ({ ...current, customerName: event.target.value }))} />
            <Input placeholder="رقم الهاتف (اختياري)" dir="ltr" className="text-start" value={receiptData.customerPhone} onChange={(event) => setReceiptData((current) => ({ ...current, customerPhone: event.target.value }))} />
            <Input placeholder="المبلغ المحول (اختياري)" dir="ltr" inputMode="decimal" className="text-start" value={receiptData.amount} onChange={(event) => setReceiptData((current) => ({ ...current, amount: event.target.value }))} />
            <Textarea placeholder="ملاحظات (اختياري)" rows={2} className="resize-none" value={receiptData.notes} onChange={(event) => setReceiptData((current) => ({ ...current, notes: event.target.value }))} />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setReceiptOpen(false)} disabled={uploading} className="flex-1">
                إلغاء
              </Button>
              <Button type="button" onClick={() => void submitReceipt()} disabled={!receiptImage || uploading || compressing} className="flex-1 gap-2">
                {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
                {uploading ? 'جاري الرفع…' : 'رفع'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrImage !== null} onOpenChange={(open) => (!open ? setQrImage(null) : undefined)}>
        <DialogContent size="sm" title="رمز QR للدفع" style={storeScopeStyle}>
          <div className="flex flex-col items-center gap-3 p-5">
            {qrImage ? <img src={qrImage} alt="QR Code" className="max-h-[70dvh] max-w-full rounded-md object-contain" /> : null}
            <p className="text-start text-label text-fg-muted">امسح الرمز بتطبيق المحفظة.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  id,
  copiedId,
  onCopy,
}: {
  label: string;
  value: string;
  id?: string;
  copiedId?: string | null;
  onCopy?: (text: string, id: string) => Promise<void>;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[11px] text-[var(--store-card-secondary)]">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-medium text-[var(--store-card-text)]" dir="ltr">{value}</span>
        {id && onCopy ? (
          <button
            type="button"
            aria-label={`نسخ ${label}`}
            onClick={() => void onCopy(value, id)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-[var(--store-card-secondary)] hover:bg-[var(--store-body-bg)]"
          >
            {copiedId === id ? <Check className="size-4" strokeWidth={2} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
          </button>
        ) : null}
      </dd>
    </div>
  );
}
