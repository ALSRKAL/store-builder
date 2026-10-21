/**
 * CheckoutModal — إتمام الطلب.
 *
 * إصلاحات المرحلة 4:
 *   - نافذة Radix Dialog (حصر تركيز، Escape، قفل تمرير) ودرج سفلي على الجوال.
 *   - ملخص مراجعة واضح قبل الدفع: المنتجات والكميات والمجموع.
 *   - هوية المتجر (`--store-primary`) بدل `indigo-*` الثابت.
 *   - حماية من الإرسال المزدوج، وإعادة محاولة دون فقدان البيانات.
 *   - تطبيع رقم الهاتف (يقبل + والمسافات والشرطات) قبل الإرسال.
 *   - `localStorage` بمفتاح يشمل المتجر: `checkout_customer_data_<store>`.
 *   - السلة تُفرَّغ في الأب فقط بعد نجاح الطلب.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  FileText,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  QrCode,
  ShoppingBag,
  Upload,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { usePayment } from '../../contexts/PaymentContext';
import { getProviderById } from '../../config/paymentProviders';
import { api } from '../../services/api';
import { compressImage, getSupportedFormats, isValidImageFile } from '../../utils/imageCompressor';
import { toEnglishNumbers } from '../../utils/numberUtils';
import type { CartItem } from '../../contexts/CartContext';
import type { PaymentMethod as SchemaPaymentMethod } from '../../schemas/payment';
import { cn } from '../../lib/utils';
import { storeScopeStyle } from '../../utils/themeUtils';
import {
  Button,
  Dialog,
  DialogContent,
  Input,
  Label,
  Spinner,
  Textarea,
  toast,
} from '../ui';

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  selectedColor?: string | null | undefined;
  selectedSize?: string | null | undefined;
  image?: string | undefined;
}

interface OrderResult {
  orderNumber: string;
  message: string;
  whatsappLink?: string | undefined;
}

interface CustomerData {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[] | CheckoutItem[];
  total: number;
  /** يُستدعى فور نجاح إنشاء الطلب، قبل أن يغلق العميل شاشة التأكيد. */
  onOrderCreated?: () => void;
  onSuccess?: (result: OrderResult) => void;
}

const STORAGE_PREFIX = 'checkout_customer_data';

