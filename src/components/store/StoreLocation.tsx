/**
 * StoreLocation — موقع المتجر على الخريطة.
 * أُزيلت التدرّجات والأيقونة الملوّنة؛ اللون الأساسي للتاجر صلب، وأزرار
 * الاتجاهات/الفتح 44px. أنماط Leaflet تُحمَّل مع المكوّن لا مع كل الصفحات.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { transition as motionTransition } from '../../lib/motion';
import { storeScopeStyle } from '../../utils/themeUtils';
import '../../styles/leaflet.css';

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
  const [mapLoaded, setMapLoaded] = useState(false);

  const initMap = useCallback((): void => {
    if (!mapRef.current || mapInstanceRef.current || !location) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomControl: true }).setView(
      [location.lat, location.lng],
      16,
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
    const icon = L.divIcon({
      className: 'store-marker',
      html: `<div class="store-marker-pin"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
    L.marker([location.lat, location.lng], { icon }).addTo(map);
    mapInstanceRef.current = map;
    setMapLoaded(true);
    window.setTimeout(() => map.invalidateSize(), 100);
  }, [location]);

  useEffect(() => {
    if (location?.lat == null || location?.lng == null || !expanded) return;
    const load = (): void => {
      if (window.L) {
        initMap();
        return;
      }
      const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet]');
      if (existing) {
        existing.addEventListener('load', initMap, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.dataset['leaflet'] = 'true';
      script.addEventListener('load', initMap, { once: true });
      document.head.appendChild(script);
    };
    void load();
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [expanded, initMap, location]);

  if (location?.lat == null || location?.lng == null || location.enabled === false) return null;

  const openMaps = (): void => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`, '_blank');
  };
  const directions = (): void => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`, '_blank');
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
            {!mapLoaded ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface-sunken">
                <span className="size-8 animate-spin rounded-full border-2 border-border border-t-[var(--store-primary)]" aria-hidden />
                <span className="text-label text-fg-muted">جاري تحميل الخريطة…</span>
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
