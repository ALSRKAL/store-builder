export interface MapCoordinates { lat: number; lng: number }

export function isValidCoordinates(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function coordinate(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeLocation(value: unknown): (MapCoordinates & { enabled: boolean; address?: string; description?: string }) | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const location = value as Record<string, unknown>;
  const lat = coordinate(location['lat'] ?? location['latitude']);
  const lng = coordinate(location['lng'] ?? location['longitude']);
  if (!isValidCoordinates(lat, lng)) return null;
  return {
    lat, lng: lng as number, enabled: location['enabled'] !== false,
    ...(typeof location['address'] === 'string' ? { address: location['address'] } : {}),
    ...(typeof location['description'] === 'string' ? { description: location['description'] } : {}),
  };
}

function pair(value: string): MapCoordinates | null {
  const match = value.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return isValidCoordinates(lat, lng) ? { lat, lng } : null;
}

/** Parse only known coordinate-bearing map URLs. Never fetch a pasted URL or render HTML. */
export function parseMapLink(input: string): MapCoordinates | null {
  const direct = pair(input);
  if (direct) return direct;
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const google = ['google.com', 'www.google.com', 'maps.google.com', 'google.co.uk', 'www.google.co.uk', 'google.com.sa', 'www.google.com.sa'].includes(host);
  if (google && (url.pathname === '/maps' || url.pathname.startsWith('/maps/') || host === 'maps.google.com')) {
    for (const key of ['query', 'q', 'destination', 'll']) {
      const value = url.searchParams.get(key);
      if (value) { const result = pair(value); if (result) return result; }
    }
    const exact = url.pathname.match(/!3d([+-]?[\d.]+)!4d([+-]?[\d.]+)/);
    const center = url.pathname.match(/@([+-]?[\d.]+),([+-]?[\d.]+)(?:,|\/|$)/);
    const match = exact ?? center;
    return match ? pair(`${match[1]},${match[2]}`) : null;
  }
  if (host === 'openstreetmap.org' || host === 'www.openstreetmap.org') {
    const lat = url.searchParams.get('mlat');
    const lng = url.searchParams.get('mlon');
    if (lat && lng) return pair(`${lat},${lng}`);
    const match = url.hash.match(/^#map=\d+(?:\.\d+)?\/([+-]?[\d.]+)\/([+-]?[\d.]+)$/);
    return match ? pair(`${match[1]},${match[2]}`) : null;
  }
  if (host === 'maps.apple.com') return pair(url.searchParams.get('ll') ?? url.searchParams.get('q') ?? '');
  return null;
}
