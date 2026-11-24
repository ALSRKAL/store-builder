/**
 * ProductForm — إضافة/تعديل منتج.
 *
 * تحويل من modal مكتوب يدوياً (overlay + Escape يدوي + لا حصر تركيز) إلى Radix
 * Dialog: حصر تركيز، إرجاع تركيز، Escape، وقفل تمرير خلفية مضمون.
 *
 * التحقق: كان النموذج يعتمد `required` فقط، فيقبل سعراً نصياً ويرسل NaN إلى
 * الـAPI. الآن zod يتحقق من الاسم والسعر والسعر قبل الخصم، والخطأ يظهر تحت
 * الحقل نفسه مع `aria-invalid` و`aria-describedby`.
 */

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { z } from 'zod';
import { AlertTriangle, Check, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toEnglishNumbers, parseNumber } from '../../utils/numberUtils';
import type { Product, Category } from '../../schemas';
import { cn } from '../../lib/utils';
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
} from '../ui';

type SaveStage = 'compress' | 'upload' | 'save' | 'done' | null;
type SaveStageCallback = (stage: 'uploading' | 'saving') => void;

export interface ProductFormValues {
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  categoryId: string;
  colors: string[];
  sizes: string[];
  discount: number;
  inStock: boolean;
}

type ProductImage = string | File;

interface ProductFormProps {
  product: Product | null | undefined;
  categories: Category[];
  onSave: (
    formData: ProductFormValues,
    images: ProductImage[],
    stageCallback?: SaveStageCallback,
  ) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#22c55e', '#3b82f6',
  '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899',
  '#64748b', '#0f172a', '#7c2d12', '#166534', '#1e3a8a',
];

const formSchema = z.object({
  name: z.string().trim().min(2, 'اسم المنتج مطلوب (حرفان على الأقل)').max(120, 'الاسم طويل جداً'),
  description: z.string().max(1000, 'الوصف أطول من 1000 حرف').optional(),
  price: z
    .string()
    .trim()
    .min(1, 'السعر مطلوب')
    .refine((value) => parseNumber(value) > 0, 'أدخل سعراً أكبر من صفر'),
  oldPrice: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || parseNumber(value) > 0,
      'السعر قبل الخصم يجب أن يكون أكبر من صفر',
    )
    .refine(
      (value) => value === '' || parseNumber(value) > parseNumber('0'),
      'قيمة غير صالحة',
    ),
  categoryId: z.string(),
  colors: z.array(z.string()),
  sizes: z.array(z.string()),
  discount: z.string(),
});

type FieldErrors = Partial<Record<'name' | 'price' | 'oldPrice' | 'description', string>>;

