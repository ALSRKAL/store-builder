// @vitest-environment jsdom
import { useEffect } from 'react';
import { act, render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';
import type { AdminProfile } from '../schemas';
import { AuthProvider, useAuth } from './AuthContext';

const mocks = vi.hoisted(() => ({
  listener: null as null | ((user: User | null) => void),
  unsubscribe: vi.fn(), getProfile: vi.fn(), createProfile: vi.fn(), updateProfile: vi.fn(), startTrial: vi.fn(),
}));
vi.mock('../config/firebase', () => ({ auth: {}, googleProvider: {}, googlePopupResolver: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (_auth: unknown, listener: (user: User | null) => void) => {
    mocks.listener = listener;
    return mocks.unsubscribe;
  },
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(), signInWithPopup: vi.fn(), sendPasswordResetEmail: vi.fn(),
}));
vi.mock('../services/api', () => ({ api: {
  admin: { getProfile: mocks.getProfile, createProfile: mocks.createProfile, updateProfile: mocks.updateProfile },
  subscriptions: { startTrial: mocks.startTrial },
} }));
let context: ReturnType<typeof useAuth>;
function Probe(): null {
  const value = useAuth();
  useEffect(() => { context = value; }, [value]);
  return null;
}
const user = (uid = 'fixture') => ({ uid, email: `${uid}@example.test` }) as User;
const active: AdminProfile = { id: 'fixture', email: 'fixture@example.test', isTrial: true,
  trialUsed: true, subscriptionEnd: '2999-01-01T00:00:00Z', subscriptionMonths: 0, planId: 'trial' };
function mount(): ReturnType<typeof render> { return render(<AuthProvider><Probe /></AuthProvider>); }
async function login(uid?: string): Promise<void> {
  await act(async () => { mocks.listener?.(user(uid)); });
  await waitFor(() => expect(context.loading).toBe(false));
}

beforeEach(() => { vi.clearAllMocks(); mocks.getProfile.mockResolvedValue(active); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AuthProvider authoritative profile lifecycle', () => {
  it('adopts setup response without an entitlement-null render or second profile GET', async () => {
    const seen: Array<string | null | undefined> = [];
    function Recorder(): null { const value = useAuth(); seen.push(value.adminData?.subscriptionEnd); return null; }
    render(<AuthProvider><Probe /><Recorder /></AuthProvider>);
    await login();
    const start = seen.length;
    mocks.createProfile.mockResolvedValue({ ...active, storeName: 'Fixture store', storeId: 'fixture-store' });
    await act(async () => { await context.createAdminProfile({ storeName: 'Fixture store' }); });
    expect(context.adminData).toMatchObject({ subscriptionEnd: active.subscriptionEnd, trialUsed: true, storeName: 'Fixture store' });
    expect(seen.slice(start).every((end) => end === active.subscriptionEnd)).toBe(true);
    expect(mocks.getProfile).toHaveBeenCalledTimes(1);
  });
  it('does not poll; refreshes on focus/visibility and keeps entitlement on transient failures', async () => {
    const intervals = vi.spyOn(window, 'setInterval');
    mount();
    await login();
    // testing-library's waitFor owns a 50ms timer; the provider owns none.
    expect(intervals.mock.calls.every((call) => call[1] === 50)).toBe(true);
    mocks.getProfile.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    expect(context.adminData).toEqual(active);
    expect(context.entitlement.active).toBe(true);
    expect(context.profileError).not.toBeNull();
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(context.profileError).toBeNull();
    expect(mocks.startTrial).not.toHaveBeenCalled();
  });
  it('initial profile failures do not become eligible setup/trial actions', async () => {
    mocks.getProfile.mockRejectedValue(new Error('offline'));
    mount();
    await login();
    expect(context.adminData).toBeNull();
    expect(context.profileError).not.toBeNull();
    await expect(context.initTrialAccount()).rejects.toThrow('Trial is not available');
    expect(mocks.startTrial).not.toHaveBeenCalled();
  });
  it('successful null clears profile, unlike an HTTP/network failure', async () => {
    mount();
    await login();
    mocks.getProfile.mockResolvedValueOnce(null);
    await act(async () => { await context.refreshAdminData(); });
    expect(context.adminData).toBeNull();
    expect(context.profileError).toBeNull();
  });
  it('drops stale profile reads across identity changes and logout', async () => {
    let resolveOld!: (profile: AdminProfile) => void;
    mocks.getProfile.mockImplementationOnce(() => new Promise<AdminProfile>((resolve) => { resolveOld = resolve; }));
    mocks.getProfile.mockResolvedValueOnce({ ...active, id: 'second', email: 'second@example.test' });
    mount();
    await act(async () => { mocks.listener?.(user()); });
    await login('second');
    await act(async () => { resolveOld(active); });
    expect(context.adminData?.id).toBe('second');
    let resolveCurrent!: (profile: AdminProfile) => void;
    mocks.getProfile.mockImplementationOnce(() => new Promise<AdminProfile>((resolve) => { resolveCurrent = resolve; }));
    act(() => { void context.refreshAdminData(); });
    await act(async () => { mocks.listener?.(null); resolveCurrent(active); });
    expect(context.user).toBeNull();
    expect(context.adminData).toBeNull();
  });
  it('explicit post-activation refresh does not reuse a pre-activation request', async () => {
    mount();
    await login();
    let resolveOld!: (profile: AdminProfile) => void;
    mocks.getProfile.mockImplementationOnce(() => new Promise<AdminProfile>((resolve) => { resolveOld = resolve; }));
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    const paid = { ...active, isTrial: false, planId: 'annual', subscriptionMonths: 12 };
    mocks.getProfile.mockResolvedValueOnce(paid);
    await act(async () => { await context.refreshAdminData(); });
    await act(async () => { resolveOld(active); });
    expect(context.adminData).toEqual(paid);
    expect(context.entitlement.state).toBe('paid-active');
  });
  it('cleans listeners and ignores requests completed after unmount', async () => {
    const result = mount();
    await login();
    result.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(mocks.getProfile).toHaveBeenCalledTimes(1);
  });
});
