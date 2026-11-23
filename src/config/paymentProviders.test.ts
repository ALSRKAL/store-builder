import { describe, expect, it } from 'vitest';
import { PAYMENT_PROVIDERS, SUPPORTED_COUNTRIES, getProviderCountry, getProvidersByCountry, providerFieldValue, providerRequiresReceipt, validateProviderConfig } from './paymentProviders';

describe('payment provider country and receipt matrix', () => {
  it.each(SUPPORTED_COUNTRIES)('only exposes $code-compatible providers', (country) => {
    for (const provider of getProvidersByCountry(country.code)) {
      expect(provider.countries.includes(country.code) || provider.countries.includes('*')).toBe(true);
      expect(getProviderCountry(provider, country.code)?.code).toBe(country.code);
    }
  });
  it('does not silently assign Yemen to global providers without a stored country', () => {
    const global = Object.values(PAYMENT_PROVIDERS).find((provider) => provider.countries.includes('*'))!;
    expect(getProviderCountry(global, 'SA')?.code).toBe('SA');
    expect(getProviderCountry(global)).toBeNull();
  });
  it.each(Object.values(PAYMENT_PROVIDERS))('validates required fields and COD receipt behavior for $id', (provider) => {
    expect(validateProviderConfig(provider.id, {}).valid).toBe(!provider.fields.some((field) => field.required));
    expect(providerRequiresReceipt({ providerId: provider.id, requireReceipt: true })).toBe(provider.type !== 'cod');
    expect(providerRequiresReceipt({ providerId: provider.id, requireReceipt: false, requiresReceipt: true })).toBe(false);
  });
  it('resolves bank labels but preserves free text and unknown legacy values', () => {
    expect(providerFieldValue(PAYMENT_PROVIDERS.bank_transfer_sa, 'bankName', 'alrajhi')).toBe('الراجحي');
    expect(providerFieldValue(PAYMENT_PROVIDERS.bank_transfer_sa, 'bankName', 'Legacy Bank')).toBe('Legacy Bank');
  });
});