function ProductForm({ product, categories, onSave, onClose }: ProductFormProps): React.JSX.Element {
  const { currentPlan } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    oldPrice: '',
    categoryId: 'none',
    colors: [] as string[],
    sizes: [] as string[],
    discount: '',
    inStock: true,
  });
  const [images, setImages] = useState<ProductImage[]>([]);
  const [newSize, setNewSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStage, setSaveStage] = useState<SaveStage>(null);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [imageError, setImageError] = useState('');

  const maxImages = currentPlan.maxImagesPerProduct ?? 3;

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price?.toString() || '',
        oldPrice: product.originalPrice?.toString() || '',
        categoryId: product.categoryId || 'none',
        colors: product.colors || [],
        sizes: product.sizes || [],
        discount: product.discount?.toString() || '',
        inStock: product.inStock !== false,
      });
      setImages(product.images || []);
    } else {
      setFormData({ name: '', description: '', price: '', oldPrice: '', categoryId: 'none', colors: [], sizes: [], discount: '', inStock: true });
      setImages([]);
    }
  }, [product]);

  const previews = useMemo(
    () => images.map((image) => (typeof image === 'string' ? image : URL.createObjectURL(image))),
    [images],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    const numeric = name === 'price' || name === 'oldPrice' || name === 'discount';
    const nextValue = numeric ? toEnglishNumbers(value) : value;
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (name === 'price' || name === 'oldPrice') {
        const price = parseNumber(name === 'price' ? nextValue : prev.price);
        const oldPrice = parseNumber(name === 'oldPrice' ? nextValue : prev.oldPrice);
        next.discount = oldPrice > 0 && price > 0 && oldPrice > price
          ? String(Math.round(((oldPrice - price) / oldPrice) * 100))
          : '';
      }
      return next;
    });
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []).filter(
      (file) => file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|gif|webp|bmp|tiff|avif)$/i.test(file.name),
    );
    if (images.length + files.length > maxImages) {
      setImageError(`الحد الأقصى للصور في خطتك هو ${maxImages} صور لكل منتج`);
      const remaining = maxImages - images.length;
      if (remaining > 0) setImages((prev) => [...prev, ...files.slice(0, remaining)]);
      return;
    }
    setImageError('');
    setImages((prev) => [...prev, ...files]);
  };

  const toggleColor = (color: string): void => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter((item) => item !== color)
        : [...prev.colors, color],
    }));
  };

  const addSize = (): void => {
    const value = newSize.trim();
    if (value && !formData.sizes.includes(value)) {
      setFormData((prev) => ({ ...prev, sizes: [...prev.sizes, value] }));
      setNewSize('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const parsed = formSchema.safeParse(formData);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'name' || key === 'price' || key === 'oldPrice' || key === 'description') {
          nextErrors[key] ??= issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }
    if (parseNumber(formData.oldPrice) > 0 && parseNumber(formData.oldPrice) <= parseNumber(formData.price)) {
      setErrors({ oldPrice: 'السعر قبل الخصم يجب أن يكون أعلى من السعر الحالي' });
      return;
    }

    setLoading(true);
    setProgress(0);
    setSaveStage('save');

    const payload: ProductFormValues = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseNumber(formData.price),
      oldPrice: formData.oldPrice ? parseNumber(formData.oldPrice) : null,
      categoryId: formData.categoryId === 'none' ? '' : formData.categoryId,
      colors: formData.colors,
      sizes: formData.sizes,
      discount: parseNumber(formData.discount),
      inStock: formData.inStock,
    };

    try {
      const newImages = images.filter((image): image is File => typeof image !== 'string');
      if (newImages.length > 0) {
        setSaveStage('compress');
        setProgress(10);
        setSaveStage('upload');
        await onSave(payload, images, (stage) => {
          if (stage === 'uploading') setProgress(50);
          if (stage === 'saving') {
            setSaveStage('save');
            setProgress(85);
          }
        });
      } else {
        setProgress(50);
        await onSave(payload, images);
      }
      setSaveStage('done');
      setProgress(100);
    } catch {
      // الـContext يعرض Toast بالفعل؛ نُبقي النموذج مفتوحاً بكل بياناته.
      setSaveStage(null);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const stageLabel =
    saveStage === 'compress'
      ? 'جاري ضغط الصور…'
      : saveStage === 'upload'
        ? 'جاري رفع الصور…'
        : saveStage === 'save'
          ? 'جاري الحفظ…'
          : 'تم الحفظ';

  return (
    <Dialog open onOpenChange={(open) => (!loading && !open ? onClose() : undefined)}>
      <DialogContent
        size="lg"
        title={product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
        description="الصور والسعر والتفاصيل التي سيراها العميل في متجرك."
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col">
          <div className="space-y-6 p-5">
            {/* الصور */}
            <section aria-labelledby="pf-images">
              <div className="mb-2 flex items-center justify-between gap-3">
                <Label id="pf-images">صور المنتج</Label>
                <span className="text-label text-fg-muted" data-numeric>
                  {images.length}/{maxImages}
                </span>
              </div>
              {imageError ? (
                <div role="alert" className="mb-3 flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 p-3 text-label text-warning">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  {imageError}
                </div>
              ) : null}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((image, index) => (
                  <div key={`${typeof image === 'string' ? image : image.name}-${index}`} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                    <img src={previews[index]} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label={`حذف الصورة ${index + 1}`}
                      className="absolute start-1 top-1 inline-flex size-11 items-center justify-center rounded-md bg-scrim/70 text-white transition-colors hover:bg-danger"
                      onClick={() => {
                        setImages((prev) => prev.filter((_, i) => i !== index));
                        setImageError('');
                      }}
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                ))}
                {images.length < maxImages ? (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken text-fg-muted transition-colors hover:border-accent hover:text-accent">
                    <input
                      type="file"
                      accept="image/*,.heic,.heif,.webp,.avif"
                      multiple
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                    <Upload className="size-5" strokeWidth={1.75} aria-hidden />
                    <span className="text-[11px] font-medium">إضافة صورة</span>
                  </label>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2" aria-labelledby="pf-basics">
              <div>
                <Label htmlFor="pf-name" className="mb-2 block">
                  اسم المنتج <span className="text-danger" aria-hidden>*</span>
                </Label>
                <Input
                  id="pf-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={120}
                  placeholder="مثال: عطر عود ملكي"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'pf-name-error' : undefined}
                />
                {errors.name ? (
                  <p id="pf-name-error" className="mt-1.5 text-xs text-danger">{errors.name}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="pf-category" className="mb-2 block">التصنيف</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryId: value }))}
                >
                  <SelectTrigger id="pf-category" aria-label="التصنيف">
                    <SelectValue placeholder="بدون تصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون تصنيف</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <div>
              <Label htmlFor="pf-desc" className="mb-2 block">الوصف</Label>
              <Textarea
                id="pf-desc"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
                placeholder="وصف مختصر يساعد العميل على اتخاذ القرار"
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description ? (
                <p className="mt-1.5 text-xs text-danger">{errors.description}</p>
              ) : null}
            </div>

            <section className="grid gap-4 sm:grid-cols-3" aria-labelledby="pf-pricing">
              <div>
                <Label htmlFor="pf-price" className="mb-2 block">
                  السعر <span className="text-danger" aria-hidden>*</span>
                </Label>
                <Input
                  id="pf-price"
                  inputMode="decimal"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="99.00"
                  dir="ltr"
                  className="text-start tabular-nums"
                  aria-invalid={Boolean(errors.price)}
                  aria-describedby={errors.price ? 'pf-price-error' : undefined}
                />
                {errors.price ? (
                  <p id="pf-price-error" className="mt-1.5 text-xs text-danger">{errors.price}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="pf-oldprice" className="mb-2 block">السعر قبل الخصم</Label>
                <Input
                  id="pf-oldprice"
                  inputMode="decimal"
                  name="oldPrice"
                  value={formData.oldPrice}
                  onChange={handleChange}
                  placeholder="اختياري"
                  dir="ltr"
                  className="text-start tabular-nums"
                  aria-invalid={Boolean(errors.oldPrice)}
                  aria-describedby={errors.oldPrice ? 'pf-oldprice-error' : undefined}
                />
                {errors.oldPrice ? (
                  <p id="pf-oldprice-error" className="mt-1.5 text-xs text-danger">{errors.oldPrice}</p>
                ) : null}
              </div>
              <div>
                <Label htmlFor="pf-discount" className="mb-2 block">نسبة الخصم</Label>
                <div className="relative">
                  <Input
                    id="pf-discount"
                    name="discount"
                    value={formData.discount}
                    readOnly
                    dir="ltr"
                    className="bg-muted pe-8 text-start font-semibold tabular-nums"
                    title="تُحسب تلقائياً من السعرين"
                  />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-label text-fg-muted">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-y border-border py-3 sm:col-span-2">
                <div>
                  <Label htmlFor="pf-instock" className="text-label font-medium">المنتج متوفر</Label>
                  <p className="mt-0.5 text-[11px] text-fg-muted">
                    عند الإيقاف يظهر المنتج للعميل «نفدت الكمية» ويتعطّل الشراء.
                  </p>
                </div>
                <Switch
                  id="pf-instock"
                  checked={formData.inStock}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, inStock: checked }))}
                  aria-label="المنتج متوفر"
                />
              </div>
            </section>

            <section aria-labelledby="pf-colors">
              <span id="pf-colors" className="mb-2 block text-label font-medium text-foreground">
                الألوان المتاحة
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="pf-colors">
                {PRESET_COLORS.map((color) => {
                  const selected = formData.colors.includes(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`لون ${color}${selected ? ' (محدد)' : ''}`}
                      className={cn(
                        'inline-flex size-11 items-center justify-center rounded-full border-2 transition-colors',
                        selected ? 'border-accent ring-2 ring-ring/20' : 'border-border hover:border-border-strong',
                      )}
                      style={{ background: color }}
                      onClick={() => toggleColor(color)}
                    >
                      {selected ? <Check className="size-4 text-white drop-shadow" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </section>

            <section aria-labelledby="pf-sizes">
              <Label htmlFor="pf-size-input" className="mb-2 block" id="pf-sizes">المقاسات المتاحة</Label>
              <div className="flex gap-2">
                <Input
                  id="pf-size-input"
                  value={newSize}
                  onChange={(event) => setNewSize(event.target.value)}
                  placeholder="مثال: M أو 42"
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addSize();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addSize} className="shrink-0 gap-1.5" aria-label="إضافة المقاس">
                  <Plus className="size-4" aria-hidden />
                  إضافة
                </Button>
              </div>
              {formData.sizes.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.sizes.map((size) => (
                    <span key={size} className="inline-flex min-h-12 items-center gap-1 border border-border bg-card ps-3 pe-1 text-label font-medium text-foreground">
                      {size}
                      <button
                        type="button"
                        aria-label={`حذف مقاس ${size}`}
                        className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-danger/5 hover:text-danger"
                        onClick={() => setFormData((prev) => ({ ...prev, sizes: prev.sizes.filter((item) => item !== size) }))}
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-surface px-5 py-4 sm:flex-row">
            <Button type="button" variant="outline" className="sm:w-32" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="min-h-11 w-full gap-2 sm:flex-1" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {stageLabel}
                  <span className="sr-only" aria-live="polite">{progress}%</span>
                </>
              ) : (
                <>
                  <Check className="size-4" aria-hidden />
                  {product ? 'حفظ التعديلات' : 'إضافة المنتج'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ProductForm;
