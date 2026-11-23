import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { Button, Dialog, DialogContent, Input, Label, Textarea } from '../ui';
import { addMapTiles, loadLeaflet, mapMarker, observeMapSize } from '../../utils/leafletLoader';
import { isValidCoordinates, normalizeLocation, parseMapLink } from '../../utils/mapLocation';

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  description?: string;
  enabled?: boolean;
}
interface SearchResult { lat: number; lng: number; label: string }
interface LocationPickerProps {
  currentLocation?: LocationData | null | undefined;
  onSave: (location: LocationData) => void | Promise<void>;
  onClose: () => void;
}

export default function LocationPicker({ currentLocation, onSave, onClose }: LocationPickerProps): React.JSX.Element {
  const [initial] = useState(() => normalizeLocation(currentLocation));
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(initial);
  const positionRef = useRef(position);
  const [address, setAddress] = useState(initial?.address ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [latitude, setLatitude] = useState(initial ? String(initial.lat) : '');
  const [longitude, setLongitude] = useState(initial ? String(initial.lng) : '');
  const [mapLink, setMapLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<ReturnType<NonNullable<Window['L']>['map']> | null>(null);
  const markerInstance = useRef<ReturnType<NonNullable<Window['L']>['marker']> | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const gpsGeneration = useRef(0);

  const cancelGps = (): void => {
    gpsGeneration.current += 1;
    setGpsLoading(false);
  };

  const choosePosition = (lat: number, lng: number): void => {
    if (!alive.current || !isValidCoordinates(lat, lng)) return;
    // A newer map/link/search selection owns the draft, not an older GPS request.
    cancelGps();
    const next = { lat, lng };
    positionRef.current = next;
    setPosition(next);
    setLatitude(String(lat));
    setLongitude(String(lng));
    setError(null);
    markerInstance.current?.setLatLng([lat, lng]);
    const L = window.L;
    if (!markerInstance.current && L && mapInstance.current) {
      const marker = L.marker([lat, lng], { draggable: true, icon: mapMarker(L) }).addTo(mapInstance.current);
      marker.on('dragend', (event) => { const point = event.target.getLatLng(); choosePosition(point.lat, point.lng); });
      markerInstance.current = marker;
    }
  };
  const chooseRef = useRef(choosePosition);
  useEffect(() => { chooseRef.current = choosePosition; });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      gpsGeneration.current += 1;
      searchRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let disposeSize = (): void => {};
    let disposeTiles = (): void => {};
    let ownedMap: NonNullable<typeof mapInstance.current> | null = null;
    setMapState('loading');
    void loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      const point = positionRef.current ?? { lat: 15.3694, lng: 44.1910 };
      // Leaflet 1.9.4 leaves a zoom-transition fallback timer alive after remove().
      // This short-lived picker must not animate a camera or queue drag inertia
      // while the merchant can immediately save/cancel and destroy its panes.
      const map = L.map(mapRef.current, { zoomAnimation: false, markerZoomAnimation: false, inertia: false }).setView([point.lat, point.lng], positionRef.current ? 15 : 5);
      ownedMap = map;
      mapInstance.current = map;
      disposeTiles = addMapTiles(L, map, () => { if (!cancelled) setMapState('ready'); }, () => { if (!cancelled) setMapState('error'); });
      if (positionRef.current) chooseRef.current(point.lat, point.lng);
      map.on('click', (event) => { if (!cancelled && mapInstance.current === map) chooseRef.current(event.latlng.lat, event.latlng.lng); });
      disposeSize = observeMapSize(map, mapRef.current);
    }).catch(() => { if (!cancelled) setMapState('error'); });
    return () => {
      cancelled = true;
      disposeSize();
      disposeTiles();
      const map = ownedMap;
      if (mapInstance.current === map) {
        mapInstance.current = null;
        markerInstance.current = null;
      }
      // stop() cancels any in-progress keyboard/button pan before panes disappear.
      map?.stop();
      map?.remove();
    };
  }, [attempt]);

  const useCurrentLocation = (): void => {
    if (!navigator.geolocation) { setError('المتصفح لا يدعم تحديد الموقع. أدخل الإحداثيات أو رابط الخريطة.'); return; }
    const generation = ++gpsGeneration.current;
    setGpsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition((result) => {
      if (!alive.current || saveLock.current || generation !== gpsGeneration.current) return;
      if (!isValidCoordinates(result.coords.latitude, result.coords.longitude)) {
        setError('تعذّر تحديد موقعك. أعد المحاولة أو أدخل الموقع يدوياً.');
        setGpsLoading(false);
        return;
      }
      choosePosition(result.coords.latitude, result.coords.longitude);
      mapInstance.current?.setView([result.coords.latitude, result.coords.longitude], 17, { animate: false });
      setGpsLoading(false);
    }, (failure) => {
      if (!alive.current || generation !== gpsGeneration.current) return;
      setError(failure.code === 1 ? 'تم رفض إذن الموقع. اسمح بالوصول من إعدادات المتصفح أو أدخل الموقع يدوياً.' : 'تعذّر تحديد موقعك. أعد المحاولة أو أدخل الموقع يدوياً.');
      setGpsLoading(false);
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };

  const search = async (): Promise<void> => {
    if (!searchQuery.trim()) return;
    searchRequest.current?.abort();
    const request = new AbortController();
    searchRequest.current = request;
    setSearching(true);
    setSearchMessage(null);
    const timer = window.setTimeout(() => request.abort(), 12000);
    try {
      // Only this fixed public endpoint is fetched, never a customer-pasted URL.
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery.trim())}&limit=5`, { signal: request.signal });
      if (!response.ok) throw new Error('search');
      const data = await response.json() as { features?: Array<{ geometry?: { coordinates?: number[] }; properties?: Record<string, unknown> }> };
      const matches = (data.features ?? []).flatMap((feature) => {
        const [lng, lat] = feature.geometry?.coordinates ?? [];
        if (!isValidCoordinates(lat, lng)) return [];
        const props = feature.properties ?? {};
        const label = ['name', 'street', 'city', 'state', 'country'].map((key) => props[key]).filter((value) => typeof value === 'string').join('، ');
        return [{ lat, lng: lng as number, label: label || `${lat}, ${lng}` }];
      });
      if (!alive.current || searchRequest.current !== request) return;
      setResults(matches);
      if (!matches.length) setSearchMessage('لا توجد نتائج. جرّب اسماً آخر أو أدخل رابط الخريطة.');
    } catch {
      if (alive.current && searchRequest.current === request) {
        setResults([]);
        setSearchMessage('تعذّر البحث. أعد المحاولة أو أدخل الإحداثيات / رابط الخريطة.');
      }
    } finally {
      window.clearTimeout(timer);
      if (alive.current && searchRequest.current === request) setSearching(false);
    }
  };

  const save = async (): Promise<void> => {
    if (saveLock.current) return;
    // Pending GPS must not replace a draft while validation/save is in progress.
    cancelGps();
    const point = latitude.trim() && longitude.trim() ? parseMapLink(`${latitude},${longitude}`) : null;
    if (!point) { setError('حدد الموقع أولاً. خط العرض بين -90 و90 وخط الطول بين -180 و180.'); return; }
    saveLock.current = true;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...currentLocation, ...point, address: address.trim(), description: description.trim(), enabled: currentLocation?.enabled ?? true });
    } catch {
      if (alive.current) setError('تعذّر حفظ الموقع. بياناتك محفوظة؛ أعد المحاولة.');
    } finally {
      saveLock.current = false;
      if (alive.current) setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saveLock.current) onClose(); }}>
      <DialogContent size="md" title="تحديد موقع المتجر" description="اختر نقطة على الخريطة أو أدخل إحداثيات / رابطاً مباشراً." onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <Label htmlFor="location-search" className="sr-only">ابحث عن موقع</Label>
            <Input id="location-search" value={searchQuery} onChange={(event) => { searchRequest.current?.abort(); searchRequest.current = null; setSearching(false); setSearchMessage(null); setResults([]); setSearchQuery(event.target.value); }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void search(); } }} placeholder="ابحث عن حي أو مدينة…" />
            <Button type="button" size="sm" variant="outline" onClick={() => void search()} disabled={searching || !searchQuery.trim()}>{searching ? <Loader2 className="size-4 animate-spin" aria-label="جاري البحث" /> : 'بحث'}</Button>
          </div>
          {searchMessage ? <p role="status" className="text-label text-fg-muted">{searchMessage}</p> : null}
          {results.length ? <ul className="max-h-40 overflow-y-auto rounded-md border border-border bg-card">{results.map((result, index) => <li key={index}><button type="button" className="flex min-h-11 w-full items-start gap-2 p-3 text-start text-label hover:bg-muted" onClick={() => { choosePosition(result.lat, result.lng); setAddress(result.label); setResults([]); mapInstance.current?.setView([result.lat, result.lng], 17, { animate: false }); }}><MapPin className="size-4 shrink-0" aria-hidden />{result.label}</button></li>)}</ul> : null}
          <div className="relative h-[240px] overflow-hidden rounded-md border border-border bg-muted sm:h-[280px]">
            <div ref={mapRef} className="size-full" aria-label="خريطة اختيار الموقع" />
            {mapState !== 'ready' ? <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-surface-sunken p-5 text-center text-label text-fg-muted" role="status">
              {mapState === 'loading' ? <><Loader2 className="size-5 animate-spin" aria-hidden /><span>جاري تحميل الخريطة…</span></> : <><p>تعذّر تحميل الخريطة. يمكنك إدخال الموقع يدوياً أدناه.</p><Button type="button" size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>إعادة تحميل الخريطة</Button></>}
            </div> : null}
          </div>
          <p className="text-label text-fg-muted">{position ? 'الموقع محدد. اسحب العلامة أو عدّل الإحداثيات أدناه.' : 'لم يُحدد موقع بعد. اختر نقطة أو استخدم رابطاً / إحداثيات.'}</p>
          <Button type="button" variant="outline" className="self-start gap-2" onClick={useCurrentLocation} disabled={gpsLoading || saving}>{gpsLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Navigation className="size-4" aria-hidden />}تحديد موقعي الحالي</Button>
          <div>
            <Label htmlFor="location-link" className="mb-1.5 block">رابط الخريطة أو الإحداثيات</Label>
            <div className="flex flex-col gap-2 sm:flex-row"><Input id="location-link" value={mapLink} onChange={(event) => setMapLink(event.target.value)} placeholder="https://www.google.com/maps…" dir="ltr" /><Button type="button" variant="outline" onClick={() => {
              const point = parseMapLink(mapLink);
              if (!point) { setError('الرابط غير مدعوم أو لا يحتوي إحداثيات. استخدم رابط Google Maps مباشراً، OpenStreetMap أو خط العرض، خط الطول. الروابط المختصرة لا تُفتح تلقائياً.'); return; }
              choosePosition(point.lat, point.lng); mapInstance.current?.setView([point.lat, point.lng], 16, { animate: false });
            }}>استخدام الموقع</Button></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="location-lat" className="mb-1.5 block">خط العرض</Label><Input id="location-lat" value={latitude} onChange={(event) => { cancelGps(); setLatitude(event.target.value); }} inputMode="decimal" dir="ltr" placeholder="-90 … 90" /></div>
            <div><Label htmlFor="location-lng" className="mb-1.5 block">خط الطول</Label><Input id="location-lng" value={longitude} onChange={(event) => { cancelGps(); setLongitude(event.target.value); }} inputMode="decimal" dir="ltr" placeholder="-180 … 180" /></div>
          </div>
          <div><Label htmlFor="location-address" className="mb-1.5 block">العنوان (اختياري)</Label><Input id="location-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} placeholder="المدينة، الحي، الشارع" /></div>
          <div><Label htmlFor="location-description" className="mb-1.5 block">وصف الموقع (اختياري)</Label><Textarea id="location-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="مثال: بجوار المسجد، الدور الثاني…" rows={2} maxLength={200} /><p className="mt-1 text-end text-[11px] text-fg-subtle" dir="ltr">{description.length}/200</p></div>
          {error ? <p role="alert" className="rounded-md border border-danger/25 bg-danger/5 p-3 text-label text-danger">{error}</p> : null}
        </div>
        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="sm:w-28">إلغاء</Button>
          <Button type="button" className="flex-1 gap-2" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}{saving ? 'جاري الحفظ…' : 'حفظ الموقع'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
