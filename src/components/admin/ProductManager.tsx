/**
 * ProductManager — products tab.
 *
 * The card grid was the template look. A merchant scans products; a ruled list
 * is faster: thumbnail, name, category, price, and three 44px actions per row.
 */

import { useEffect, useState } from 'react';
import {
  Edit,
  FolderOpen,
  Megaphone,
  Package,
  Plus,
  Trash2,
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import PageHeader from './layout/PageHeader';
import { Button, EmptyState, ErrorState, SkeletonList } from '../ui';
import { formatPrice } from '../../data/currencies';
import { cn } from '../../lib/utils';

function ProductManager(): React.JSX.Element {
  const {
    products,
    categories,
    loading,
    loadError,
    reloadData,
    storeCurrency,
    currentPlan,
    getLimits,
    showLimitAlert,
    openProductForm,
    openCategoryForm,
    deleteProduct,
    deleteCategory,
    openAdGenerator,
    getCategoryName,
  } = useDashboard();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // حذف التصنيف المحدد كان يترك القائمة مفلترة على تصنيف غير موجود.
  useEffect(() => {
    if (selectedCategory !== 'all' && !categories.some((category) => category.id === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [categories, selectedCategory]);

  const selectedCategoryData = categories.find((category) => category.id === selectedCategory);

  const handleAddCategory = (): void => {
    const limits = getLimits({
      products: products.length,
      categories: categories.length,
    });
    if (!limits.canAddCategory) {
      showLimitAlert('categories');
      return;
    }
    openCategoryForm(null);
  };

  const handleAddProduct = (): void => {
    const limits = getLimits({
      products: products.length,
      categories: categories.length,
    });
    if (!limits.canAddProduct) {
      showLimitAlert('products');
      return;
    }
    openProductForm(null);
  };

  const filteredProducts =
    selectedCategory === 'all'
      ? products
      : products.filter((product) => product.categoryId === selectedCategory);

  return (
    <>
      <PageHeader
        title="المنتجات"
        description="أضف منتجاتك وعدّلها ونظّمها بتصنيفات لتسهيل التصفح في متجرك."
        actions={
          <>
            <Button type="button" variant="outline" onClick={handleAddCategory} className="gap-2">
              <FolderOpen size={17} strokeWidth={1.75} aria-hidden />
              <span className="hidden md:inline">تصنيف جديد</span>
              <span className="md:hidden">تصنيف</span>
              {currentPlan ? (
                <span className="text-[11px] font-normal text-fg-subtle" data-numeric>
                  {categories.length}/{currentPlan.maxCategories}
                </span>
              ) : null}
            </Button>

            <Button type="button" onClick={handleAddProduct} className="gap-2">
              <Plus size={18} strokeWidth={1.75} aria-hidden />
              <span className="hidden md:inline">منتج جديد</span>
              <span className="md:hidden">منتج</span>
              {currentPlan ? (
                <span className="text-[11px] font-normal text-primary-foreground/60" data-numeric>
                  {products.length}/{currentPlan.maxProducts}
                </span>
              ) : null}
            </Button>
          </>
        }
      />

      {loading ? (
        <>
          <SkeletonList count={6} />
          <span className="sr-only" role="status" aria-live="polite">
            جاري تحميل بيانات متجرك...
          </span>
        </>
      ) : loadError ? (
        <ErrorState
          title="تعذّر تحميل المنتجات"
          description="لم نتمكن من الوصول إلى بيانات متجرك. تحقّق من الاتصال ثم أعد المحاولة — لن تفقد أي تعديلات محفوظة."
          onRetry={() => void reloadData()}
        />
      ) : (
        <>
          {categories.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-border">
              <div
                className="flex min-w-0 flex-1 flex-wrap items-center gap-0"
                role="group"
                aria-label="تصفية المنتجات حسب التصنيف"
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  aria-pressed={selectedCategory === 'all'}
                  className={cn(
                    'relative inline-flex h-11 shrink-0 items-center gap-1.5 px-3 text-label transition-colors',
                    selectedCategory === 'all'
                      ? 'font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent'
                      : 'font-medium text-fg-muted hover:text-foreground',
                  )}
                >
                  الكل
                  <span className="text-[11px] text-fg-subtle" data-numeric>
                    {products.length}
                  </span>
                </button>

                {categories.map((category) => {
                  const count = products.filter((product) => product.categoryId === category.id).length;
                  const isSelected = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={isSelected}
                      className={cn(
                        'relative inline-flex h-11 shrink-0 items-center gap-1.5 px-3 text-label transition-colors',
                        isSelected
                          ? 'font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-accent'
                          : 'font-medium text-fg-muted hover:text-foreground',
                      )}
                    >
                      <span className="max-w-[12rem] truncate">{category.name}</span>
                      <span className="text-[11px] text-fg-subtle" data-numeric>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedCategoryData ? (
                <div className="flex shrink-0 items-center gap-1 pb-1">
                  <button
                    type="button"
                    onClick={() => openCategoryForm(selectedCategoryData)}
                    aria-label={`تعديل تصنيف ${selectedCategoryData.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Edit size={17} strokeWidth={1.75} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteCategory(selectedCategoryData.id)}
                    aria-label={`حذف تصنيف ${selectedCategoryData.name}`}
                    className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-danger/5 hover:text-danger"
                  >
                    <Trash2 size={17} strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title={
                selectedCategory === 'all'
                  ? 'لا توجد منتجات بعد'
                  : 'لا توجد منتجات في هذا التصنيف'
              }
              description={
                selectedCategory === 'all'
                  ? 'أضف منتجك الأول مع صورة وسعر وتصنيف ليظهر في متجرك مباشرة.'
                  : 'جرّب تصنيفاً آخر أو أضف منتجاً جديداً لهذا التصنيف.'
              }
              action={
                <Button onClick={handleAddProduct} className="gap-2">
                  <Plus size={18} strokeWidth={1.75} aria-hidden />
                  إضافة منتج
                </Button>
              }
              hint={
                currentPlan
                  ? `استخدمت ${products.length} من ${currentPlan.maxProducts} منتجاً في خطتك.`
                  : undefined
              }
            />
          ) : (
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="hidden border-b border-border bg-surface-sunken px-4 py-2.5 text-[11px] font-medium text-fg-subtle md:grid md:grid-cols-[64px_minmax(0,1fr)_150px_120px_140px] md:items-center md:gap-4">
                <span aria-hidden />
                <span>المنتج</span>
                <span>التصنيف</span>
                <span>السعر</span>
                <span className="text-end">إجراءات</span>
              </div>

              {filteredProducts.map((product) => (
                <article
                  key={product.id}
                  aria-label={product.name}
                  className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 md:grid-cols-[64px_minmax(0,1fr)_150px_120px_140px] md:gap-4 md:px-4"
                >
                  <div className="flex size-14 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-sunken md:size-16">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package size={22} strokeWidth={1.5} className="text-fg-subtle" aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-label font-semibold text-foreground">
                      {product.name}
                    </h3>
                    <p className="mt-0.5 truncate text-[12px] text-fg-subtle">
                      {getCategoryName(product.categoryId)}
                      {product.inStock === false ? (
                        <span className="ms-2 text-danger">نفدت الكمية</span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-label font-medium text-foreground md:hidden" data-numeric>
                      {formatPrice(product.price, storeCurrency)}
                    </p>
                  </div>

                  <div className="hidden min-w-0 md:block">
                    <span className="block truncate text-label text-fg-muted">
                      {getCategoryName(product.categoryId)}
                    </span>
                  </div>

                  <div className="hidden text-label font-medium text-foreground md:block" data-numeric>
                    {formatPrice(product.price, storeCurrency)}
                  </div>

                  <div className="flex items-center justify-end gap-0.5">
                    <button
                      type="button"
                      aria-label={`صمم إعلاناً لـ ${product.name}`}
                      className="hidden size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
                      onClick={() => openAdGenerator(product)}
                    >
                      <Megaphone size={17} strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`تعديل ${product.name}`}
                      className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => openProductForm(product)}
                    >
                      <Edit size={17} strokeWidth={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`حذف ${product.name}`}
                      className="inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-danger/5 hover:text-danger"
                      onClick={() => void deleteProduct(product.id)}
                    >
                      <Trash2 size={17} strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default ProductManager;
