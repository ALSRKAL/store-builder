/**
 * StoreLocation — موقع المتجر على الخريطة.
 * أُزيلت التدرّجات والأيقونة الملوّنة؛ اللون الأساسي للتاجر صلب، وأزرار
 * الاتجاهات/الفتح 44px. أنماط Leaflet تُحمَّل مع المكوّن لا مع كل الصفحات.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { transition as motionTransition } from '../../lib/motion';
import { storeScopeStyle } from '../../utils/themeUtils';
import { addMapTiles, loadLeaflet, mapMarker, observeMapSize } from '../../utils/leafletLoader';
import { normalizeLocation } from '../../utils/mapLocation';

export interface LocationData {
  lat: number;
  lng: number;
  enabled?: boolean | undefined;
  description?: string | null | undefined;
  address?: string | null | undefined;
}

interface StoreLocationProps {
  location: LocationData | null | undefined;
}

export default function StoreLocation({ location }: StoreLocationProps): React.JSX.Element | null {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<ReturnType<NonNullable<Window['L']>['map']> | null>(null);
  const [expanded, setExpanded] = useState(false);
  const normalized = normalizeLocation(location);
  const lat = normalized?.lat;
  const lng = normalized?.lng;
  const visible = normalized?.enabled === true;
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!visible || lat == null || lng == null || !expanded) return;
    let cancelled = false;
    let disposeSize = (): void => {};
    let disposeTiles = (): void => {};
    queueMicrotask(() => { if (!cancelled) setMapState('loading'); });
    void loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current) return;
      const map = L.map(mapRef.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomControl: true }).setView([lat, lng], 16);
      mapInstanceRef.current = map;
      disposeTiles = addMapTiles(L, map, () => { if (!cancelled) setMapState('ready'); }, () => { if (!cancelled) setMapState('error'); });
      L.marker([lat, lng], { icon: mapMarker(L) }).addTo(map);
      disposeSize = observeMapSize(map, mapRef.current);
    }).catch(() => { if (!cancelled) setMapState('error'); });
    return () => {
      cancelled = true;
      disposeSize();
      disposeTiles();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [expanded, lat, lng, visible, attempt]);

  if (!normalized || !visible || !location) return null;

  const openMaps = (): void => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${normalized.lat},${normalized.lng}`, '_blank', 'noopener,noreferrer');
  };
  const directions = (): void => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${normalized.lat},${normalized.lng}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.section
      className="my-8 overflow-hidden rounded-md border border-[var(--store-border)] max-sm:my-6"
      style={{ backgroundColor: 'var(--store-card-bg)', ...storeScopeStyle }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...motionTransition.base, delay: 0.1 }}
    >
      <button
        type="button"
        className="flex min-h-14 w-full items-center justify-between gap-3 p-4 text-start transition-colors hover:bg-[var(--store-body-bg)] max-sm:p-3.5"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-3">
          <MapPin className="size-5 shrink-0 text-[var(--store-primary-text)]" strokeWidth={1.75} aria-hidden />
          <span className="text-start">
            <span className="block text-body font-semibold" style={{ color: 'var(--store-card-text)' }}>موقعنا</span>
            <span className="block max-w-[220px] truncate text-label text-[var(--store-card-secondary)] max-sm:max-w-[180px]">
              {location.description || location.address || 'اضغط لعرض الموقع على الخريطة'}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-[var(--store-card-secondary)]" aria-hidden>
          {expanded ? <ChevronUp className="size-5" strokeWidth={1.75} /> : <ChevronDown className="size-5" strokeWidth={1.75} />}
        </span>
      </button>

      {expanded ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={motionTransition.base} className="px-5 pb-5 max-sm:px-4 max-sm:pb-4">
          <div className="relative mb-4 overflow-hidden rounded-md border border-[var(--store-border)] bg-muted">
            <div ref={mapRef} className="h-[200px] w-full max-sm:h-[180px]" />
            {mapState !== 'ready' ? (
              <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-2 bg-surface-sunken p-4 text-center" role="status">
                {mapState === 'loading' ? <><span className="size-8 animate-spin rounded-full border-2 border-border border-t-[var(--store-primary)]" aria-hidden /><span className="text-label text-fg-muted">جاري تحميل الخريطة…</span></> : <><p className="text-label text-fg-muted">تعذّر تحميل الخريطة. استخدم الاتجاهات أو افتح الموقع في الخرائط أدناه.</p><button type="button" className="min-h-11 rounded-md border border-border px-3 text-label" onClick={() => setAttempt((value) => value + 1)}>إعادة المحاولة</button></>}
              </div>
            ) : null}
          </div>

          {location.description && location.address ? (
            <div className="mb-3 border-s-2 border-[var(--store-border)] ps-3">
              <span className="text-label leading-relaxed text-[var(--store-card-secondary)]">{location.address}</span>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={directions}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--store-button-radius,4px)] px-4 text-label font-medium text-[var(--store-button-text)] transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--store-primary)' }}
            >
              <Navigation className="size-4" strokeWidth={1.75} aria-hidden />
              الاتجاهات
            </button>
            <button
              type="button"
              onClick={openMaps}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--store-button-radius,4px)] border border-[var(--store-border)] px-4 text-label font-medium text-[var(--store-card-text)] transition-colors hover:bg-[var(--store-body-bg)]"
            >
              <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
              فتح في الخرائط
            </button>
          </div>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
