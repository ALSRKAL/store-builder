import { describe, expect, it } from 'vitest';
import { getEntitlement, getEntitlementRoute } from './authEntitlement';
import type { AdminProfile } from '../schemas';

const timestamp = Date.parse('2026-11-23T10:00:00Z');
const profile = (data: Partial<AdminProfile> = {}): AdminProfile => ({ id: 'fixture', email: 'fixture@example.test', ...data });
const future = '2026-11-30T10:00:00Z';
const past = '2026-11-22T10:00:00Z';

describe('authoritative entitlement routing', () => {
  it('allows an explicit trial only for a genuinely eligible profile', () => {
    expect(getEntitlement(null, timestamp)).toMatchObject({ state: 'eligible', canStartTrial: true, active: false });
    expect(getEntitlement(profile({ isTrial: true, planId: 'trial' }), timestamp).canStartTrial).toBe(true);
    expect(getEntitlementRoute(null, timestamp)).toBe('/admin/verify');
  });
  it('active trial with trialUsed remains entitled without being eligible again', () => {
    const active = profile({ isTrial: true, trialUsed: true, subscriptionEnd: future });
    expect(getEntitlement(active, timestamp)).toMatchObject({ state: 'trial-active', active: true, canStartTrial: false });
    expect(getEntitlementRoute(active, timestamp)).toBe('/admin/setup');
    expect(getEntitlementRoute({ ...active, storeName: 'Fixture' }, timestamp)).toBe('/admin/dashboard');
  });
  it.each([past, 'invalid-date', '2026-11-23T10:00:00Z'])('expired/malformed trial cannot restart %s', (end) => {
    const expired = profile({ isTrial: true, trialUsed: false, subscriptionEnd: end });
    expect(getEntitlement(expired, timestamp)).toMatchObject({ state: 'trial-expired', active: false, canStartTrial: false });
    expect(getEntitlementRoute(expired, timestamp)).toBe('/admin/verify');
  });
  it('ledger-only used identity cannot restart after profile deletion', () => {
    expect(getEntitlement(profile({ trialUsed: true }), timestamp)).toMatchObject({ state: 'trial-used', canStartTrial: false });
  });
  it.each([future, past])('paid evidence beats stale default trial flags %s', (end) => {
    const paid = profile({ isTrial: true, planId: 'annual', subscriptionMonths: 12, subscriptionEnd: end });
    expect(getEntitlement(paid, timestamp)).toMatchObject({ state: end === future ? 'paid-active' : 'paid-expired', isTrial: false, canStartTrial: false });
  });
  it('blocked accounts route consistently', () => {
    expect(getEntitlementRoute(profile({ subscriptionEnd: future, isTrial: true, dashboardIsActive: false }), timestamp))
      .toBe('/admin/blocked');
  });
});
