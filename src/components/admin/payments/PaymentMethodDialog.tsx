import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, Check, ChevronLeft, Loader2, QrCode, Upload, X } from 'lucide-react';
import {
  SUPPORTED_COUNTRIES,
  getProvidersByCountry,
  getProviderById,
  getProviderCountry,
  validateProviderConfig,
  type Country,
  type PaymentProvider,
} from '../../../config/paymentProviders';
import { api } from '../../../services/api';
import type { PaymentMethod } from '../../../schemas/payment';
import {
  Button,
  Dialog,
  DialogContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
} from '../../ui';
import { compressImage, isValidImageFile, getSupportedFormats } from '../../../utils/imageCompressor';
import { PaymentProviderIcon, providerTypeLabel } from './PaymentProviderIcon';

type FormData = Record<string, string>;

interface PaymentMethodDialogProps {
  open: boolean;
  editingMethod: PaymentMethod | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function PaymentMethodDialog({ open, editingMethod, onClose, onSaved }: PaymentMethodDialogProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [country, setCountry] = useState<Country | null>(null);
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [form, setForm] = useState<FormData>({});
  const [customLabel, setCustomLabel] = useState('');
  const [requireReceipt, setRequireReceipt] = useState(false);
  const [receiptInstructions, setReceiptInstructions] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrUploading, setQrUploading] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const session = useRef<string | null>(null);
  const saveLock = useRef(false);
  const qrGeneration = useRef(0);
  const sessionMethod = useRef<PaymentMethod | null>(null);
  const callbacks = useRef({ onClose, onSaved });
  useEffect(() => { callbacks.current = { onClose, onSaved }; }, [onClose, onSaved]);
  useEffect(() => () => { qrGeneration.current += 1; }, []);

  useEffect(() => {
    if (!open) {
      session.current = null;
      qrGeneration.current += 1;
      return;
    }
    const key = editingMethod?.id ?? 'new';
    // Auth polling replaces callbacks and method objects; that is not a new editing session.
    if (session.current === key) return;
    session.current = key;
    sessionMethod.current = editingMethod;
    qrGeneration.current += 1;
    setQrUploading(false);
    setErrors([]);
    if (editingMethod) {
      const providerId = editingMethod.providerId ?? editingMethod.provider;
      const matchedProvider = providerId ? getProviderById(providerId) : null;
      if (!matchedProvider) {
        toast.error('تعذّر التعرف على مزوّد طريقة الدفع');
        callbacks.current.onClose();
        return;
      }
      const matchedCountry = getProviderCountry(matchedProvider, editingMethod.countryCode);
      const config = Object.fromEntries(Object.entries(editingMethod.configDetails ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
      setProvider(matchedProvider);
      setCountry(matchedCountry ?? null);
      setForm({
        accountNumber: config.accountNumber ?? editingMethod.accountNumber ?? '',
        accountName: config.accountName ?? editingMethod.accountName ?? '',
        bankName: config.bankName ?? editingMethod.bankName ?? '',
        iban: config.iban ?? editingMethod.iban ?? '',
        walletName: config.walletName ?? editingMethod.walletName ?? '',
        phone: config.phone ?? '',
        instructions: config.instructions ?? '',
      });
      setCustomLabel(editingMethod.label ?? editingMethod.name ?? '');
      setRequireReceipt(matchedProvider.type !== 'cod' && (editingMethod.requireReceipt ?? editingMethod.requiresReceipt ?? false));
      setReceiptInstructions(matchedProvider.type !== 'cod' ? editingMethod.receiptInstructions ?? editingMethod.instructions ?? '' : '');
      setQrImage(['qr', 'wallet'].includes(matchedProvider.type) ? config.qrCodeImage ?? editingMethod.qrCodeImage ?? null : null);
      setStep(3);
      return;
    }
    setStep(1);
    setCountry(null);
    setProvider(null);
    setForm({});
    setCustomLabel('');
    setRequireReceipt(false);
    setReceiptInstructions('');
    setQrImage(null);
  }, [open, editingMethod, onClose]);

  const providers = country ? getProvidersByCountry(country.code) : [];

  const selectProvider = (next: PaymentProvider): void => {
    qrGeneration.current += 1;
    setProvider(next);
    setForm(Object.fromEntries(next.fields.map((field) => [field.key, ''])));
    setCustomLabel('');
    setRequireReceipt(false);
    setReceiptInstructions('');
    setQrImage(null);
    setQrUploading(false);
    setErrors([]);
    setStep(3);
  };

  const changeField = (key: string, value: string): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => current.filter((message) => !message.includes(key)));
  };

