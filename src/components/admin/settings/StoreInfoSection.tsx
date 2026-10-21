import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, Check, Loader2, Pencil, X } from 'lucide-react';
import { Button, Input, Label, toast } from '../../ui';
import { toEnglishNumbers } from '../../../utils/numberUtils';

export interface StoreInfoAdmin {
  storeName?: string;
  email?: string;
  whatsapp?: string;
  logo?: string;
}

interface StoreInfoSectionProps {
  adminData?: StoreInfoAdmin | null;
  onUpdateStoreInfo: (data: { whatsapp?: string; logoFile?: File }) => Promise<void>;
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

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
        <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4">
          <dt className="text-label text-fg-muted">اسم المتجر</dt>
          <dd className="m-0 truncate text-start text-label font-medium text-foreground">{adminData?.storeName || '—'}</dd>
        </div>
        <div className="grid gap-1 py-3 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4">
          <dt className="text-label text-fg-muted">البريد الإلكتروني</dt>
          <dd className="m-0 truncate text-start text-label font-medium text-foreground"><span dir="ltr">{adminData?.email || '—'}</span></dd>
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
