/** LOCAL GUI ONLY. esbuild test entry alias; never imported by production code. */
import { LOCAL_GUI_PROJECT, localGuiIdentity } from './identities';
import type { AuthenticatedRequest, VerifiedUser } from '../../workers/api/types';

export async function verifyFirebaseToken(token: string): Promise<VerifiedUser | null> {
  try {
    const [headerPart, payloadPart, signature] = token.split('.');
    const decode = (part: string) => JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    const header = decode(headerPart);
    const payload = decode(payloadPart);
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== 'LOCAL_GUI_ONLY' || signature !== 'local-gui-not-a-real-signature' ||
        payload.aud !== LOCAL_GUI_PROJECT || payload.exp <= now || payload.iat > now ||
        payload.email_verified !== true) return null;
    const identity = localGuiIdentity(payload.email);
    if (payload.sub !== identity.uid) return null;
    return { uid: identity.uid, email: identity.email, name: identity.name, emailVerified: true,
      authTime: payload.auth_time, issuedAt: payload.iat, expiresAt: payload.exp };
  } catch { return null; }
}
export function getUserId(request: AuthenticatedRequest) { return request.user?.uid ?? null; }
export function isAuthenticated(request: AuthenticatedRequest) { return !!request.user?.uid; }
