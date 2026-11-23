/** LOCAL GUI ONLY. Loaded before the real App; no production imports. */
if (location.hostname !== '127.0.0.1') throw new Error('LOCAL GUI requires a loopback origin');
const localOrigins = new Set([location.origin, new URL(import.meta.env.VITE_API_URL).origin]);
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, location.href);
  if (url.origin === 'https://photon.komoot.io' && url.pathname === '/api/') {
    // Search exercises the actual LocationPicker result handling, without sending queries remotely.
    return new Response(JSON.stringify({ features: [{
      geometry: { type: 'Point', coordinates: [44.191, 15.3694] },
      properties: { name: 'موقع تجريبي محلي', city: 'مدينة خيالية', country: 'LOCAL GUI' },
    }] }), { headers: { 'Content-Type': 'application/json' } });
  }
  if (!localOrigins.has(url.origin)) throw new Error(`LOCAL GUI blocked remote fetch: ${url.origin}`);
  return originalFetch(input, init);
};
const originalOpen = window.open.bind(window);
window.open = ((url, target, features) => {
  if (url && !localOrigins.has(new URL(String(url), location.href).origin)) {
    console.warn('LOCAL GUI blocked external window navigation');
    return null;
  }
  return originalOpen(url, target, features);
}) as typeof window.open;
document.addEventListener('click', event => {
  const element = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (element instanceof HTMLAnchorElement && !localOrigins.has(new URL(element.href, location.href).origin)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    console.warn('LOCAL GUI blocked external link navigation');
  }
}, true);
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition = (success) => {
    // Fixed fictitious position: never request actual device coordinates.
    window.setTimeout(() => success({ coords: { latitude: 15.3694, longitude: 44.191,
      accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now() } as GeolocationPosition), 50);
  };
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register = async () => { throw new Error('LOCAL GUI disables service worker registration'); };
}
console.info('LOCAL GUI ONLY: fake auth, isolated worker, fictitious map search/GPS, no remote contacts/orders');
