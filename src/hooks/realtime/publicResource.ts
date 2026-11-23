import { z } from 'zod';
import { ApiError } from '../../schemas/api/errors';

export const resources = ['store', 'products', 'categories', 'payments'] as const;
export type Resource = typeof resources[number];
export interface RevisionSnapshot {
  type: 'snapshot' | 'revision';
  storeId: string;
  slug: string;
  revision: number;
  versions: Record<Resource, number>;
  deleted: boolean;
  isActive: boolean;
  isAnnualPlan: boolean;
  subscriptionEnd: string | null;
}

const revisionSchema = z.object({
  type: z.enum(['snapshot', 'revision']), storeId: z.string(), slug: z.string(),
  revision: z.number().int().nonnegative(),
  versions: z.object({ store: z.number().int().nonnegative(), products: z.number().int().nonnegative(),
    categories: z.number().int().nonnegative(), payments: z.number().int().nonnegative() }),
  deleted: z.boolean(), isActive: z.boolean(), isAnnualPlan: z.boolean(),
  subscriptionEnd: z.string().nullable(),
});

export function parseRevision(value: unknown): RevisionSnapshot | null {
  const parsed = revisionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function reconnectDelay(attempt: number, random = Math.random()): number {
  return Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5)) * (0.75 + random * 0.5);
}

interface LoadedVersion { storeId: string; version: number }
const loaded = new Map<string, Partial<Record<Resource, LoadedVersion>>>();
const targets = new Map<string, RevisionSnapshot>();
const MAX_IDENTIFIERS = 100;

export function rememberSnapshot(identifier: string, snapshot: RevisionSnapshot): boolean {
  const current = targets.get(identifier);
  if (current?.storeId === snapshot.storeId && current.revision > snapshot.revision) return false;
  if (!targets.has(identifier) && targets.size >= MAX_IDENTIFIERS) {
    const oldest = targets.keys().next().value;
    if (oldest) { targets.delete(oldest); loaded.delete(oldest); }
  }
  targets.set(identifier, snapshot);
  return true;
}

export function resourcesBehind(identifier: string, snapshot: RevisionSnapshot): Resource[] {
  return resources.filter(resource => {
    const version = loaded.get(identifier)?.[resource] ?? (resource === 'payments'
      ? loaded.get(snapshot.slug)?.payments ?? loaded.get(snapshot.storeId)?.payments : undefined);
    return !version || version.storeId !== snapshot.storeId || version.version < snapshot.versions[resource];
  });
}

export function realtimeUrl(identifier: string): string {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8787';
  const url = new URL(`/api/public/store/${encodeURIComponent(identifier)}/realtime`, base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

/** Reads include abort signals and explicit browser-cache bypass. The header records
 * the actual resource loaded, rather than treating a socket message as data fetched.
 */
export async function readPublicResource<T>(
  identifier: string, resource: Resource, schema: z.ZodType<T>, signal: AbortSignal,
): Promise<T> {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8787';
  const suffix = { store: '', products: '/products', categories: '/categories', payments: '/payment-methods' }[resource];
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${base}/api/public/store/${encodeURIComponent(identifier)}${suffix}`, {
      signal, cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      throw new ApiError(body?.error || `Request failed (${response.status})`, response.status,
        response.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');
    }
    const data: unknown = await response.json();
    const storeId = response.headers.get('X-Store-Id');
    const versionHeader = response.headers.get('X-Resource-Revision');
    const version = versionHeader === null ? NaN : Number(versionHeader);
    const target = targets.get(identifier);
    if (storeId && Number.isSafeInteger(version) && version >= 0) {
      if (target?.storeId === storeId && (target.deleted || target.versions[resource] > version)) {
        if (target.deleted) throw new ApiError('Store not found', 404, 'NOT_FOUND');
        continue;
      }
      const versions = loaded.get(identifier) ?? {};
      versions[resource] = { storeId, version };
      loaded.set(identifier, versions);
    }
    const parsed = schema.safeParse(data);
    // Retain legacy API compatibility, matching services/api validation behavior.
    if (!parsed.success) { console.warn('Public response validation warning:', parsed.error.issues); return data as T; }
    return parsed.data;
  }
  throw new ApiError('Store is updating; please retry', 503, 'INTERNAL_ERROR');
}