  const uploadQr = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const generation = ++qrGeneration.current;
    if (!isValidImageFile(file)) {
      toast.error('صيغة غير مدعومة', 'استخدم JPG أو PNG أو WebP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير', 'الحد الأقصى 5 ميجابايت.');
      return;
    }
    setQrUploading(true);
    try {
      const compressed = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.9,
        maxSizeMB: 0.5,
        outputFormat: 'webp',
        preserveTransparency: true,
      });
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (generation === qrGeneration.current) setQrImage(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (generation === qrGeneration.current) setQrImage(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      if (generation === qrGeneration.current) setQrUploading(false);
    }
  };

  const save = async (): Promise<void> => {
    if (saveLock.current || qrUploading || !provider || !country) return;
    const validation = validateProviderConfig(provider.id, form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    if (provider.type === 'qr' && !qrImage) {
      setErrors(['يرجى رفع صورة QR Code']);
      return;
    }
    saveLock.current = true;
    setSaving(true);
    const method = sessionMethod.current;
    try {
      const configDetails: Record<string, string | undefined> = Object.fromEntries(provider.fields.map((field) => [field.key, form[field.key]?.trim()]));
      if (provider.type === 'qr' || provider.type === 'wallet') configDetails['qrCodeImage'] = qrImage || undefined;
      Object.keys(configDetails).forEach((key) => {
        if (!configDetails[key]) delete configDetails[key];
      });
      const payload = {
        countryCode: country.code,
        label: customLabel.trim() || provider.name,
        name: customLabel.trim() || provider.name,
        configDetails,
        accountNumber: form['accountNumber'],
        accountName: form['accountName'],
        bankName: form['bankName'],
        iban: form['iban'],
        walletName: form['walletName'],
        qrCodeImage: qrImage || undefined,
        requireReceipt: provider.type !== 'cod' && requireReceipt,
        requiresReceipt: provider.type !== 'cod' && requireReceipt,
        // An empty string clears previous instructions on the worker.
        receiptInstructions: provider.type !== 'cod' && requireReceipt ? receiptInstructions.trim() : '',
        instructions: provider.type !== 'cod' && requireReceipt ? receiptInstructions.trim() : '',
      };
      if (method) {
        await api.payments.update(method.id, payload);
      } else {
        await api.payments.create({
          ...payload,
          providerId: provider.id,
          provider: provider.id,
          countryCode: country.code,
          isActive: true,
          order: 0,
        });
      }
      toast.success(method ? 'تم تحديث طريقة الدفع' : 'تمت إضافة طريقة الدفع');
      callbacks.current.onClose();
      // A failed list refresh must not present a successful create as failed (and allow duplicates).
      try { await callbacks.current.onSaved(); } catch { toast.error('تم الحفظ، لكن تعذّر تحديث القائمة'); }
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast.error('تعذّر حفظ طريقة الدفع');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const title = editingMethod
    ? 'تعديل طريقة الدفع'
    : step === 1
      ? 'اختر الدولة'
      : step === 2
        ? 'اختر طريقة الدفع'
        : 'إعداد طريقة الدفع';

  return (
    <Dialog open={open} onOpenChange={(next) => (!saving && !next ? onClose() : undefined)}>
      <DialogContent
        size="md"
        title={title}
        description={step === 1 ? 'تعتمد طرق الدفع المتاحة على دولة المتجر.' : undefined}
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
      >
        <div className="p-4">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
              {SUPPORTED_COUNTRIES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => {
                    setCountry(item);
                    setStep(2);
                  }}
                  className="flex min-h-12 items-center justify-between gap-2 bg-card px-3.5 text-start text-label font-medium text-foreground transition-colors hover:bg-muted hover:text-accent"
                >
                  {item.name}
                  <ChevronLeft className="size-4 text-fg-subtle" strokeWidth={1.75} aria-hidden />
                </button>
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 border-y border-border py-2">
                <span className="text-label font-medium text-foreground">{country?.name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
                  تغيير
                </Button>
              </div>
              {providers.length === 0 ? (
                <p className="py-8 text-start text-label text-fg-muted">لا توجد طرق دفع متاحة لهذه الدولة حالياً.</p>
              ) : (
                <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
                  {providers.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectProvider(item)}
                      className="flex min-h-16 items-center gap-3 bg-card p-3 text-start transition-colors hover:bg-muted"
                    >
                      <PaymentProviderIcon type={item.type} />
                      <span className="min-w-0">
                        <span className="block truncate text-label font-medium text-foreground">{item.name}</span>
                        <span className="block text-[11px] text-fg-muted">{providerTypeLabel(item.type)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {step === 3 && provider ? (
            <div className="flex flex-col gap-4">
              {!editingMethod ? (
                <div className="flex items-center justify-between gap-2 border-y border-border py-2">
                  <div className="flex items-center gap-2">
                    <PaymentProviderIcon type={provider.type} />
                    <span className="text-label font-medium text-foreground">{provider.name}</span>
                    <span className="text-[11px] text-fg-muted">{country?.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStep(2)}>
                    تغيير
                  </Button>
                </div>
              ) : null}

              <div>
                <Label htmlFor="pm-label" className="mb-1.5 block">تسمية مخصصة (اختياري)</Label>
                <Input
                  id="pm-label"
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  placeholder={`مثال: حساب ${provider.name} الرئيسي`}
                />
              </div>

              {provider.fields.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={`pm-${field.key}`} className="mb-1.5 block">
                    {field.label}
                    {field.required ? <span className="ms-1 text-danger" aria-hidden>*</span> : null}
                  </Label>
                  {field.type === 'select' ? (
                    <Select value={form[field.key] ?? ''} onValueChange={(value) => changeField(field.key, value)}>
                      <SelectTrigger id={`pm-${field.key}`} aria-label={field.label}>
                        <SelectValue placeholder="اختر…" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={`pm-${field.key}`}
                      value={form[field.key] ?? ''}
                      onChange={(event) => changeField(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={`pm-${field.key}`}
                      type={field.type}
                      value={form[field.key] ?? ''}
                      onChange={(event) => changeField(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      dir={field.type === 'tel' ? 'ltr' : undefined}
                      className={field.type === 'tel' ? 'text-start tabular-nums' : undefined}
                    />
                  )}
                </div>
              ))}

              {provider.type === 'qr' || provider.type === 'wallet' ? (
                <div className="border-y border-border py-3">
                  <div className="mb-2 flex items-center gap-2">
                    <QrCode className="size-4 text-fg-muted" strokeWidth={1.75} aria-hidden />
                    <p className="text-label font-medium text-foreground">
                      صورة QR Code {provider.type === 'wallet' ? '(اختياري)' : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !qrUploading && qrInputRef.current?.click()}
                    className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface p-3 text-center transition-colors hover:border-accent"
                  >
                    {qrUploading ? (
                      <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
                    ) : qrImage ? (
                      <span className="relative block w-full">
                        <img src={qrImage} alt="QR Code" className="mx-auto max-h-40 rounded-md object-contain" />
                        <span className="absolute end-1 top-1 inline-flex size-11 items-center justify-center rounded-md bg-danger text-white">
                          <X className="size-4" strokeWidth={1.75} aria-hidden />
                        </span>
                      </span>
                    ) : (
                      <>
                        <Upload className="size-6 text-fg-subtle" strokeWidth={1.75} aria-hidden />
                        <span className="text-label text-fg-muted">اضغط لرفع صورة QR</span>
                        <span className="text-[11px] text-fg-subtle">PNG, JPG, WebP — حتى 5MB</span>
                      </>
                    )}
                  </button>
                  <input ref={qrInputRef} type="file" accept={getSupportedFormats()} onChange={(event) => void uploadQr(event)} className="sr-only" />
                  {qrImage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 text-danger hover:bg-danger/5 hover:text-danger"
                      onClick={() => { qrGeneration.current += 1; setQrImage(null); setQrUploading(false); }}
                    >
                      إزالة الصورة
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {!country ? (
                <div>
                  <Label htmlFor="pm-country">دولة طريقة الدفع</Label>
                  <Select value="" onValueChange={(code) => setCountry(SUPPORTED_COUNTRIES.find((item) => item.code === code) ?? null)}>
                    <SelectTrigger id="pm-country"><SelectValue placeholder="اختر الدولة لتأكيد طريقة الدفع" /></SelectTrigger>
                    <SelectContent>{SUPPORTED_COUNTRIES.map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : null}
              {provider.type !== 'cod' ? <div className="flex items-center justify-between gap-3 border-y border-border py-3">
                <div>
                  <p className="text-label font-medium text-foreground">طلب إيصال الدفع</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">يُطلب من العميل رفع صورة إيصال التحويل.</p>
                </div>
                <Switch checked={requireReceipt} onCheckedChange={setRequireReceipt} aria-label="طلب إيصال الدفع" />
              </div> : <p className="text-label text-fg-muted">الدفع عند الاستلام لا يتطلب إيصال تحويل.</p>}

              {requireReceipt ? (
                <div>
                  <Label htmlFor="pm-receipt-instructions" className="mb-1.5 block">تعليمات للعميل (اختياري)</Label>
                  <Textarea
                    id="pm-receipt-instructions"
                    value={receiptInstructions}
                    onChange={(event) => setReceiptInstructions(event.target.value)}
                    placeholder="مثال: ارفع صورة واضحة تظهر فيها تفاصيل التحويل."
                    rows={2}
                  />
                </div>
              ) : null}

              {errors.length > 0 ? (
                <ul role="alert" className="space-y-1 rounded-md border border-danger/25 bg-danger/5 p-3">
                  {errors.map((error) => (
                    <li key={error} className="flex items-start gap-2 text-xs text-danger">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      {error}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>

        {step === 3 ? (
          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-surface px-4 py-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="sm:w-28">
              إلغاء
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || qrUploading || !country} className="flex-1 gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              {saving ? 'جاري الحفظ…' : editingMethod ? 'حفظ التعديلات' : 'إضافة طريقة الدفع'}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
