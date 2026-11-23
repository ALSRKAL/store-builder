// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
