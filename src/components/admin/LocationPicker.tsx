/**
 * LocationPicker — تحديد موقع المتجر على الخريطة.
 *
 * تحويل من overlay يدوي إلى Radix Dialog، وكل `alert` إلى Toast. أنماط Leaflet
 * انتقلت إلى `styles/leaflet.css` وتُحمَّل مع هذا المكوّن وحده بدل أن تكون في
 * الحزمة الأساسية لكل زائر.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { Button, Dialog, DialogContent, Input, Label, Textarea, toast } from '../ui';
import '../../styles/leaflet.css';

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  enabled?: boolean;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface LocationPickerProps {
  currentLocation?: LocationData | null | undefined;
  onSave: (location: LocationData) => void | Promise<void>;
  onClose: () => void;
}

export default function LocationPicker({ currentLocation, onSave, onClose }: LocationPickerProps): React.JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<ReturnType<NonNullable<Window['L']>['map']> | null>(null);
  const markerInstance = useRef<ReturnType<NonNullable<Window['L']>['marker']> | null>(null);
  const [position, setPosition] = useState({ lat: currentLocation?.lat ?? 24.7136, lng: currentLocation?.lng ?? 46.6753 });
  const [address, setAddress] = useState(currentLocation?.address ?? '');
  const [description, setDescription] = useState(currentLocation?.description ?? '');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const reverseGeocode = async (lat: number, lng: number): Promise<void> => {
    try {
      // Photon API عام ويدعم CORS؛ لا نعتمد على /api/geocode غير الموجود
      // في الـWorker (كان يعيد 404 في الإنتاج ويُفقد العنوان).
      const response = await fetch(
        `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&lang=ar`,
      );
      const data: {
        features?: Array<{
          properties: { name?: string; street?: string; city?: string; state?: string; country?: string };
        }>;
      } = await response.json();
      const properties = data.features?.[0]?.properties;
      const label = properties
        ? [properties.name, properties.street, properties.city, properties.state, properties.country]
            .filter(Boolean)
            .join('، ')
        : '';
      setAddress(label || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch {
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = (): void => {
      const L = window.L;
      if (cancelled || !mapRef.current || mapInstance.current || !L) return;
      const map = L.map(mapRef.current).setView([position.lat, position.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:#ef4444;filter:drop-shadow(0 3px 4px rgba(0,0,0,0.3))"><svg viewBox="0 0 24 24" fill="#ef4444" stroke="#fff" stroke-width="1" style="width:100%;height:100%"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      });
      const marker = L.marker([position.lat, position.lng], { draggable: true, icon }).addTo(map);
      marker.on('dragend', (event) => {
        const next = event.target.getLatLng();
        setPosition({ lat: next.lat, lng: next.lng });
        void reverseGeocode(next.lat, next.lng);
      });
      map.on('click', (event) => {
        marker.setLatLng([event.latlng.lat, event.latlng.lng]);
        setPosition({ lat: event.latlng.lat, lng: event.latlng.lng });
        void reverseGeocode(event.latlng.lat, event.latlng.lng);
      });
      mapInstance.current = map;
      markerInstance.current = marker;
      setMapReady(true);
      window.setTimeout(() => map.invalidateSize(), 250);
      if (currentLocation) void reverseGeocode(currentLocation.lat, currentLocation.lng);
    };

    const load = (): void => {
      if (window.L) {
        init();
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet]');
      if (existing) {
        existing.addEventListener('load', init, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.dataset['leaflet'] = 'true';
      script.addEventListener('load', init, { once: true });
      document.head.appendChild(script);
    };

    // ننتظر انتهاء حركة الـDialog قبل قياس الخريطة
    const timer = window.setTimeout(load, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      mapInstance.current?.remove();
      mapInstance.current = null;
      markerInstance.current = null;
    };
    // position/currentLocation يُقرآن مرة واحدة عند الفتح
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useCurrentLocation = (): void => {
    if (!navigator.geolocation) {
      toast.error('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const { latitude, longitude } = result.coords;
        setPosition({ lat: latitude, lng: longitude });
        mapInstance.current?.setView([latitude, longitude], 17);
        markerInstance.current?.setLatLng([latitude, longitude]);
        void reverseGeocode(latitude, longitude);
        setGpsLoading(false);
      },
      (error) => {
        const message =
          error.code === 1
            ? 'تم رفض إذن الموقع. اسمح بالوصول من إعدادات المتصفح.'
            : error.code === 2
              ? 'الموقع غير متاح حالياً.'
              : 'انتهت مهلة تحديد الموقع. حاول مرة أخرى.';
        toast.error('تعذّر تحديد موقعك', message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 },
    );
  };

  const search = async (): Promise<void> => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&lang=ar&limit=5`,
      );
      const data: {
        features: Array<{
          geometry: { coordinates: [number, number] };
          properties: { name?: string; street?: string; city?: string; state?: string; country?: string };
        }>;
      } = await response.json();
      setResults(
        data.features.map((feature) => ({
          lat: String(feature.geometry.coordinates[1]),
          lon: String(feature.geometry.coordinates[0]),
          display_name: [feature.properties.name, feature.properties.street, feature.properties.city, feature.properties.state, feature.properties.country]
            .filter(Boolean)
            .join('، '),
        })),
      );
    } catch {
      toast.error('تعذّر البحث', 'جرّب تحريك الخريطة يدوياً لتحديد الموقع.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result: SearchResult): void => {
    const lat = Number.parseFloat(result.lat);
    const lng = Number.parseFloat(result.lon);
    setPosition({ lat, lng });
    setAddress(result.display_name);
    setResults([]);
    setSearchQuery('');
    mapInstance.current?.setView([lat, lng], 17);
    markerInstance.current?.setLatLng([lat, lng]);
  };

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent size="md" title="تحديد موقع المتجر" description="زِد ثقة عملائك بإظهار مكان متجرك على الخريطة.">
        <div className="flex flex-col gap-3 p-4">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-ring/25">
              <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              <Label htmlFor="location-search" className="sr-only">ابحث عن موقع</Label>
              <Input
                id="location-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void search();
                  }
                }}
                placeholder="ابحث عن حي أو مدينة…"
                className="border-0 bg-transparent px-0 focus-visible:ring-0"
              />
              <Button type="button" size="sm" variant="ghost" onClick={() => void search()} disabled={searching || !searchQuery.trim()}>
                {searching ? <Loader2 className="size-4 animate-spin" aria-hidden /> : 'بحث'}
              </Button>
            </div>
            {results.length > 0 ? (
              <ul className="absolute inset-x-0 top-full z-10 mt-1.5 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-overlay">
                {results.map((result, index) => (
                  <li key={`${result.lat}-${index}`}>
                    <button
                      type="button"
                      onClick={() => selectResult(result)}
                      className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-start text-label text-foreground hover:bg-muted"
                    >
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-fg-muted" aria-hidden />
                      {result.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="relative h-[260px] overflow-hidden rounded-md border border-border bg-muted">
            <div ref={mapRef} className="size-full" />
            {!mapReady ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-fg-muted">
                <Loader2 className="size-5 animate-spin" aria-hidden />
                <span className="text-label">جاري تحميل الخريطة…</span>
              </div>
            ) : null}
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="تحديد موقعي الحالي"
              className="absolute bottom-3 start-3 bg-card"
              onClick={useCurrentLocation}
              disabled={gpsLoading}
            >
              {gpsLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Navigation className="size-4" aria-hidden />}
            </Button>
          </div>

          {address ? (
            <div className="flex items-start gap-2 border-s-2 border-success ps-3 text-success">
              <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              <p className="text-label leading-relaxed">{address}</p>
            </div>
          ) : null}

          <div>
            <Label htmlFor="location-description" className="mb-1.5 block">وصف الموقع (اختياري)</Label>
            <Textarea
              id="location-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="مثال: بجوار مسجد الراشد، الدور الثاني، محل رقم 5…"
              rows={2}
              maxLength={200}
              className="resize-none"
            />
            <p className="mt-1 text-end text-[11px] text-fg-subtle" dir="ltr">{description.length}/200</p>
          </div>

          <p className="text-center text-[11px] text-fg-subtle" data-numeric dir="ltr">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} className="sm:w-28">
            إلغاء
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  lat: position.lat,
                  lng: position.lng,
                  address,
                  description: description.trim(),
                });
              } catch {
                // الـContext يعرض Toast بالفعل؛ نُبقي النافذة مفتوحة للمحاولة.
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {saving ? 'جاري الحفظ…' : 'حفظ الموقع'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
