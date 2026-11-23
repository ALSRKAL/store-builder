// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LocationPicker from './LocationPicker';

vi.mock('../../utils/leafletLoader', () => ({ loadLeaflet: vi.fn().mockRejectedValue(new Error('offline')), addMapTiles: vi.fn(), mapMarker: vi.fn(), observeMapSize: vi.fn() }));
import { loadLeaflet } from '../../utils/leafletLoader';
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('LocationPicker offline and saved location behavior', () => {
  it('keeps saved address/hidden flag without reverse geocoding and saves coordinate edits offline', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const fetch = vi.spyOn(globalThis, 'fetch');
    const view = render(<LocationPicker currentLocation={{ lat: 1, lng: 2, address: 'عنوان مخصص', enabled: false }} onSave={onSave} onClose={() => {}} />);
    await screen.findByRole('button', { name: 'إعادة تحميل الخريطة' });
    view.rerender(<LocationPicker currentLocation={{ lat: 1, lng: 2, address: 'عنوان جديد من الخلفية', enabled: false }} onSave={onSave} onClose={() => {}} />);
    expect((screen.getByLabelText('العنوان (اختياري)') as HTMLInputElement).value).toBe('عنوان مخصص');
    fireEvent.change(screen.getByLabelText('خط العرض'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('خط الطول'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الموقع' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ lat: 0, lng: 0, enabled: false, address: 'عنوان مخصص', description: '' }));
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });
  it('keeps manual coordinates when an older GPS result arrives after editing', async () => {
    let completeGps: PositionCallback | undefined;
    const getCurrentPosition = vi.fn((success: PositionCallback) => { completeGps = success; });
    const previous = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    const onSave = vi.fn().mockResolvedValue(undefined);
    try {
      render(<LocationPicker currentLocation={{ lat: 15, lng: 44 }} onSave={onSave} onClose={() => {}} />);
      await screen.findByRole('button', { name: 'إعادة تحميل الخريطة' });
      fireEvent.click(screen.getByRole('button', { name: 'تحديد موقعي الحالي' }));
      fireEvent.change(screen.getByLabelText('خط العرض'), { target: { value: '91' } });
      await act(async () => { completeGps?.({ coords: { latitude: 15.3694, longitude: 44.191 } } as GeolocationPosition); });
      expect(screen.getByLabelText('خط العرض')).toHaveValue('91');
      fireEvent.click(screen.getByRole('button', { name: 'حفظ الموقع' }));
      expect(screen.getByRole('alert')).toHaveTextContent('خط العرض بين -90 و90');
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText('خط العرض'), { target: { value: '15.5' } });
      fireEvent.click(screen.getByRole('button', { name: 'حفظ الموقع' }));
      await waitFor(() => expect(onSave).toHaveBeenCalledWith({ lat: 15.5, lng: 44, address: '', description: '', enabled: true }));
    } finally {
      if (previous) Object.defineProperty(navigator, 'geolocation', previous);
      else Reflect.deleteProperty(navigator, 'geolocation');
    }
  });

  it('does not save a default unchosen location, parses direct links safely and offers retry', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LocationPicker onSave={onSave} onClose={() => {}} />);
    await screen.findByRole('button', { name: 'إعادة تحميل الخريطة' });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الموقع' }));
    expect(screen.getByRole('alert').textContent).toContain('حدد الموقع أولاً');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('رابط الخريطة أو الإحداثيات'), { target: { value: 'https://evil.test/maps?q=1,2' } });
    fireEvent.click(screen.getByRole('button', { name: 'استخدام الموقع' }));
    expect(screen.getByRole('alert').textContent).toContain('الرابط غير مدعوم');
    fireEvent.change(screen.getByLabelText('رابط الخريطة أو الإحداثيات'), { target: { value: 'https://www.google.com/maps?q=15,44' } });
    fireEvent.click(screen.getByRole('button', { name: 'استخدام الموقع' }));
    expect((screen.getByLabelText('خط العرض') as HTMLInputElement).value).toBe('15');
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل الخريطة' }));
    await waitFor(() => expect(loadLeaflet).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الموقع' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ lat: 15, lng: 44, enabled: true, address: '', description: '' }));
  });
});
