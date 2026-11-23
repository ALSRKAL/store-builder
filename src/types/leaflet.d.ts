/**
 * تعريفات Leaflet المستخدمة في LocationPicker وStoreLocation.
 * نوع واحد مشترك يمنع تعارض `declare global` بين الملفين.
 */

export {};

interface LeafletLatLng {
  lat: number;
  lng: number;
}

interface LeafletMap {
  setView: (coords: [number, number], zoom: number, options?: { animate?: boolean }) => LeafletMap;
  invalidateSize: (options?: { animate?: boolean; pan?: boolean }) => void;
  stop: () => LeafletMap;
  remove: () => void;
  on: (event: string, handler: (event: { latlng: LeafletLatLng }) => void) => void;
}

interface LeafletMarker {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (coords: [number, number]) => void;
  on: (event: string, handler: (event: { target: { getLatLng: () => LeafletLatLng } }) => void) => void;
}

interface LeafletStatic {
  map: (
    element: HTMLElement,
    options?: {
      scrollWheelZoom?: boolean;
      dragging?: boolean;
      zoomControl?: boolean;
      zoomAnimation?: boolean;
      markerZoomAnimation?: boolean;
      inertia?: boolean;
    },
  ) => LeafletMap;
  tileLayer: (url: string, options: { attribution: string }) => { addTo: (map: LeafletMap) => void };
  divIcon: (options: {
    className: string;
    html: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }) => unknown;
  marker: (
    coords: [number, number],
    options: { draggable?: boolean; icon?: unknown },
  ) => LeafletMarker;
  Browser: { mobile: boolean };
}

declare global {
  interface Window {
    L?: LeafletStatic;
  }
}
