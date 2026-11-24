/**
 * Setup — store setup with unified auth shell and labelled fields.
 */

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { uploadImage } from '../../utils/r2Service';
import SlugService from '../../utils/slugService';
import { toEnglishNumbers } from '../../utils/numberUtils';
import CustomSelect from '../../components/common/CustomSelect';
import { Button, Input, Label } from '../../components/ui';
import AuthShell from '../../components/auth/AuthShell';
import { Store, Upload, Camera, Loader2 } from 'lucide-react';

interface CountryCode {
  code: string;
  country: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: '+967', country: 'اليمن' },
  { code: '+966', country: 'السعودية' },
  { code: '+971', country: 'الإمارات' },
  { code: '+965', country: 'الكويت' },
  { code: '+973', country: 'البحرين' },
  { code: '+968', country: 'عمان' },
  { code: '+974', country: 'قطر' },
  { code: '+20', country: 'مصر' },
  { code: '+90', country: 'تركيا' },
  { code: '+962', country: 'الأردن' },
  { code: '+961', country: 'لبنان' },
  { code: '+964', country: 'العراق' },
  { code: '+963', country: 'سوريا' },
  { code: '+970', country: 'فلسطين' },
  { code: '+218', country: 'ليبيا' },
  { code: '+249', country: 'السودان' },
  { code: '+212', country: 'المغرب' },
  { code: '+216', country: 'تونس' },
  { code: '+213', country: 'الجزائر' },
  { code: '+222', country: 'موريتانيا' },
  { code: '+253', country: 'جيبوتي' },
  { code: '+252', country: 'الصومال' },
  { code: '+269', country: 'جزر القمر' },
];

function Setup(): React.JSX.Element {
  const [storeName, setStoreName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [countryCode, setCountryCode] = useState('+967');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, adminData, createAdminProfile } = useAuth();
  const navigate = useNavigate();
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adminData?.storeName) {
      navigate('/admin/dashboard', { replace: true });
    }
    window.history.replaceState(null, '', window.location.pathname);
  }, [adminData, navigate]);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const isImage =
        file.type.startsWith('image/') ||
        /\.(heic|heif|jpg|jpeg|png|gif|webp|bmp|tiff|avif)$/i.test(file.name);
      if (!isImage) {
        setError('يرجى اختيار ملف صورة صالح');
        return;
      }
      setLogo(file);
      try {
        if (
          file.type.startsWith('image/') &&
          !file.type.includes('heic') &&
          !file.type.includes('heif')
        ) {
          setLogoPreview(URL.createObjectURL(file));
        } else {
          setLogoPreview('');
        }
      } catch {
        setLogoPreview('');
      }
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const result = await uploadImage(file, {
        folder: `stores/${user?.uid}/logo`,
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.95,
        maxSizeMB: 1,
        outputFormat: 'png',
      });
      return result?.url ?? null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let logoUrl = '';
      if (logo) {
        const uploaded = await uploadLogo(logo);
        // لا نُنشئ المتجر بصمت بلا الشعار الذي اختاره التاجر.
        if (!uploaded) throw new Error('LOGO_UPLOAD_FAILED');
        logoUrl = uploaded;
      }

      const localPhone = phone.replace(/^0+/, '') || phone;
      const whatsapp = `${countryCode}${localPhone}`;
      const slug = await SlugService.generateUniqueSlug(storeName);
      const storeId = slug;

      const storeData = {
        adminId: user?.uid ?? '',
        name: storeName,
        slug,
        whatsapp,
        currency: 'SAR',
        isActive: true,
        logo: logoUrl || undefined,
      };

      await api.stores.create(storeData as Parameters<typeof api.stores.create>[0]);

      const adminProfileData = {
        storeName,
        storeId,
        storeSlug: slug,
        slug,
        whatsapp,
        storeLogo: logoUrl || undefined,
        logo: logoUrl || undefined,
      };

      await createAdminProfile(adminProfileData);
      // createAdminProfile adopts the complete API response, including subscription.
      navigate('/admin/success', { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage === 'LOGO_UPLOAD_FAILED') {
        setError('تعذّر رفع شعار المتجر. تحقّق من الاتصال وأعد المحاولة.');
      } else if (errorMessage.includes('Slug already exists')) {
        setError('اسم المتجر مستخدم بالفعل، جرب اسماً آخر');
      } else {
        setError('حدث خطأ، حاول مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="إعداد المتجر"
      subtitle="أدخل معلومات متجرك الأساسية — يمكنك تعديلها لاحقاً من الإعدادات"
      maxWidth="max-w-[480px]"
    >
      <form onSubmit={(e) => void handleSubmit(e)}>
        {error && (
          <div role="alert" className="mb-4 rounded-md border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-start text-label text-danger">
            {error}
          </div>
        )}
        <div className="mb-5 flex items-center gap-4 border-b border-border pb-5">
          <label
            htmlFor="logo-input"
            className="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-surface-sunken transition-colors hover:border-border-strong"
          >
            {logoPreview ? (
              <img src={logoPreview} alt="شعار المتجر" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-fg-subtle" aria-hidden />
            )}
            <span className="sr-only">اختر شعار المتجر</span>
          </label>
          <div className="min-w-0 flex-1">
            <p className="text-label font-semibold text-foreground">شعار المتجر</p>
            <p className="mt-0.5 text-[12px] text-fg-subtle">اختياري — PNG أو JPG بجودة جيدة</p>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            id="logo-input"
            accept="image/*,.heic,.heif,.webp,.avif"
            onChange={handleLogoChange}
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => logoInputRef.current?.click()}
            className="shrink-0 gap-2"
          >
            <Upload size={16} aria-hidden />
            اختيار صورة
          </Button>
        </div>

        <div className="mb-3">
          <Label htmlFor="store-name" className="mb-2 block">اسم المتجر</Label>
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
            <Store className="h-[18px] w-[18px] shrink-0 text-fg-subtle" aria-hidden />
            <Input
              id="store-name"
              type="text"
              autoComplete="organization"
              placeholder="مثال: متجر النخبة"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
              className="h-11 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <fieldset className="mb-5 border-t border-border pt-5">
          <legend className="mb-2 text-label font-medium text-foreground">رقم الواتساب لاستقبال الطلبات</legend>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <CustomSelect
              className="w-full sm:w-auto"
              options={COUNTRY_CODES.map((c) => ({
                value: c.code,
                label: `${c.code} — ${c.country}`,
              }))}
              value={countryCode}
              onChange={setCountryCode}
              placeholder="اختر الدولة"
            />
            <div className="flex flex-1 items-center rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
              <Label htmlFor="store-phone" className="sr-only">رقم الواتساب</Label>
              <Input
                id="store-phone"
                type="tel"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="7XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(toEnglishNumbers(e.target.value).replace(/\D/g, ''))}
                required
                minLength={6}
                maxLength={15}
                dir="ltr"
                className="h-11 flex-1 border-0 bg-transparent p-0 text-left focus-visible:ring-0"
              />
            </div>
          </div>
          <p className="mt-2.5 text-[12px] leading-relaxed text-fg-subtle">
            هذا الرقم سيتواصل معه عملاؤك عند إتمام الطلب.
          </p>
        </fieldset>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'إنشاء المتجر'}
        </Button>
      </form>
    </AuthShell>
  );
}

export default Setup;
