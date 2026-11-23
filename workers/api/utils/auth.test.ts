import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../types';

let privateKey: CryptoKey;
let publicJwk: JsonWebKey;
let verify: typeof import('./auth').verifyFirebaseToken;
const env = { FIREBASE_PROJECT_ID: 'fixture-project' } as Env;
const seconds = Math.floor(Date.now() / 1000);
const claims = () => ({ sub: 'fixture-uid', user_id: 'fixture-uid', email: 'fixture@example.test',
  email_verified: true, name: 'تاجر تجريبي', iat: seconds - 10, auth_time: seconds - 30,
  exp: seconds + 3600, aud: 'fixture-project', iss: 'https://securetoken.google.com/fixture-project' });
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(payload: Record<string, unknown> = claims(), header = { kid: 'fixture-key', alg: 'RS256' }): Promise<string> {
  const input = `${encode(header)}.${encode(payload)}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(input));
  return `${input}.${Buffer.from(signature).toString('base64url')}`;
}
const jwks = (cacheControl = 'public, max-age=60') => new Response(JSON.stringify({ keys: [
  { ...publicJwk, kid: 'fixture-key', alg: 'RS256', use: 'sig' },
] }), { headers: { 'cache-control': cacheControl } });

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  privateKey = pair.privateKey;
  publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
});
beforeEach(async () => {
  vi.resetModules();
  verify = (await import('./auth')).verifyFirebaseToken;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => jwks());
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Firebase mandatory signature verification (local generated keys)', () => {
  it('accepts signed base64url Unicode claims', async () => {
    expect(await verify(await token(), env)).toMatchObject({ uid: 'fixture-uid', name: 'تاجر تجريبي', emailVerified: true });
    expect(fetch).toHaveBeenCalledWith('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  });
  it('rejects a modified payload even when basic claims are valid', async () => {
    const original = await token();
    const parts = original.split('.');
    parts[1] = encode({ ...claims(), email: 'attacker@example.test' });
    expect(await verify(parts.join('.'), env)).toBeNull();
  });
  it('rejects a wrong signature, unsigned token, unknown key and algorithm', async () => {
    const signed = await token();
    const input = signed.slice(0, signed.lastIndexOf('.'));
    expect(await verify(`${input}.${Buffer.alloc(256, 1).toString('base64url')}`, env)).toBeNull();
    expect(await verify(`${input}.`, env)).toBeNull();
    expect(await verify(await token(claims(), { kid: 'unknown', alg: 'RS256' }), env)).toBeNull();
    expect(await verify(await token(claims(), { kid: 'fixture-key', alg: 'none' }), env)).toBeNull();
  });
  it.each([
    { exp: seconds }, { exp: undefined }, { exp: '9999999999' },
    { iat: seconds + 30 }, { iat: undefined }, { auth_time: seconds + 30 },
    { auth_time: undefined }, { sub: '' }, { sub: 'x'.repeat(129) },
    { user_id: 'another-uid' }, { aud: 'other' }, { iss: 'other' },
    { email_verified: 'true' }, { nbf: seconds + 30 },
  ])('rejects invalid required/identity claims %j', async (changes) => {
    expect(await verify(await token({ ...claims(), ...changes }), env)).toBeNull();
  });
  it.each(['garbage', 'a.b.c', 'e30=.e30=.x', '..', 'a.b.c.d'])('fails closed for malformed token %s', async (value) => {
    expect(await verify(value, env)).toBeNull();
  });
  it('fails closed when Google fails, sends malformed JWK or import fails', async () => {
    const signed = await token();
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 503 }));
    expect(await verify(signed, env)).toBeNull();
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    expect(await verify(signed, env)).toBeNull();
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ keys: [] })));
    expect(await verify(signed, env)).toBeNull();
  });
  it('fails closed when a JWKS RSA key cannot be imported', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ keys: [
      { kid: 'fixture-key', kty: 'RSA', n: 'invalid', e: 'invalid', alg: 'RS256' },
    ] })));
    expect(await verify(await token(), env)).toBeNull();
  });
  it('shares JWKS requests and honors max-age and Age without stale fallback', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(seconds * 1000);
    const signed = await token();
    vi.mocked(fetch).mockImplementation(async () => {
      const response = jwks('max-age=60');
      response.headers.set('Age', '20');
      return response;
    });
    await Promise.all([verify(signed, env), verify(signed, env)]);
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime((seconds + 39) * 1000);
    expect(await verify(signed, env)).not.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime((seconds + 40) * 1000);
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));
    expect(await verify(signed, env)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not cache no-store responses', async () => {
    vi.mocked(fetch).mockImplementation(async () => jwks('no-store, max-age=60'));
    const signed = await token();
    await verify(signed, env);
    await verify(signed, env);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