function readSavedCustomer(storeKey: string): CustomerData {
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}_${storeKey}`);
    if (!saved) return { name: '', phone: '', address: '', notes: '' };
    const parsed = JSON.parse(saved) as Partial<CustomerData>;
    return { name: parsed.name ?? '', phone: parsed.phone ?? '', address: parsed.address ?? '', notes: '' };
  } catch {
    return { name: '', phone: '', address: '', notes: '' };
  }
}

/** يقبل + والمسافات والشرطات والأقواس، ويعيد الرقم بصيغة موحّدة. */
export function normalizePhone(value: string): string | null {
  const cleaned = toEnglishNumbers(value).replace(/[\s\-()]/g, '');
  if (!/^\+?\d{9,15}$/.test(cleaned)) return null;
  return cleaned;
}

function itemImage(item: CartItem | CheckoutItem): string | undefined {
  if ('image' in item && item.image) return item.image;
  if ('images' in item && Array.isArray(item.images)) return item.images[0];
  return undefined;
}

export default function CheckoutModal({ isOpen, onClose, items, total, onOrderCreated, onSuccess }: CheckoutModalProps): React.JSX.Element | null {
  const { store, products, formatPrice } = useStore();
  const { paymentMethods, loading: paymentsLoading, isAnnualPlan } = usePayment();
  const paymentsPending = isAnnualPlan && paymentsLoading;
  const storeKey = store?.slug ?? store?.id ?? 'store';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPayment, setSelectedPayment] = useState<SchemaPaymentMethod | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [receiptImage, setReceiptImage] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customer, setCustomer] = useState<CustomerData>(() => readSavedCustomer(storeKey));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  useEffect(() => {
    setCustomer(readSavedCustomer(storeKey));
  }, [storeKey]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
  }, [isOpen]);

  const requiresReceipt = (method: SchemaPaymentMethod | null): boolean =>
    Boolean(method?.requireReceipt || method?.requiresReceipt);

  const totalSteps = requiresReceipt(selectedPayment) ? 3 : 2;
  const itemsCount = items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

  // منتجات نفدت بعد إضافتها للسلة (أو حُذفت): نمنع إتمام الطلب بدل إرسال طلب غير صالح.
  const unavailableItems = useMemo(() => {
    if (products.length === 0) return [];
    return items.filter((item) => {
      const product = products.find((entry) => entry.id === item.id);
      return !product || product.inStock === false;
    });
  }, [items, products]);

  const copy = async (text: string, field: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const selectReceipt = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    // نصفّر الحقل دائماً حتى يمكن اختيار الملف نفسه مجدداً بعد خطأ.
    event.target.value = '';
    if (!file) return;
    if (!isValidImageFile(file)) {
      setError('صيغة الملف غير مدعومة. استخدم JPG أو PNG أو WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً (الحد الأقصى 10MB).');
      return;
    }
    setCompressing(true);
    setError(null);
    try {
      const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85, outputFormat: 'webp' });
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
    }
  };

  const validateCustomer = (): boolean => {
    if (customer.name.trim().length < 2) {
      setError('يرجى إدخال الاسم الكامل (حرفان على الأقل)');
      return false;
    }
    const phone = normalizePhone(customer.phone);
    if (!phone) {
      setError('رقم الهاتف غير صحيح. أدخل من 9 إلى 15 رقماً، ويمكن استخدام + والمسافات.');
      return false;
    }
    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}_${storeKey}`,
        JSON.stringify({ name: customer.name.trim(), phone, address: customer.address.trim() }),
      );
    } catch {
      // التخزين المحلي قد يكون معطلاً؛ لا نمنع الطلب بسببه.
    }
    setError(null);
    return true;
  };

  const submitOrder = async (): Promise<void> => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let receiptBase64: string | undefined;
      if (receiptImage) {
        receiptBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = () => reject(new Error('تعذّر قراءة ملف الإيصال. اختر الصورة مرة أخرى.'));
          reader.readAsDataURL(receiptImage);
        });
      }

      const phone = normalizePhone(customer.phone) ?? customer.phone.trim();
      const result = await api.publicOrders.create(store?.slug ?? store?.id ?? '', {
        customerName: customer.name.trim(),
        customerPhone: phone,
        customerAddress: customer.address.trim() || undefined,
        customerNotes: customer.notes.trim() || undefined,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity ?? 1,
          selectedColor: ('selectedColor' in item ? item.selectedColor : undefined) || undefined,
          selectedSize: ('selectedSize' in item ? item.selectedSize : undefined) || undefined,
          image: itemImage(item) || undefined,
        })),
        paymentMethodId: selectedPayment?.id || '',
        receiptImage: receiptBase64 || undefined,
      });

      const order: OrderResult = {
        orderNumber: result.orderNumber,
        message: 'تم إرسال طلبك بنجاح. سنتواصل معك قريباً.',
        whatsappLink: store?.whatsapp
          ? `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، لقد أرسلت طلباً برقم ${result.orderNumber}`)}`
          : undefined,
      };
      setOrderResult(order);
      setStep(4);
      // أبلغ الأب فوراً حتى يفرّغ السلة ولا يستطيع العميل إعادة إرسال الطلب.
      onOrderCreated?.();
    } catch (err) {
      console.error('Error submitting order:', err);
      setError(err instanceof Error ? err.message : 'تعذّر إرسال الطلب. بياناتك محفوظة — أعد المحاولة.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = (): void => {
    setError(null);
    if (step === 1) {
      if (!selectedPayment) {
        setError('يرجى اختيار طريقة الدفع');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateCustomer()) return;
      if (requiresReceipt(selectedPayment)) setStep(3);
      else void submitOrder();
      return;
    }
    if (step === 3) {
      if (!receiptImage) {
        setError('يرجى رفع صورة إيصال الدفع');
        return;
      }
      void submitOrder();
    }
  };

  const close = (): void => {
    if (submitting) return;
    const confirmedOrder = orderResult;
    if (confirmedOrder) {
      setStep(1);
      setSelectedPayment(null);
      setReceiptImage(null);
      setReceiptPreview(null);
      setOrderResult(null);
      setCustomer((current) => ({ ...current, notes: '' }));
    }
    setError(null);
    // إشعار الأب بالنجاح عند إغلاق شاشة التأكيد فقط، فتُفرَّغ السلة بعد أن
    // يرى العميل رقم طلبه — لا قبل ذلك.
    if (confirmedOrder) onSuccess?.(confirmedOrder);
    else onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open onOpenChange={(open) => (!open ? close() : undefined)}>
      <DialogContent
        size="lg"
        title={
          step === 1 ? 'اختيار طريقة الدفع' : step === 2 ? 'بيانات التوصيل والمراجعة' : step === 3 ? 'رفع إيصال الدفع' : 'تم إرسال الطلب'
        }
        description={step < 4 ? 'خطوات واضحة، ويمكنك الرجوع قبل الإرسال.' : undefined}
        onEscapeKeyDown={(event) => {
          if (submitting) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (submitting) event.preventDefault();
        }}
        className="max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[94dvh] max-sm:w-full max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:pb-safe"
        style={storeScopeStyle}
      >
        <div className="flex flex-col">
          {step < 4 ? (
            <div className="flex items-center justify-start gap-2 border-b border-border bg-surface-sunken px-5 py-3" aria-hidden>
              {[1, 2, 3].slice(0, totalSteps).map((number) => (
                <div key={number} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center border text-[11px] font-medium transition-colors',
                      step > number
                        ? 'border-transparent bg-success text-success-foreground'
                        : step === number
                          ? 'border-transparent text-[var(--store-button-text)]'
                          : 'border-border bg-card text-fg-muted',
                    )}
                    style={step === number ? { backgroundColor: 'var(--store-primary)' } : undefined}
                    data-numeric
                  >
                    {step > number ? <Check className="size-3" strokeWidth={2} /> : number}
                  </span>
                  {number < totalSteps ? <span className={cn('h-px w-8', step > number ? 'bg-success' : 'bg-border')} /> : null}
                </div>
              ))}
            </div>
          ) : null}

          <div className="p-5">
            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <div className="border-y border-border py-3">
                  <p className="text-label text-fg-muted">المبلغ المطلوب</p>
                  <p className="mt-1 font-display text-h2 font-semibold text-foreground" data-numeric>{formatPrice(total)}</p>
                  <p className="mt-0.5 text-[11px] text-fg-muted" data-numeric>{itemsCount} منتج</p>
                </div>

                {unavailableItems.length > 0 ? (
                  <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/5 p-3 text-xs text-[var(--store-danger-text)]">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                    <span>
                      نفدت كمية بعض المنتجات: {unavailableItems.map((item) => item.name).join('، ')}. عُد إلى السلة وأزل هذه المنتجات للمتابعة.
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  {paymentsPending ? (
                    <div className="flex items-center justify-center gap-2 border-y border-border py-8 text-label text-fg-muted" role="status" aria-live="polite">
                      <Spinner size="sm" />
                      جاري تحميل طرق الدفع…
                    </div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="border-y border-border py-8">
                      <CreditCard className="size-5 text-fg-subtle" strokeWidth={1.75} aria-hidden />
                      <p className="mt-2 text-body font-semibold text-foreground">لا توجد طرق دفع مفعّلة</p>
                      <p className="mt-1 max-w-[46ch] text-label leading-relaxed text-fg-muted">
                        لم يضف المتجر طرق دفع بعد. يمكنك العودة إلى السلة وإرسال الطلب عبر واتساب.
                      </p>
                      <Button type="button" variant="outline" onClick={onClose} className="mt-4">
                        العودة إلى السلة
                      </Button>
                    </div>
                  ) : null}
                  {paymentMethods.map((method) => {
                    const provider = getProviderById(method.providerId ?? method.provider);
                    const selected = selectedPayment?.id === method.id;
                    const config = ((method as Record<string, unknown>).displayInfo ?? method.configDetails ?? {}) as Record<string, string>;
                    const display = {
                      phone: config['phone'],
                      accountNumber: config['accountNumber'] ?? method.accountNumber,
                      accountName: config['accountName'] ?? method.accountName,
                      bankName: config['bankName'] ?? method.bankName,
                      iban: config['iban'] ?? method.iban,
                      qrCodeImage: config['qrCodeImage'] ?? method.qrCodeImage,
                      instructions:
                        config['instructions'] ??
                        method.receiptInstructions ??
                        method.instructions ??
                        undefined,
                    };
                    return (
                      <div key={method.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPayment(method)}
                          aria-pressed={selected}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md border p-3 text-start transition-colors',
                            selected ? 'border-[var(--store-accent)]' : 'border-border bg-card hover:border-border-strong',
                          )}
                        >
                          <span
                            aria-hidden
                            className="inline-flex size-9 shrink-0 items-center justify-center border border-border text-fg-muted"
                          >
                            <Landmark className="size-4" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1 text-label font-medium text-foreground">
                            {method.label ?? method.name ?? provider?.name ?? 'طريقة دفع'}
                          </span>
                          <span
                            aria-hidden
                            className={cn(
                              'inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
                              selected ? 'border-transparent text-[var(--store-button-text)]' : 'border-border bg-card',
                            )}
                            style={selected ? { backgroundColor: 'var(--store-primary)' } : undefined}
                          >
                            {selected ? <Check className="size-3" strokeWidth={2} /> : null}
                          </span>
                        </button>

                        {selected ? (
                          <div className="mt-2 space-y-3 border-y border-border py-3">
                            {display.phone || display.accountNumber ? (
                              <PaymentRow
                                icon={Phone}
                                label="رقم التحويل"
                                value={display.phone ?? display.accountNumber ?? ''}
                                copied={copiedField === 'phone'}
                                onCopy={() => void copy(display.phone ?? display.accountNumber ?? '', 'phone')}
                              />
                            ) : null}
                            {display.accountName ? <PaymentRow icon={User} label="اسم الحساب" value={display.accountName} /> : null}
                            {display.bankName ? <PaymentRow icon={Landmark} label="البنك" value={display.bankName} /> : null}
                            {display.iban ? (
                              <PaymentRow
                                icon={FileText}
                                label="IBAN"
                                value={display.iban}
                                copied={copiedField === 'iban'}
                                onCopy={() => void copy(display.iban ?? '', 'iban')}
                              />
                            ) : null}
                            {display.instructions ? (
                              <p className="border-s-2 border-border ps-3 text-label leading-relaxed text-fg-muted">
                                {display.instructions}
                              </p>
                            ) : null}
                            {display.qrCodeImage ? (
                              <div className="flex flex-col items-start gap-2 pt-1">
                                <span className="flex items-center gap-1.5 text-label text-fg-muted">
                                  <QrCode className="size-4" strokeWidth={1.75} aria-hidden />
                                  امسح الكود للدفع
                                </span>
                                <img src={display.qrCodeImage} alt="QR Code" className="size-32 rounded-md border border-border bg-card object-contain p-1" />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="co-name" className="mb-1.5 flex items-center gap-1.5">
                      <User className="size-4 text-fg-muted" aria-hidden />
                      الاسم الكامل <span className="text-danger" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="co-name"
                      autoComplete="name"
                      value={customer.name}
                      onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
                      placeholder="أدخل اسمك الكامل"
                    />
                  </div>
                  <div>
                    <Label htmlFor="co-phone" className="mb-1.5 flex items-center gap-1.5">
                      <Phone className="size-4 text-fg-muted" aria-hidden />
                      رقم الهاتف <span className="text-danger" aria-hidden>*</span>
                    </Label>
                    <Input
                      id="co-phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={customer.phone}
                      onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="+967 777 123 456"
                      dir="ltr"
                      className="text-start tabular-nums"
                      aria-describedby="co-phone-hint"
                    />
                    <p id="co-phone-hint" className="mt-1 text-[11px] text-fg-subtle">
                      يمكنك استخدام + والمسافات والشرطات.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="co-address" className="mb-1.5 flex items-center gap-1.5">
                    <MapPin className="size-4 text-fg-muted" aria-hidden />
                    العنوان <span className="text-[11px] font-normal text-fg-subtle">(اختياري)</span>
                  </Label>
                  <Input
                    id="co-address"
                    autoComplete="street-address"
                    value={customer.address}
                    onChange={(event) => setCustomer((current) => ({ ...current, address: event.target.value }))}
                    placeholder="المدينة، الحي، الشارع"
                  />
                </div>
                <div>
                  <Label htmlFor="co-notes" className="mb-1.5 flex items-center gap-1.5">
                    <FileText className="size-4 text-fg-muted" aria-hidden />
                    ملاحظات <span className="text-[11px] font-normal text-fg-subtle">(اختياري)</span>
                  </Label>
                  <Textarea
                    id="co-notes"
                    value={customer.notes}
                    onChange={(event) => setCustomer((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="أي ملاحظات إضافية للطلب…"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <OrderReview items={items} total={total} formatPrice={formatPrice} />
              </div>
            ) : null}

            {step === 3 ? (
              <div className="flex flex-col gap-4">
                <div className="border-y border-border py-4">
                  <Camera className="size-5 text-fg-subtle" strokeWidth={1.75} aria-hidden />
                  <p className="mt-2 text-body font-semibold text-foreground">ارفع صورة إيصال التحويل</p>
                  <p className="mt-1 text-label text-fg-muted">صورة واضحة تظهر فيها تفاصيل التحويل.</p>
                  {selectedPayment?.receiptInstructions ?? selectedPayment?.instructions ? (
                    <p className="mt-2 border-s-2 border-border ps-3 text-label leading-relaxed text-fg-muted">
                      {selectedPayment?.receiptInstructions ?? selectedPayment?.instructions}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => !compressing && fileInputRef.current?.click()}
                  className={cn(
                    'flex min-h-[160px] w-full items-center justify-center rounded-md border border-dashed border-border bg-card p-4 transition-colors',
                    'hover:border-accent',
                    receiptPreview && 'border-success bg-success/5',
                  )}
                >
                  {compressing ? (
                    <span className="flex flex-col items-center gap-2 text-accent">
                      <Loader2 className="size-6 animate-spin" aria-hidden />
                      <span className="text-label font-medium">جاري تحسين الصورة…</span>
                    </span>
                  ) : receiptPreview ? (
                    <img src={receiptPreview} alt="إيصال الدفع" className="mx-auto max-h-72 w-auto rounded-md object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-fg-muted">
                      <Upload className="size-7 text-fg-subtle" strokeWidth={1.5} aria-hidden />
                      <span className="text-label font-medium text-foreground">اضغط لاختيار صورة الإيصال</span>
                      <span className="text-[11px] text-fg-subtle">PNG, JPG, WebP, HEIC — حتى 10MB</span>
                    </span>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept={getSupportedFormats()} onChange={(event) => void selectReceipt(event)} className="sr-only" />
                {receiptPreview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start text-danger hover:bg-danger/5 hover:text-danger"
                    onClick={() => {
                      setReceiptImage(null);
                      setReceiptPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    إزالة الصورة
                  </Button>
                ) : null}

                <OrderReview items={items} total={total} formatPrice={formatPrice} />
              </div>
            ) : null}

            {step === 4 && orderResult ? (
              <div className="flex flex-col items-start py-6 text-start">
                <CheckCircle2 className="mb-3 size-7 text-[var(--store-success-text)]" strokeWidth={1.75} aria-hidden />
                <h3 className="font-display text-h2 font-semibold text-foreground">تم إرسال طلبك</h3>
                <p className="mt-1 text-label text-fg-muted">{orderResult.message}</p>
                <p className="mt-3 border-y border-border py-2.5 text-body text-fg-muted">
                  رقم الطلب: <strong className="font-semibold text-foreground" data-numeric>{orderResult.orderNumber}</strong>
                </p>
                {orderResult.whatsappLink ? (
                  <a
                    href={orderResult.whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex h-11 items-center gap-2 rounded-[var(--store-button-radius,4px)] bg-success px-5 text-label font-medium text-success-foreground hover:bg-success/90"
                  >
                    <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
                    تواصل مع المتجر
                  </a>
                ) : null}
                <Button type="button" variant="outline" onClick={close} className="mt-3 w-full">
                  إغلاق
                </Button>
              </div>
            ) : null}

            {error ? (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-danger/25 bg-danger/5 p-3 text-xs text-[var(--store-danger-text)]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>
                  {error}
                  {step >= 2 ? ' بياناتك محفوظة، ويمكنك إعادة المحاولة.' : ''}
                </span>
              </div>
            ) : null}
          </div>

          {step < 4 && (step > 1 || paymentMethods.length > 0) ? (
            <div className="sticky bottom-0 flex gap-2 border-t border-border bg-[var(--store-card-bg)] px-5 py-3 pb-safe">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setStep((current) => (current === 3 ? 2 : 1) as 1 | 2 | 3);
                  }}
                  disabled={submitting}
                >
                  رجوع
                </Button>
              ) : null}
              <Button
                type="button"
                onClick={next}
                disabled={submitting || unavailableItems.length > 0 || (step === 1 && !selectedPayment) || (step === 3 && !receiptImage)}
                className="flex-1 gap-2"
                style={{
                  backgroundColor: 'var(--store-primary)',
                  color: 'var(--store-button-text)',
                  borderRadius: 'var(--store-button-radius, 4px)',
                }}
              >
                {submitting ? <Spinner size="sm" className="text-current" /> : null}
                {submitting
                  ? 'جاري الإرسال…'
                  : step === 2 && !requiresReceipt(selectedPayment)
                    ? 'إرسال الطلب'
                    : step === 3
                      ? 'إرسال الطلب'
                      : 'التالي'}
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentRow({
  icon: Icon,
  label,
  value,
  copied,
  onCopy,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  copied?: boolean;
  onCopy?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2 text-label">
      <span className="flex items-center gap-1.5 text-label text-fg-muted">
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
        {label}
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-label font-medium text-foreground" dir="ltr">{value}</span>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`نسخ ${label}`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            {copied ? <Check className="size-4" strokeWidth={2} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
          </button>
        ) : null}
      </span>
    </div>
  );
}

function OrderReview({
  items,
  total,
  formatPrice,
}: {
  items: CartItem[] | CheckoutItem[];
  total: number;
  formatPrice: (price: number) => string;
}): React.JSX.Element {
  return (
    <section className="border-y border-border" aria-labelledby="order-review">
      <div className="border-b border-border px-3.5 py-2.5">
        <h4 id="order-review" className="text-label font-semibold text-foreground">ملخص الطلب</h4>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item, index) => (
          <li key={`${item.id}-${index}`} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <div className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
              {itemImage(item) ? (
                <img src={itemImage(item)} alt="" loading="lazy" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-fg-subtle">
                  <ShoppingBag className="size-4" strokeWidth={1.5} aria-hidden />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-medium text-foreground">{item.name}</p>
              <p className="text-[11px] text-fg-muted" data-numeric>
                {item.quantity ?? 1} × {formatPrice(item.price)}
              </p>
            </div>
            <span className="shrink-0 text-label font-medium text-foreground" data-numeric>
              {formatPrice(item.price * (item.quantity ?? 1))}
            </span>
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 border-t border-border px-3.5 py-2 text-label">
        <div className="flex items-center justify-between">
          <dt className="text-fg-muted">المجموع الفرعي</dt>
          <dd className="font-medium text-foreground" data-numeric>{formatPrice(total)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-fg-muted">التوصيل</dt>
          <dd className="text-fg-muted">يُحدَّد مع المتجر</dd>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1.5">
          <dt className="font-semibold text-foreground">الإجمالي</dt>
          <dd className="text-body font-semibold text-foreground" data-numeric>{formatPrice(total)}</dd>
        </div>
      </dl>
    </section>
  );
}
