import { describe, expect, it } from 'vitest';
import { buildSettingsAdminData } from './settingsAdminData';

describe('buildSettingsAdminData', () => {
  it('keeps the renamed public slug so the merchant can see the current domain', () => {
    expect(buildSettingsAdminData({
      id: 'owner-1',
      email: 'merchant@example.test',
      storeName: 'متجر جديد',
      storeId: 'old-domain',
      slug: 'new-domain',
      whatsapp: '967777123456',
      subscriptionEnd: '2027-01-01T00:00:00.000Z',
    }, 'owner-1')).toEqual({
      uid: 'owner-1',
      storeName: 'متجر جديد',
      email: 'merchant@example.test',
      whatsapp: '967777123456',
      storeId: 'old-domain',
      slug: 'new-domain',
      subscriptionEnd: '2027-01-01T00:00:00.000Z',
    });
  });

  it('omits absent optional values instead of rendering empty fields', () => {
    expect(buildSettingsAdminData({
      id: 'owner-2',
      email: 'second@example.test',
      storeSlug: null,
      logo: null,
      storeLogo: null,
    }, 'owner-2')).toEqual({
      uid: 'owner-2',
      storeName: '',
      email: 'second@example.test',
    });
  });

  it('falls back to the store logo alias when the primary logo is empty', () => {
    expect(buildSettingsAdminData({
      id: 'owner-3',
      email: 'third@example.test',
      storeLogo: '/logo.png',
    }, 'owner-3').logo).toBe('/logo.png');
  });
});
