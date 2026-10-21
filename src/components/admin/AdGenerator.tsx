/**
 * AdGenerator — صانع الإعلانات (9:16).
 *
 * كان 931 سطراً: واجهة + معاينة + كل رسم Canvas. قُسّم إلى:
 *   - `ads/adTemplates` البيانات.
 *   - `ads/TemplateMiniPreview` المصغّرات.
 *   - `ads/AdPreview` المعاينة الحية.
 *   - `ads/renderAdCanvas` الرسم والتصدير.
 * هذا الملف يملك الحالة والضوابط فقط. النافذة صارت Radix Dialog، وكل
 * `alert` صار Toast.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { Check, Download, Loader2 } from 'lucide-react';
import type { Product } from '../../schemas';
import { cn } from '../../lib/utils';
import { Button, Dialog, DialogContent, Input, Label, Switch, toast } from '../ui';
import { AD_TEMPLATES, type AdTemplate } from './ads/adTemplates';
import { AdPreview } from './ads/AdPreview';
import { TemplateMiniPreview } from './ads/TemplateMiniPreview';
import { renderAd } from './ads/renderAdCanvas';

interface AdGeneratorProps {
  product: Product;
  storeName: string | null | undefined;
  onClose: () => void;
}

export default function AdGenerator({ product, storeName, onClose }: AdGeneratorProps): React.JSX.Element {
  const [selectedTemplate, setSelectedTemplate] = useState<AdTemplate>(AD_TEMPLATES[0]!);
  const [customDiscount, setCustomDiscount] = useState('');
  const [showPrice, setShowPrice] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const productImages = product.images ?? [];
  const productImage = productImages[selectedImageIndex] ?? '';
  const productName = product.name || 'منتج';
  const productPrice = product.price || 0;
  const productOriginalPrice =
    product.originalPrice != null && product.originalPrice > productPrice ? product.originalPrice : null;

  const impliedDiscountPct =
    productOriginalPrice != null ? Math.round((1 - productPrice / productOriginalPrice) * 100) : null;
  const badgePct = customDiscount.trim() !== '' ? Number(customDiscount) : null;
  const discountConflict =
    badgePct != null &&
    !Number.isNaN(badgePct) &&
    impliedDiscountPct != null &&
    Math.abs(badgePct - impliedDiscountPct) > 1;

  const generate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas is not ready');
      await renderAd({
        canvas,
        template: selectedTemplate,
        productName,
        productPrice,
        productOriginalPrice,
        productImage,
        customDiscount,
        showPrice,
        showStoreName,
        storeName,
      });
      toast.success('تم إنشاء الإعلان وتنزيله');
    } catch (error) {
      console.error('Error generating ad:', error);
      toast.error('تعذّر إنشاء الإعلان', 'جرّب صورة أخرى أو أعد المحاولة.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!isGenerating && !open ? onClose() : undefined)}>
      <DialogContent
        size="xl"
        title="صانع الإعلانات"
        description="قالب جاهز بصيغة 9:16 — مناسب لستوري واتساب وانستقرام."
        onEscapeKeyDown={(event) => {
          if (isGenerating) event.preventDefault();
        }}
      >
        <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
          <AdPreview
            template={selectedTemplate}
            image={productImage}
            name={productName}
            price={productPrice}
            originalPrice={productOriginalPrice}
            customDiscount={customDiscount}
            showPrice={showPrice}
            showStoreName={showStoreName}
            storeName={storeName}
            imageKey={selectedImageIndex}
            hasMultipleImages={productImages.length > 1}
            imageCount={productImages.length}
          />

          <div className="flex flex-col gap-5">
            {productImages.length > 1 ? (
              <div>
                <Label className="mb-2 block">صورة المنتج</Label>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
                  {productImages.map((image, index) => (
                    <button
                      key={image}
                      type="button"
                      aria-pressed={selectedImageIndex === index}
                      aria-label={`صورة المنتج ${index + 1}${selectedImageIndex === index ? ' (محددة)' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                      className={cn(
                        'relative aspect-square overflow-hidden rounded-md border-2 bg-card p-0 transition-colors',
                        selectedImageIndex === index ? 'border-accent' : 'border-border hover:border-border-strong',
                      )}
                    >
                      <img src={image} alt={`صورة ${index + 1}`} loading="lazy" className="size-full object-cover" />
                      {selectedImageIndex === index ? (
                        <span className="absolute end-1 top-1 inline-flex size-5 items-center justify-center bg-accent text-accent-foreground">
                          <Check className="size-3" strokeWidth={2} aria-hidden />
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <Label className="mb-2 block">القالب</Label>
              <div className="grid grid-cols-3 gap-2">
                {AD_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={selectedTemplate.id === template.id}
                    aria-label={`قالب ${template.name}: ${template.layoutHint}${selectedTemplate.id === template.id ? ' (محدد)' : ''}`}
                    title={template.layoutHint}
                    onClick={() => setSelectedTemplate(template)}
                    className={cn(
                      'flex flex-col gap-1 border bg-card p-1.5 text-start transition-colors',
                      selectedTemplate.id === template.id ? 'border-accent' : 'border-border hover:border-border-strong',
                    )}
                  >
                    <TemplateMiniPreview
                      template={template}
                      image={productImage}
                      name={productName}
                      price={productPrice}
                      originalPrice={productOriginalPrice}
                      selected={selectedTemplate.id === template.id}
                    />
                    <span className="text-[11px] font-medium text-foreground">{template.name}</span>
                    <span className="text-[11px] leading-tight text-fg-muted">{template.layoutHint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="ad-discount" className="mb-2 block">شارة الخصم (اختيارية)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ad-discount"
                  type="number"
                  min={0}
                  max={99}
                  inputMode="numeric"
                  value={customDiscount}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setCustomDiscount(event.target.value)}
                  placeholder="مثال: 25"
                  className="text-center font-semibold tabular-nums"
                  aria-describedby="ad-discount-note"
                />
                <span className="text-body font-bold text-fg-muted" aria-hidden>%</span>
              </div>
              <p id="ad-discount-note" className="mt-1.5 text-[11px] leading-relaxed text-fg-muted">
                شارة ترويجية فقط — لا تغيّر السعر المعروض. السعر الحالي {productPrice.toLocaleString('en-US')} ر.س
                {productOriginalPrice != null ? (
                  <span>
                    {' '}(قبل الخصم <span className="line-through">{productOriginalPrice.toLocaleString('en-US')} ر.س</span> ≈{' '}
                    <span dir="ltr">{impliedDiscountPct}%</span>)
                  </span>
                ) : null}{' '}
                حسب بيانات المنتج.
              </p>
              {discountConflict ? (
                <div role="alert" data-testid="discount-conflict" className="mt-2 rounded-md border border-danger/25 bg-danger/5 p-2.5 text-xs leading-relaxed text-danger">
                  الشارة (<span dir="ltr">{badgePct}%</span>) لا تطابق فرق السعر (<span dir="ltr">{impliedDiscountPct}%</span>).
                  عدّل النسبة أو أفرغها — التصدير متوقف حتى لا يخرج إعلان مضلل.
                </div>
              ) : null}
            </div>

            <div className="divide-y divide-border border-y border-border">
              <div className="flex min-h-12 items-center justify-between gap-3 py-2">
                <span className="text-label text-fg-muted">عرض السعر</span>
                <Switch checked={showPrice} onCheckedChange={setShowPrice} aria-label="عرض السعر" />
              </div>
              <div className="flex min-h-12 items-center justify-between gap-3 py-2">
                <span className="text-label text-fg-muted">عرض اسم المتجر</span>
                <Switch checked={showStoreName} onCheckedChange={setShowStoreName} aria-label="عرض اسم المتجر" />
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void generate()}
              disabled={isGenerating || discountConflict}
              className="w-full gap-2"
              title={discountConflict ? 'التصدير متوقف: نسبة الشارة لا تطابق فرق السعر' : undefined}
            >
              {isGenerating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" strokeWidth={1.75} aria-hidden />}
              {isGenerating ? 'جاري الإنشاء…' : 'تحميل الإعلان'}
            </Button>
            <p className="text-start text-[11px] text-fg-muted" data-numeric>
              PNG بمقاس <span dir="ltr">1080×1920</span> — جاهز للستوري.
            </p>
          </div>
        </div>

        <canvas ref={canvasRef} data-testid="ad-export-canvas" data-export-width="1080" data-export-height="1920" style={{ display: 'none' }} />
      </DialogContent>
    </Dialog>
  );
}
