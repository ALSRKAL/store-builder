/**
 * CategoryForm — إنشاء/تعديل تصنيف.
 * Radix Dialog + تحقق zod + خطأ أسفل الحقل، بدل نموذج يدوي يعتمد `required` فقط.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Check, Loader2 } from 'lucide-react';
import type { Category } from '../../schemas/category';
import { Button, Dialog, DialogContent, Input, Label } from '../ui';

interface CategoryFormProps {
  category?: Category | null;
  onSave: (data: { name: string }) => Promise<void>;
  onClose: () => void;
}

const categorySchema = z.object({
  name: z.string().trim().min(2, 'اسم التصنيف مطلوب (حرفان على الأقل)').max(60, 'الاسم أطول من 60 حرفاً'),
});

function CategoryForm({ category, onSave, onClose }: CategoryFormProps): React.JSX.Element {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(category?.name ?? '');
  }, [category]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const parsed = categorySchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'اسم غير صالح');
      return;
    }
    setLoading(true);
    try {
      await onSave({ name: parsed.data.name });
    } catch {
      // الـContext يعرض Toast، والنموذج يبقى مفتوحاً.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!loading && !open ? onClose() : undefined)}>
      <DialogContent
        size="sm"
        title={category ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
        description="التصنيفات تساعد العميل على الوصول إلى المنتجات بسرعة."
      >
        <form onSubmit={(event) => void submit(event)}>
          <div className="p-5">
            <Label htmlFor="category-name" className="mb-2 block">
              اسم التصنيف <span className="text-danger" aria-hidden>*</span>
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError('');
              }}
              maxLength={60}
              placeholder="مثال: ملابس رجالية"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'category-name-error' : undefined}
            />
            {error ? (
              <p id="category-name-error" role="alert" className="mt-1.5 text-xs text-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row">
            <Button type="button" variant="outline" className="sm:w-28" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              {loading ? 'جاري الحفظ…' : 'حفظ التصنيف'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CategoryForm;
