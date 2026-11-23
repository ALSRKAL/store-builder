import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Check, Loader2, Pencil, X } from 'lucide-react';
import { Button, Input, Label, toast } from '../../ui';
import { toEnglishNumbers } from '../../../utils/numberUtils';
import SlugService from '../../../utils/slugService';

export interface StoreInfoAdmin {
  storeName?: string;
  email?: string;
  whatsapp?: string;
  logo?: string;
  slug?: string;
  storeSlug?: string;
}

interface StoreInfoSectionProps {
  adminData?: StoreInfoAdmin | null;
  onUpdateStoreInfo: (data: { name?: string; email?: string; password?: string; whatsapp?: string; logoFile?: File }) => Promise<void>;
}

/**
 * معلومات المتجر — الشعار والاسم والبريد والواتساب.
 * يستبدل `label + input hidden` بحقل ملف حقيقي مع `ref`، فلا حاجة لـ
 * `document.getElementById` ولا لمحاكاة نقر.
 */
export function StoreInfoSection({ adminData, onUpdateStoreInfo }: StoreInfoSectionProps): React.JSX.Element {
  const [editingWhatsapp, setEditingWhatsapp] = useState(false);
  const [whatsapp, setWhatsapp] = useState(adminData?.whatsapp ?? '');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(adminData?.storeName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(adminData?.email ?? '');
  const [password, setPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const currentSlug = adminData?.slug ?? adminData?.storeSlug ?? '';
  const slugPreview = useMemo(() => SlugService.generateBaseSlug(name.trim()) || '(رابط تلقائي)', [name]);

  const saveName = async (): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.warning('اسم المتجر قصير', 'استخدم حرفين على الأقل.');
      return;
    }
    setSavingName(true);
    try {
      await onUpdateStoreInfo({ name: trimmed });
      setEditingName(false);
    } catch {
      // الـContext يعرض Toast بالفعل.
    } finally {
      setSavingName(false);
    }
  };

  const saveEmail = async (): Promise<void> => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      toast.warning('بريد غير صالح', 'أدخل بريداً إلكترونياً صحيحاً.');
      return;
    }
    if (!password) {
      toast.warning('كلمة المرور مطلوبة', 'أدخل كلمة المرور الحالية لتأكيد تغيير بريد الدخول.');
      return;
    }
    setSavingEmail(true);
    try {
      await onUpdateStoreInfo({ email: normalized, password });
      setEditingEmail(false);
      setPassword('');
    } catch {
      // الـContext يعرض Toast بالفعل.
    } finally {
      setSavingEmail(false);
    }
  };

  const saveWhatsapp = async (): Promise<void> => {
    const value = toEnglishNumbers(whatsapp).trim();
    const normalized = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    if (normalized.replace(/\D/g, '').length < 6 || normalized.replace(/\D/g, '').length > 15) {
      toast.warning('رقم واتساب غير صالح', 'أدخل الرقم مع رمز الدولة، من 6 إلى 15 رقماً.');
      return;
    }
    setSavingWhatsapp(true);
    try {
      await onUpdateStoreInfo({ whatsapp: normalized });
      setEditingWhatsapp(false);
    } catch {
      // الـContext يعرض Toast بالفعل.
    } finally {
      setSavingWhatsapp(false);
    }
  };

  const changeLogo = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      await onUpdateStoreInfo({ logoFile: file });
    } catch {
      // الـContext يعرض Toast بالفعل.
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          disabled={uploadingLogo}
          className="group relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken"
          aria-label="تغيير شعار المتجر"
        >
          {adminData?.logo ? (
            <img src={adminData.logo} alt="شعار المتجر" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-fg-muted" aria-hidden>
              <Camera className="size-5" strokeWidth={1.75} />
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-scrim/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {uploadingLogo ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Camera className="size-5" aria-hidden />}
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-label font-medium text-foreground">شعار المتجر</p>
          <p className="mt-0.5 text-[12px] text-fg-muted">PNG أو JPG مربّع. يُحدَّث فوراً في المتجر.</p>
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*,.heic,.heif,.webp,.avif"
          onChange={(event) => void changeLogo(event)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </div>

      <dl className="divide-y divide-border border-y border-border">
        <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-4">
          <dt className="pt-2 text-label text-fg-muted">اسم المتجر</dt>
          {editingName ? (
            <dd className="m-0 flex flex-col gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Label htmlFor="store-name" className="sr-only">اسم المتجر</Label>
                <Input
                  id="store-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                  maxLength={60}
                  className="h-11 flex-1"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void saveName();
                    if (event.key === 'Escape') setEditingName(false);
                  }}
                />
                <Button type="button" size="iconSm" aria-label="حفظ اسم المتجر" onClick={() => void saveName()} disabled={savingName}>
                  {savingName ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={1.75} aria-hidden />}
                </Button>
                <Button
                  type="button"
                  size="iconSm"
                  variant="outline"
                  aria-label="إلغاء تعديل الاسم"
                  onClick={() => { setName(adminData?.storeName ?? ''); setEditingName(false); }}
                >
                  <X className="size-4" strokeWidth={1.75} aria-hidden />
                </Button>
              </div>
              <p className="text-[12px] leading-relaxed text-fg-muted">
                الرابط الجديد: <span dir="ltr" className="font-medium">/store/{slugPreview}</span>
                {' '}— سيظل رابطك القديم يعمل بعد التغيير.
              </p>
            </dd>
          ) : (
            <dd className="m-0 flex items-center gap-1">
              <span className="truncate text-label font-medium text-foreground">{adminData?.storeName || '—'}</span>
              <Button type="button" size="iconSm" variant="ghost" aria-label="تعديل اسم المتجر" onClick={() => { setName(adminData?.storeName ?? ''); setEditingName(true); }}>
                <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
              </Button>
            </dd>
          )}
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4">
          <dt className="text-label text-fg-muted">رابط المتجر</dt>
          <dd className="m-0 truncate text-start text-label font-medium text-foreground" dir="ltr">
            {currentSlug ? `/store/${currentSlug}` : '—'}
          </dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-4">
          <dt className="pt-2 text-label text-fg-muted">البريد الإلكتروني</dt>
          {editingEmail ? (
            <dd className="m-0 flex flex-col gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Label htmlFor="store-email" className="sr-only">البريد الإلكتروني</Label>
                <Input
                  id="store-email"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                  className="h-11 flex-1 text-start"
                />
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <Label htmlFor="store-email-password" className="sr-only">كلمة المرور الحالية</Label>
                <Input
                  id="store-email-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="كلمة المرور الحالية للتأكيد"
                  className="h-11 flex-1"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void saveEmail();
                    if (event.key === 'Escape') setEditingEmail(false);
                  }}
                />
                <Button type="button" size="iconSm" aria-label="حفظ البريد الإلكتروني" onClick={() => void saveEmail()} disabled={savingEmail}>
                  {savingEmail ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={1.75} aria-hidden />}
                </Button>
                <Button
                  type="button"
                  size="iconSm"
                  variant="outline"
                  aria-label="إلغاء تعديل البريد"
                  onClick={() => { setEmail(adminData?.email ?? ''); setPassword(''); setEditingEmail(false); }}
                >
                  <X className="size-4" strokeWidth={1.75} aria-hidden />
                </Button>
              </div>
              <p className="text-[12px] leading-relaxed text-fg-muted">
                هذا بريد الدخول. تغييره يتطلب كلمة المرور الحالية، وحسابات Google تحتاج إعادة تسجيل دخول.
              </p>
            </dd>
          ) : (
            <dd className="m-0 flex items-center gap-1">
              <span className="truncate text-label font-medium text-foreground" dir="ltr">{adminData?.email || '—'}</span>
              <Button type="button" size="iconSm" variant="ghost" aria-label="تعديل البريد الإلكتروني" onClick={() => { setEmail(adminData?.email ?? ''); setPassword(''); setEditingEmail(true); }}>
                <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
              </Button>
            </dd>
          )}
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4">
          <dt className="text-label text-fg-muted">واتساب المتجر</dt>
          {editingWhatsapp ? (
            <dd className="m-0 flex min-w-[220px] flex-1 items-center gap-1.5">
              <Label htmlFor="store-whatsapp" className="sr-only">رقم الواتساب</Label>
              <Input
                id="store-whatsapp"
                type="tel"
                inputMode="tel"
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                dir="ltr"
                autoFocus
                className="h-11 flex-1 text-start"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveWhatsapp();
                  if (event.key === 'Escape') setEditingWhatsapp(false);
                }}
              />
              <Button
                type="button"
                size="iconSm"
                aria-label="حفظ رقم الواتساب"
                onClick={() => void saveWhatsapp()}
                disabled={savingWhatsapp}
              >
                {savingWhatsapp ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={1.75} aria-hidden />}
              </Button>
              <Button
                type="button"
                size="iconSm"
                variant="outline"
                aria-label="إلغاء تعديل الواتساب"
                onClick={() => {
                  setWhatsapp(adminData?.whatsapp ?? '');
                  setEditingWhatsapp(false);
                }}
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden />
              </Button>
            </dd>
          ) : (
            <dd className="m-0 flex items-center gap-1">
              <span className="text-label font-medium text-foreground" dir="ltr">{adminData?.whatsapp || '—'}</span>
              <Button
                type="button"
                size="iconSm"
                variant="ghost"
                aria-label="تعديل رقم الواتساب"
                onClick={() => {
                  setWhatsapp(adminData?.whatsapp ?? '');
                  setEditingWhatsapp(true);
                }}
              >
                <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
              </Button>
            </dd>
          )}
        </div>
      </dl>
    </div>
  );
}
