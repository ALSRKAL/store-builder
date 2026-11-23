import type { Env } from '../types';
import type { StoreRevision } from './protocol';

export interface RevisionRow {
  store_id: string;
  owner_id: string;
  slug: string;
  revision: number;
  store_revision: number;
  products_revision: number;
  categories_revision: number;
  payments_revision: number;
  deleted: number;
  is_active: number | null;
  store_is_active: number | null;
  plan_id: string | null;
  subscription_end: string | null;
}

const columns = `r.*, s.is_active, a.store_is_active, a.plan_id, a.subscription_end`;
const joins = `FROM store_revisions r LEFT JOIN stores s ON s.id = r.store_id
  LEFT JOIN admins a ON a.id = s.owner_id`;

/** Each public request starts at D1 primary, never an eventually-consistent version cache. */
export function primaryEnv(env: Env): Env {
  return { ...env, DB: env.DB.withSession('first-primary') as unknown as D1Database };
}

export function revisionSnapshot(row: RevisionRow, now = Date.now()): StoreRevision {
  const subscriptionValid = Boolean(row.subscription_end && Date.parse(row.subscription_end) > now);
  return {
    storeId: row.store_id,
    slug: row.slug,
    revision: row.revision,
    versions: { store: row.store_revision, products: row.products_revision,
      categories: row.categories_revision, payments: row.payments_revision },
    deleted: row.deleted === 1,
    isActive: row.deleted !== 1 && row.is_active === 1 && row.store_is_active !== 0,
    isAnnualPlan: row.deleted !== 1 && row.plan_id === 'annual' && subscriptionValid,
    subscriptionEnd: row.subscription_end,
  };
}

export async function resolveStoreRevision(env: Env, identifier: string): Promise<RevisionRow | null> {
  // Current slugs win over historical aliases; ID remains a stable socket identity.
  return env.DB.prepare(`SELECT ${columns} ${joins}
    WHERE r.store_id = COALESCE(
      (SELECT id FROM stores WHERE slug = ?),
      (SELECT id FROM stores WHERE id = ?),
      (SELECT store_id FROM store_slug_aliases WHERE alias = ?),
      (SELECT store_id FROM store_revisions WHERE store_id = ?)) LIMIT 1`)
    .bind(identifier, identifier, identifier, identifier).first<RevisionRow>();
}

export async function readStoreRevision(env: Env, storeId: string): Promise<RevisionRow | null> {
  return env.DB.prepare(`SELECT ${columns} ${joins} WHERE r.store_id = ?`)
    .bind(storeId).first<RevisionRow>();
}

/** Identity comes only from a verified caller or an authorized subscriber route, never request JSON. */
export function affectedOwner(path: string, userId: string): string {
  const subscriber = path.match(/^\/api\/admin\/subscribers\/([\w-]+)(?:\/|$)/);
  return subscriber?.[1] ?? userId;
}

export function isPublicMutation(method: string, path: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    /^\/api\/(stores|products|categories|payments|subscriptions|admin)(?:\/|$)/.test(path);
}

export async function publishOwnerRevisions(env: Env, ownerId: string): Promise<void> {
  const rows = await primaryEnv(env).DB.prepare(
    'SELECT store_id FROM store_revisions WHERE owner_id = ?').bind(ownerId).all<{ store_id: string }>();
  await Promise.all(rows.results.map(async ({ store_id }) => {
    const stub = env.STORE_REALTIME.get(env.STORE_REALTIME.idFromName(store_id));
    // Private DO namespace only; no public HTTP route forwards this path.
    const response = await stub.fetch(new Request('https://realtime.internal/reconcile', {
      method: 'POST', headers: { 'X-Store-Id': store_id },
    }));
    if (!response.ok) throw new Error(`Realtime reconciliation failed: ${response.status}`);
  }));
}
