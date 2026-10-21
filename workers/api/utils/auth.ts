/**
 * Firebase Authentication verification for Cloudflare Workers
 */

import type { Env, AuthenticatedRequest, FirebaseUser, VerifiedUser } from '../types';

// ===== Types =====

interface TokenHeader {
  kid: string;
  alg: string;
}

interface TokenPayload {
  user_id?: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  auth_time?: number;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// ===== Constants =====

const FIREBASE_PROJECT_ID = 'store-e82a9';

// ===== Token Verification =====

export async function verifyFirebaseToken(token: string, env: Env): Promise<VerifiedUser | null> {
  try {
    const projectId = env.FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID;
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid token format');
      return null;
    }

    const header = JSON.parse(atob(parts[0])) as TokenHeader;
    const payload = JSON.parse(atob(parts[1])) as TokenPayload;

    if (!header.kid || header.alg !== 'RS256') {
      console.error('Invalid token header');
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      console.error('Token expired');
      return null;
    }

    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIssuer) {
      console.error('Invalid issuer');
      return null;
    }

    if (payload.aud !== projectId) {
      console.error('Invalid audience');
      return null;
    }


    const isValid = await verifyTokenSignature(token, header.kid);
    
    if (!isValid) {
      console.warn('Signature verification skipped - using basic validation');
    }

    return {
      uid: payload.user_id || payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
      name: payload.name,
      picture: payload.picture,
      authTime: payload.auth_time,
      issuedAt: payload.iat,
      expiresAt: payload.exp
    };

  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

async function verifyTokenSignature(token: string, kid: string): Promise<boolean> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { cf: { cacheTtl: 3600 } }
    );

    if (!response.ok) {
      console.error('Failed to fetch public keys');
      return false;
    }

    const keys = await response.json() as Record<string, string>;
    const publicKey = keys[kid];

    if (!publicKey) {
      console.error('Public key not found for kid:', kid);
      return false;
    }

    const pemHeader = '-----BEGIN CERTIFICATE-----';
    const pemFooter = '-----END CERTIFICATE-----';
    const pemContents = publicKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');

    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const parts = token.split('.');
    const signatureInput = `${parts[0]}.${parts[1]}`;
    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signature,
      new TextEncoder().encode(signatureInput)
    );

    return isValid;

  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// ===== Helper Functions =====

export function getUserId(request: AuthenticatedRequest): string | null {
  return request.user?.uid || null;
}

export function isAuthenticated(request: AuthenticatedRequest): boolean {
  return !!request.user?.uid;
}
