import { MapPin, Pencil } from 'lucide-react';
import type { LocationData } from '../LocationPicker';
import { Button, Switch } from '../../ui';

interface LocationSectionProps {
  location: LocationData | null | undefined;
  toggling: boolean;
  onEdit: () => void;
  onToggle: () => void;
}

export function LocationSection({ location, toggling, onEdit, onToggle }: LocationSectionProps): React.JSX.Element {
  if (location?.lat == null || location?.lng == null) {
    return (
      <div className="border-y border-border py-5">
        <MapPin className="size-5 text-fg-subtle" strokeWidth={1.75} aria-hidden />
        <p className="mt-2 text-label font-medium text-foreground">لم تُضف موقع المتجر بعد</p>
        <p className="mt-1 text-[12px] text-fg-muted">أضف موقعك على الخريطة ليزيد ثقة العملاء.</p>
        <Button type="button" variant="outline" onClick={onEdit} className="mt-3 gap-2">
          <MapPin className="size-4" strokeWidth={1.75} aria-hidden />
          إضافة موقع
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="border-s-2 border-success ps-3 text-label leading-relaxed text-fg-muted">
        {location.address ?? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <div>
          <p className="text-label font-medium text-foreground">إظهار الموقع في المتجر</p>
          <p className="mt-0.5 text-[12px] text-fg-muted">عند الإيقاف يبقى الموقع محفوظاً لكنه لا يظهر للعملاء.</p>
        </div>
        <Switch
          checked={location.enabled !== false}
          onCheckedChange={onToggle}
          disabled={toggling}
          aria-label="إظهار موقع المتجر"
        />
      </div>

      <Button type="button" variant="outline" onClick={onEdit} className="gap-2 self-start">
        <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
        تعديل الموقع
      </Button>
    </div>
  );
}
