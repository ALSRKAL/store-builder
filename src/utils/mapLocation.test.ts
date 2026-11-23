import { describe, expect, it } from 'vitest';
import { isValidCoordinates, normalizeLocation, parseMapLink } from './mapLocation';
import { locationSchema } from '../schemas/store';

describe('map location parser and coordinate validation', () => {
  it.each([
    ['15.3694, 44.1910', { lat: 15.3694, lng: 44.191 }],
    ['https://www.google.com/maps/search/?api=1&query=24.7,46.6', { lat: 24.7, lng: 46.6 }],
    ['https://www.google.com/maps/place/Store/@24.7,46.6,16z/data=!3d24.8!4d46.8', { lat: 24.8, lng: 46.8 }],
    ['https://maps.google.com/?q=-90,180', { lat: -90, lng: 180 }],
    ['https://www.openstreetmap.org/#map=16/15.3/44.2', { lat: 15.3, lng: 44.2 }],
    ['https://openstreetmap.org/?mlat=0&mlon=0', { lat: 0, lng: 0 }],
    ['https://maps.apple.com/?ll=1,2', { lat: 1, lng: 2 }],
  ])('parses %s locally', (input, expected) => { expect(parseMapLink(input)).toEqual(expected); });
  it.each([
    'javascript:alert(1)', '<iframe src="https://google.com/maps?q=1,2">',
    'https://google.com.evil.test/maps?q=1,2', 'https://evil.test/?q=1,2',
    'https://user:pass@google.com/maps?q=1,2', 'https://maps.app.goo.gl/abc',
    'https://google.com/maps?q=91,2', 'Infinity,2', '1,181', '',
  ])('rejects unsafe or unresolved input %s', (input) => { expect(parseMapLink(input)).toBeNull(); });
  it('preserves hidden and legacy locations and accepts zero', () => {
    expect(normalizeLocation({ latitude: '0', longitude: '0', enabled: false, address: 'العنوان' })).toEqual({ lat: 0, lng: 0, enabled: false, address: 'العنوان' });
    expect(normalizeLocation({ lat: 1, lng: 2 })?.enabled).toBe(true);
    expect(normalizeLocation({ lat: NaN, lng: 2 })).toBeNull();
    expect(isValidCoordinates(90, -180)).toBe(true);
    expect(locationSchema.safeParse({ lat: 91, lng: 2 }).success).toBe(false);
    expect(locationSchema.safeParse({ latitude: 0, longitude: 0 }).success).toBe(true);
  });
});
