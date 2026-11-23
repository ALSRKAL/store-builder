/** Firebase ID token verification. A signature failure is always unauthorized. */
import type { Env, AuthenticatedRequest, VerifiedUser } from '../types';

interface GoogleJwk extends JsonWebKey {
  kid: string;
}

interface KeySet {
  keys: Map<string, GoogleJwk>;
  expiresAt: number;
}

const FIREBASE_PROJECT_ID = 'store-e82a9';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let cachedKeys: KeySet | null = null;
let pendingKeys: Promise<KeySet> | null = null;

function decodeBase64Url(value: string): Uint8Array {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64url');
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
}

function decodeObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(decodeBase64Url(value)));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JWT object');
  return parsed as Record<string, unknown>;
}

async function getGoogleKeys(): Promise<KeySet> {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys;
  if (pendingKeys) return pendingKeys;
  pendingKeys = (async () => {
    const response = await fetch(GOOGLE_JWKS_URL);
    if (!response.ok) throw new Error('Public key request failed');
    const document = await response.json() as { keys?: GoogleJwk[] };
    if (!Array.isArray(document.keys) || !document.keys.length) throw new Error('Invalid JWKS');
    const keys = new Map<string, GoogleJwk>();
    for (const key of document.keys) {
      if (typeof key.kid !== 'string' || !key.kid || key.kty !== 'RSA' ||
          typeof key.n !== 'string' || typeof key.e !== 'string' ||
          (key.alg !== undefined && key.alg !== 'RS256') ||
          (key.use !== undefined && key.use !== 'sig') || keys.has(key.kid)) {
        throw new Error('Invalid signing key');
      }
      keys.set(key.kid, key);
    }
    const cacheControl = response.headers.get('cache-control') ?? '';
    const maxAge = /(?:^|,)\s*max-age\s*=\s*"?(\d+)"?/i.exec(cacheControl);
    const age = Math.max(0, Number(response.headers.get('age')) || 0);
    const ttl = /(?:^|,)\s*(?:no-store|no-cache)(?:\s|,|$)/i.test(cacheControl)
      ? 0 : Math.max(0, Number(maxAge?.[1] ?? 0) - age);
    const result = { keys, expiresAt: Date.now() + ttl * 1000 };
    cachedKeys = result;
    return result;
  })();
  try {
    return await pendingKeys;
  } finally {
    pendingKeys = null;
  }
}

const isTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export async function verifyFirebaseToken(token: string, env: Env): Promise<VerifiedUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const header = decodeObject(parts[0]);
    const payload = decodeObject(parts[1]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid || header.crit !== undefined) return null;
    const projectId = env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID;
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== `https://securetoken.google.com/${projectId}` || payload.aud !== projectId ||
        typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128 ||
        (payload.user_id !== undefined && payload.user_id !== payload.sub) ||
        !isTimestamp(payload.exp) || payload.exp <= now ||
        !isTimestamp(payload.iat) || payload.iat > now || payload.iat >= payload.exp ||
        !isTimestamp(payload.auth_time) || payload.auth_time > now || payload.auth_time > payload.iat ||
        (payload.nbf !== undefined && (!isTimestamp(payload.nbf) || payload.nbf > now))) return null;
    if ((payload.email !== undefined && typeof payload.email !== 'string') ||
        (payload.email_verified !== undefined && typeof payload.email_verified !== 'boolean') ||
        (payload.name !== undefined && typeof payload.name !== 'string') ||
        (payload.picture !== undefined && typeof payload.picture !== 'string')) return null;

    const keySet = await getGoogleKeys();
    const jwk = keySet.keys.get(header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key,
      decodeBase64Url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    if (!valid) return null;
    return {
      uid: payload.sub,
      email: payload.email as string | undefined,
      emailVerified: payload.email_verified as boolean | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      authTime: payload.auth_time,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
    };
  } catch {
    // Includes malformed tokens, network/JWKS/import failures and bad signatures.
    // Never log the bearer token or accept stale keys after their cache lifetime.
    return null;
  }
}

export function getUserId(request: AuthenticatedRequest): string | null {
  return request.user?.uid || null;
}

export function isAuthenticated(request: AuthenticatedRequest): boolean {
  return !!request.user?.uid;
}
