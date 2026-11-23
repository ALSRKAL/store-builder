import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

let mf: Miniflare;
let db: Awaited<ReturnType<Miniflare['getD1Database']>>;
let socket: NonNullable<Awaited<ReturnType<Miniflare['dispatchFetch']>>['webSocket']>;
const events: Array<Record<string, unknown>> = [];
const root = resolve(import.meta.dirname, '..');

function statements(sql: string): string[] {
  const clean = sql.replace(/--[^\n]*/g, '');
  return clean.match(/\s*CREATE\s+TRIGGER[\s\S]*?END\s*;|[^;]+;/gi)?.map(s => s.trim()).filter(Boolean) ?? [];
}
async function request(path: string, method = 'GET', body?: unknown, authenticated = true) {
  return mf.dispatchFetch(`http://localhost${path}`, {
    method,
    headers: { ...(authenticated ? { Authorization: 'Bearer test-owner' } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function version() {
  return db.prepare('SELECT * FROM store_revisions WHERE store_id = ?').bind('shop').first<Record<string, number | string>>();
}
async function eventually(predicate: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Expected realtime event did not arrive');
}

beforeAll(async () => {
  const bundle = await build({
    entryPoints: [resolve(root, 'workers/api/index.ts')], bundle: true, write: false, format: 'esm', platform: 'browser',
    plugins: [{ name: 'local-test-auth', setup(build) {
      build.onLoad({ filter: /\/utils\/auth\.ts$/ }, () => ({ contents: `
        export async function verifyFirebaseToken(token) { return token === 'test-owner' ? { uid: 'owner', email: 'owner@example.test' } : null; }
        export function getUserId(request) { return request.user?.uid || null; }
      `, loader: 'ts' }));
    } }],
  });
  mf = new Miniflare({
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2025-12-23',
    d1Databases: { DB: 'test-store' }, r2Buckets: ['STORE_IMAGES'],
    durableObjects: { STORE_REALTIME: { className: 'StoreRealtime', useSQLite: true } },
    unsafeEvalBinding: undefined,
  });
  db = await mf.getD1Database('DB');
  for (const file of ['workers/schema.sql', 'workers/migrations/add_store_revisions.sql']) {
    for (const statement of statements(await readFile(resolve(root, file), 'utf8'))) await db.prepare(statement).run();
  }
  await db.prepare("INSERT INTO admins(id,email,plan_id,subscription_end) VALUES('owner','owner@example.test','annual','2099-01-01')").run();
  await db.prepare("INSERT INTO stores(id,slug,name,owner_id) VALUES('shop','shop','Original','owner')").run();
  const response = await request('/api/public/store/shop/realtime', 'GET');
  expect(response.status).toBe(426);
  const upgrade = await mf.dispatchFetch('http://localhost/api/public/store/shop/realtime', { headers: { Upgrade: 'websocket' } });
  expect(upgrade.status).toBe(101);
  socket = upgrade.webSocket!;
  socket.addEventListener('message', event => { if (event.data !== 'pong') events.push(JSON.parse(String(event.data))); });
  socket.accept();
  await eventually(() => events.length > 0);
}, 30_000);

afterAll(async () => { socket?.close(); await mf?.dispose(); });

describe('authoritative public caching and per-store realtime runtime', () => {
  it('connects with an authoritative snapshot, rejects unauthenticated publishing and wrong methods', async () => {
    expect(events[0]).toMatchObject({ type: 'snapshot', storeId: 'shop', slug: 'shop', deleted: false });
    expect((await request('/api/public/store/shop/realtime', 'POST', {})).status).toBe(405);
    expect((await request('/api/public/store/shop/reconcile', 'POST', {})).status).toBe(404);
    const before = await version();
    expect((await request('/api/stores/shop/theme', 'PUT', { primary: '#ff0000' }, false)).status).toBe(401);
    expect(await version()).toEqual(before);
  });

  it('invalidates only store metadata after a real theme mutation and never serves old cache to fresh GET', async () => {
    const first = await request('/api/public/store/shop');
    expect(first.headers.get('Cache-Control')).toBe('no-store');
    expect((await request('/api/public/store/shop')).headers.get('X-Cache-Status')).toBe('HIT');
    const previous = await version();
    expect((await request('/api/stores/shop/theme', 'PUT', { primary: '#123456' })).status).toBe(200);
    const current = await version();
    expect(current!.store_revision).toBeGreaterThan(previous!.store_revision);
    expect(current!.products_revision).toBe(previous!.products_revision);
    await eventually(() => events.some(event => event.type === 'revision' && event.revision === current!.revision));
    const fresh = await request('/api/public/store/shop');
    expect(await fresh.json()).toMatchObject({ theme: { primary: '#123456' } });
    expect(fresh.headers.get('X-Resource-Revision')).toBe(String(current!.store_revision));
  });

  it('product writes are atomically versioned and category deletion also invalidates products', async () => {
    expect((await request('/api/products', 'POST', { name: 'Product', price: 10 })).status).toBe(201);
    const list = await (await request('/api/public/store/shop/products')).json() as Array<{ id: string }>;
    expect(list).toHaveLength(1);
    const category = await (await request('/api/categories', 'POST', { name: 'Category' })).json() as { id: string };
    await request(`/api/products/${list[0].id}`, 'PUT', { categoryId: category.id, price: 25 });
    await request('/api/public/store/shop/products');
    const before = await version();
    expect((await request(`/api/categories/${category.id}`, 'DELETE')).status).toBe(200);
    const after = await version();
    expect(after!.products_revision).toBeGreaterThan(before!.products_revision);
    expect(after!.categories_revision).toBeGreaterThan(before!.categories_revision);
    expect(await (await request('/api/public/store/shop/products')).json()).toMatchObject([{ price: 25, categoryId: null }]);
  });

  it('payment mutation changes only payment versions; expiry is derived even without a write', async () => {
    const before = await version();
    expect((await request('/api/payments', 'POST', { providerId: 'stc_pay', countryCode: 'SA', configDetails: { phone: '0512345678' } })).status).toBe(201);
    const current = await version();
    expect(current!.payments_revision).toBeGreaterThan(before!.payments_revision);
    expect(current!.store_revision).toBe(before!.store_revision);
    expect(await (await request('/api/public/store/shop/payment-methods')).json()).toHaveLength(1);
    await db.prepare("UPDATE admins SET plan_id = 'monthly' WHERE id = 'owner'").run();
    expect(await (await request('/api/public/store/shop/payment-methods')).json()).toEqual([]);
    expect(await (await request('/api/public/store/shop')).json()).toMatchObject({ isAnnualPlan: false });
  });

  it('reconnect repairs a missed broadcast, follows slug aliases, and preserves deletion tombstones', async () => {
    await db.prepare("UPDATE stores SET slug = 'renamed', name = 'Renamed' WHERE id = 'shop'").run();
    for (const identifier of ['shop', 'renamed']) {
      expect(await (await request(`/api/public/store/${identifier}`)).json()).toMatchObject({ slug: 'renamed', name: 'Renamed' });
    }
    const reconnected = await mf.dispatchFetch('http://localhost/api/public/store/renamed/realtime', { headers: { Upgrade: 'websocket' } });
    const ws = reconnected.webSocket!;
    const snapshots: unknown[] = [];
    ws.addEventListener('message', event => snapshots.push(JSON.parse(String(event.data))));
    ws.accept();
    await eventually(() => snapshots.length > 0);
    expect(snapshots[0]).toMatchObject({ type: 'snapshot', slug: 'renamed' });
    ws.send(JSON.stringify({ type: 'publish', revision: 999999 }));
    await request('/api/stores/shop', 'DELETE');
    await eventually(() => events.some(event => event.deleted === true));
    expect((await request('/api/public/store/renamed')).status).toBe(404);
    expect((await request('/api/public/store/shop/products')).status).toBe(404);
    expect((await version())!.deleted).toBe(1);
  });
});
