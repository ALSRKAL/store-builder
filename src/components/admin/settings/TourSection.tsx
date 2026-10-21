import { PlayCircle } from 'lucide-react';
import { Button } from '../../ui';

export function TourSection({ onShowTour }: { onShowTour?: (() => void) | undefined }): React.JSX.Element {
  return (
    <div className="border-y border-border py-4">
      <p className="max-w-[52ch] text-label leading-relaxed text-fg-muted">
        شاهد جولة سريعة تعرض كيف يبدو متجرك للعميل: الشريط الإعلاني، السلايدر، التصنيفات، وبطاقة المنتج.
      </p>
      <Button type="button" variant="outline" onClick={onShowTour} className="mt-3 gap-2" disabled={!onShowTour}>
        <PlayCircle className="size-4" strokeWidth={1.75} aria-hidden />
        تشغيل الجولة
      </Button>
    </div>
  );
}
