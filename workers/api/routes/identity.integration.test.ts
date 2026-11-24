import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Env } from '../types';
import { getAdminProfile, updateAdminProfile } from './admin';
import { updateStore } from './stores';
import { resolveStoreIdentity } from '../utils/storeLookup';

const root = resolve(import.meta.dirname, '../../..');
const files = ['workers/migrations-managed/0001_baseline.sql', 'workers/migrations-managed/0002_store_revisions.sql', 'workers/migrations-managed/0003_trial_ledger.sql', 'workers/migrations-managed/0004_store_description.sql'];

function statements(sql: string): string[] {
  return sql.replace(/--[^\n]*/g, '').match(/\s*CREATE\s+TRIGGER[\s\S]*?END\s*;|[^;]+;/gi)?.map(value => value.trim()).filter(Boolean) ?? [];
}

let mf: Miniflare;
let db: D1Database;
let env: Env;

async function responseJson(response: Response): Promise<Record<string, unknown> | null> {
  return (await response.json()) as Record<string, unknown> | null;
}

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default { fetch() { return new Response("ok") } }',
    d1Databases: { DB: 'identity-test' }, d1Persist: false });
  db = await mf.getD1Database('DB') as unknown as D1Database;
  for (const file of files) for (const statement of statements(await readFile(resolve(root, file), 'utf8'))) await db.prepare(statement).run();
  env = { DB: db } as unknown as Env;
});

afterAll(async () => { await mf.dispose(); });

async function seedStore(owner: string, id: string, slug: string) {
  await db.prepare(`INSERT INTO admins (id, email, store_name, store_id, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(owner, `${owner}@example.test`, 'متجر قديم', id, slug, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z').run();
  await db.prepare(`INSERT INTO stores (id, slug, name, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, slug, 'متجر قديم', owner, '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z').run();
}

describe('store rename and slug safety', () => {
  it('renames in place, syncs admins, and keeps the old slug resolvable', async () => {
    await seedStore('owner-1', 'shop-one', 'shop-one');
    const response = await updateStore(env, 'shop-one', 'owner-1', { name: 'متجر الأزياء', slug: 'mtjr-alazya' });
    expect(response.status).toBe(200);
    const store = await db.prepare(`SELECT id, slug, name FROM stores WHERE owner_id = ?`).bind('owner-1').first<{ id: string; slug: string; name: string }>();
    expect(store).toEqual({ id: 'shop-one', slug: 'mtjr-alazya', name: 'متجر الأزياء' });
    const admin = await db.prepare(`SELECT store_name, slug FROM admins WHERE id = ?`).bind('owner-1').first<{ store_name: string; slug: string }>();
    expect(admin).toEqual({ store_name: 'متجر الأزياء', slug: 'mtjr-alazya' });
    expect((await resolveStoreIdentity(db, 'shop-one'))?.id).toBe('shop-one');
    expect((await resolveStoreIdentity(db, 'mtjr-alazya'))?.slug).toBe('mtjr-alazya');
  });

  it('stores a bounded merchant description for social metadata', async () => {
    await seedStore('desc-owner', 'desc-store', 'desc-store');
    const saved = await updateStore(env, 'desc-store', 'desc-owner', { description: 'أفضل متجر للملابس في صنعاء' });
    expect(saved.status).toBe(200);
    expect(await db.prepare(`SELECT description FROM stores WHERE id = ?`).bind('desc-store').first<{ description: string }>()).toEqual({ description: 'أفضل متجر للملابس في صنعاء' });
    expect((await updateStore(env, 'desc-store', 'desc-owner', { description: 'x'.repeat(301) })).status).toBe(400);
    expect((await updateStore(env, 'desc-store', 'desc-owner', { logo: 'https://cdn.example.test/logo.png' })).status).toBe(200);
    expect(await db.prepare(`SELECT logo FROM admins WHERE id = ?`).bind('desc-owner').first<{ logo: string }>()).toEqual({ logo: 'https://cdn.example.test/logo.png' });
  });

  it('rejects a slug owned by another store or reserved', async () => {
    await seedStore('owner-2', 'shop-two', 'shop-two');
    await seedStore('owner-3', 'shop-three', 'shop-three');
    expect((await updateStore(env, 'shop-three', 'owner-3', { slug: 'shop-two' })).status).toBe(409);
    expect((await updateStore(env, 'shop-three', 'owner-3', { slug: 'admin' })).status).toBe(409);
    expect((await updateStore(env, 'shop-three', 'owner-3', { slug: 'Bad Slug' })).status).toBe(400);
  });
});

describe('admin email and legacy re-key safety', () => {
  it('updates the login email and rejects duplicates', async () => {
    await seedStore('email-owner', 'email-store', 'email-store');
    await seedStore('email-other', 'email-other-store', 'email-other-store');
    expect((await updateAdminProfile(env, 'email-owner', { email: 'New@Example.test' })).status).toBe(200);
    expect((await db.prepare(`SELECT email FROM admins WHERE id = ?`).bind('email-owner').first<{ email: string }>())?.email).toBe('new@example.test');
    expect((await updateAdminProfile(env, 'email-owner', { email: 'email-other@example.test' })).status).toBe(409);
  });

  it('refuses unverified legacy re-key and accepts verified adoption', async () => {
    await seedStore('legacy-owner', 'legacy-store', 'legacy-store');
    const unverified = await getAdminProfile(env, 'legacy-new-uid', 'legacy-owner@example.test', false);
    expect(unverified.status).toBe(200);
    expect(await responseJson(unverified)).toBeNull();
    expect(await db.prepare(`SELECT id FROM admins WHERE email = ?`).bind('legacy-owner@example.test').first<{ id: string }>()).toEqual({ id: 'legacy-owner' });

    const verified = await getAdminProfile(env, 'legacy-new-uid', 'legacy-owner@example.test', true);
    expect(verified.status).toBe(200);
    expect(await db.prepare(`SELECT id FROM admins WHERE email = ?`).bind('legacy-owner@example.test').first<{ id: string }>()).toEqual({ id: 'legacy-new-uid' });
  });

  it('reconciles a verified token email without transferring ownership', async () => {
    await seedStore('reconcile-owner', 'reconcile-store', 'reconcile-store');
    await getAdminProfile(env, 'reconcile-owner', 'changed@example.test', true);
    expect((await db.prepare(`SELECT email FROM admins WHERE id = ?`).bind('reconcile-owner').first<{ email: string }>())?.email).toBe('changed@example.test');
    expect((await db.prepare(`SELECT owner_id FROM stores WHERE id = ?`).bind('reconcile-store').first<{ owner_id: string }>())?.owner_id).toBe('reconcile-owner');
  });
});
