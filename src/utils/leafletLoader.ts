import '../styles/leaflet.css';

type Leaflet = NonNullable<Window['L']>;
type LeafletMap = ReturnType<Leaflet['map']>;
let loading: Promise<Leaflet> | null = null;

/** One loader for all consumers; failures can be retried and never leave infinite spinners. */
export function loadLeaflet(): Promise<Leaflet> {
  if (loading) return loading;
  loading = new Promise<Leaflet>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-leaflet]');
    let css = document.querySelector<HTMLLinkElement>('link[data-leaflet-css]');
    const newScript = !script && !window.L;
    const newCss = !css;
    if (!script && !window.L) {
      script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = 'anonymous';
      script.dataset['leaflet'] = 'true';
    }
    if (!css) {
      css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      css.crossOrigin = 'anonymous';
      css.dataset['leafletCss'] = 'true';
    }
    const stylesheet = css;
    let cssReady = Boolean(stylesheet.sheet);
    const cleanup = (): void => {
      window.clearTimeout(timer);
      script?.removeEventListener('load', loaded);
      script?.removeEventListener('error', failed);
      stylesheet.removeEventListener('load', cssLoaded);
      stylesheet.removeEventListener('error', failed);
    };
    const loaded = (): void => {
      if (!window.L || !cssReady) return;
      cleanup();
      resolve(window.L);
    };
    const cssLoaded = (): void => { cssReady = true; loaded(); };
    const failed = (): void => {
      cleanup();
      if (!window.L) script?.remove();
      if (!cssReady) stylesheet.remove();
      loading = null;
      reject(new Error('تعذّر تحميل الخريطة. يمكنك إعادة المحاولة أو إدخال الإحداثيات.'));
    };
    const timer = window.setTimeout(failed, 15000);
    script?.addEventListener('load', loaded);
    script?.addEventListener('error', failed);
    stylesheet.addEventListener('load', cssLoaded);
    stylesheet.addEventListener('error', failed);
    if (newCss) document.head.appendChild(stylesheet);
    if (newScript && script) document.head.appendChild(script);
    loaded();
  });
  return loading;
}

export function mapMarker(L: Leaflet): unknown {
  // No HTML injection, including merchant-provided addresses/descriptions.
  return L.divIcon({ className: 'store-map-marker', html: '', iconSize: [24, 24], iconAnchor: [12, 24] });
}

export function observeMapSize(map: LeafletMap, element: HTMLElement): () => void {
  let disposed = false;
  const resize = (): void => {
    // ResizeObserver deliveries may already be queued when disconnect() runs.
    if (!disposed && element.isConnected) map.invalidateSize({ animate: false, pan: false });
  };
  const timer = window.setTimeout(resize, 250);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(element);
  return () => { disposed = true; window.clearTimeout(timer); observer?.disconnect(); };
}

/** Surface external tile failures as well as loader failures. */
export function addMapTiles(L: Leaflet, map: LeafletMap, onReady: () => void, onError: () => void): () => void {
  const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }) as unknown as {
    addTo: (map: LeafletMap) => void;
    on: (event: string, handler: () => void) => void;
    off: (event: string, handler: () => void) => void;
  };
  let ready = false;
  const timer = window.setTimeout(() => { if (!ready) onError(); }, 15000);
  const loaded = (): void => { ready = true; window.clearTimeout(timer); onReady(); };
  const failed = (): void => { if (!ready) onError(); };
  tiles.on('tileload', loaded);
  tiles.on('tileerror', failed);
  tiles.addTo(map);
  return () => {
    window.clearTimeout(timer);
    tiles.off('tileload', loaded);
    tiles.off('tileerror', failed);
  };
}
