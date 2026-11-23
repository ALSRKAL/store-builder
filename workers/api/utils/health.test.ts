import { afterEach, describe, expect, it, vi } from 'vitest';
import { healthResponse } from './health';
import type { Env } from '../types';

const tables = ['admins', 'stores', 'products', 'categories', 'store_payment_methods', 'payment_receipts',
  'orders', 'trial_ledger', 'store_revisions', 'store_slug_aliases', 'rate_limits'];
function environment(names = tables) {
  const all = vi.fn().mockResolvedValue({ success: true, results: names.map(name => ({ name })) });
  const prepare = vi.fn().mockReturnValue({ bind: vi.fn().mockReturnValue({ all }) });
  const head = vi.fn().mockResolvedValue(null);
  const idFromName = vi.fn().mockReturnValue({});
  return { env: { DB: { withSession: vi.fn().mockReturnValue({ prepare }) }, R2_BUCKET: { head },
    STORE_REALTIME: { idFromName }, RELEASE_ID: 'test-release' } as unknown as Env, all, prepare, head, idFromName };
}
afterEach(() => vi.restoreAllMocks());
describe('liveness and read-only readiness', () => {
  it('does not require a healthy database for liveness and does not write', async () => {
    const { env, prepare, head } = environment();
    const response = await healthResponse(new Request('https://example.test/api/health'), env);
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ status: 'ok', releaseId: 'test-release' });
    expect(prepare).not.toHaveBeenCalled();
    expect(head).not.toHaveBeenCalled();
  });
  it('checks required schema and bindings without creating objects', async () => {
    const { env, prepare, head, idFromName } = environment();
    const response = await healthResponse(new Request('https://example.test/api/ready'), env);
    expect(response?.status).toBe(200);
    expect((await response?.json() as { status: string }).status).toBe('ready');
    expect(prepare.mock.calls[0][0]).toMatch(/^SELECT/);
    expect(head).toHaveBeenCalledWith('__readiness__');
    expect(idFromName).toHaveBeenCalledWith('__readiness__');
    expect(response?.headers.get('Cache-Control')).toBe('no-store');
  });
  it('fails closed for missing schema', async () => {
    const { env } = environment(['admins']);
    expect((await healthResponse(new Request('https://example.test/api/ready'), env))?.status).toBe(503);
  });
  it('fails closed without returning sensitive failure text', async () => {
    const { env, all, head } = environment();
    all.mockRejectedValue(new Error('database-password-must-not-appear'));
    head.mockRejectedValue(new Error('storage-secret-must-not-appear'));
    const response = await healthResponse(new Request('https://example.test/api/ready'), env);
    expect(response?.status).toBe(503);
    expect(await response?.text()).not.toMatch(/password|secret/);
  });
  it('rejects writes and supports HEAD with no body', async () => {
    const { env } = environment();
    expect((await healthResponse(new Request('https://example.test/api/ready', { method: 'POST' }), env))?.status).toBe(405);
    const head = await healthResponse(new Request('https://example.test/api/ready', { method: 'HEAD' }), env);
    expect(head?.status).toBe(200);
    expect(await head?.text()).toBe('');
  });
});
