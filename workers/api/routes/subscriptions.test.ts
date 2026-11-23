import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Miniflare } from 'miniflare';
import { handleSubscriptions } from './subscriptions';
import { handleAdmin } from './admin';
import type { Env, AuthenticatedRequest } from '../types';

let mf: Miniflare;
let env: Env;
const schema = readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../../migrations/add_trial_ledger.sql', import.meta.url), 'utf8');
// D1 exec treats each line as a statement; preserve trigger bodies as one SQL.
async function apply(sql: string): Promise<void> {
  let statement = '';
  let trigger = false;
  for (const line of sql.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('--')) continue;
    statement += `${line}\n`;
    if (/^CREATE TRIGGER/i.test(line.trim())) trigger = true;
    if ((!trigger && line.trimEnd().endsWith(';')) || (trigger && line.trim() === 'END;')) {
      await env.DB.prepare(statement).run();
      statement = '';
      trigger = false;
    }
  }
}
function request(uid = 'fixture', email = 'fixture@example.test', path = '/api/subscriptions/trial', code?: string): AuthenticatedRequest {
  return Object.assign(new Request(`https://fixture.test${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    ...(code ? { body: JSON.stringify({ code }) } : {}),
  }), { user: { uid, email } });
}
const trial = (uid?: string, email?: string) => handleSubscriptions(request(uid, email), env, '/api/subscriptions/trial');
const profile = () => env.DB.prepare('SELECT * FROM admins WHERE id = ?').bind('fixture').first<Record<string, unknown>>();

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("ok")}}', d1Databases: ['DB'] });
  env = { DB: await mf.getD1Database('DB') } as unknown as Env;
  await apply(schema);
  await apply(migration);
}, 30000);
beforeEach(async () => {
  await env.DB.batch(['admins', 'trial_ledger', 'subscription_codes'].map((table) => env.DB.prepare(`DELETE FROM ${table}`)));
});
afterAll(async () => { await mf?.dispose(); });

describe('trial ledger D1 integration (isolated local database)', () => {
  it('grants once and retry keeps the exact end date', async () => {
    const first = await trial();
    expect(first.status).toBe(200);
    const initial = await first.json();
    const retry = await trial();
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(initial);
    expect((await env.DB.prepare('SELECT COUNT(*) AS count FROM trial_ledger').first<{ count: number }>())?.count).toBe(2);
  });
  it('simultaneous retries grant exactly one shared trial end', async () => {
    const responses = await Promise.all(Array.from({ length: 8 }, () => trial()));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const bodies = await Promise.all(responses.map((response) => response.json() as Promise<{ subscriptionEnd: string }>));
    expect(new Set(bodies.map((body) => body.subscriptionEnd)).size).toBe(1);
  });
  it('simultaneous distinct UIDs with case-insensitive same email have one winner', async () => {
    const responses = await Promise.all([trial('fixture', 'Fixture@Example.Test'), trial('other', ' fixture@example.test ')]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
    expect((await env.DB.prepare('SELECT COUNT(*) AS count FROM admins').first<{ count: number }>())?.count).toBe(1);
  });
  it('expired trial and explicit historical use cannot start again', async () => {
    await trial();
    await env.DB.prepare("UPDATE admins SET subscription_end = '2000-01-01T00:00:00Z' WHERE id = 'fixture'").run();
    expect((await trial()).status).toBe(400);
    expect((await profile())?.subscription_end).toBe('2000-01-01T00:00:00Z');
    await env.DB.prepare("INSERT INTO admins(id, email, trial_used) VALUES ('used', 'used@example.test', 1)").run();
    expect((await trial('used', 'used@example.test')).status).toBe(400);
  });
  it('ledger survives deletion and blocks both the UID and normalized email', async () => {
    await trial();
    await env.DB.prepare("DELETE FROM admins WHERE id = 'fixture'").run();
    expect((await trial('fixture', 'different@example.test')).status).toBe(400);
    expect((await trial('replacement', 'FIXTURE@example.test')).status).toBe(400);
    const get = Object.assign(new Request('https://fixture.test/api/admin/profile'), { user: { uid: 'replacement', email: 'FIXTURE@example.test' } });
    const response = await handleAdmin(get, env, '/api/admin/profile');
    expect(await response.json()).toMatchObject({ id: 'replacement', trialUsed: true });
  });
  it.each(['2999-01-01T00:00:00Z', '2000-01-01T00:00:00Z'])('never overwrites a paid profile %s', async (end) => {
    await env.DB.prepare("INSERT INTO admins(id,email,is_trial,plan_id,subscription_months,subscription_end) VALUES ('fixture','fixture@example.test',0,'annual',12,?)").bind(end).run();
    const original = await profile();
    expect((await trial()).status).toBe(400);
    expect(await profile()).toEqual(original);
  });
  it('paid activation wins a concurrent new trial regardless of insertion order', async () => {
    await env.DB.prepare("INSERT INTO subscription_codes(code, months, plan_id) VALUES ('ABCD-EFGH-IJKL', 12, 'annual')").run();
    const [paid] = await Promise.all([
      handleSubscriptions(request('fixture', 'fixture@example.test', '/api/subscriptions/verify', 'ABCD-EFGH-IJKL'), env, '/api/subscriptions/verify'),
      trial(),
    ]);
    expect(paid.status).toBe(200);
    expect(await profile()).toMatchObject({ plan_id: 'annual', is_trial: 0, subscription_months: 12, subscription_code: 'ABCD-EFGH-IJKL' });
    expect((await trial()).status).toBe(400);
  });
  it('trial-first followed by paid activation preserves usage and permanently upgrades', async () => {
    expect((await trial()).status).toBe(200);
    await env.DB.prepare("INSERT INTO subscription_codes(code, months, plan_id) VALUES ('ABCD-EFGH-IJKL', 12, 'annual')").run();
    const response = await handleSubscriptions(request('fixture', 'fixture@example.test', '/api/subscriptions/verify', 'ABCD-EFGH-IJKL'), env, '/api/subscriptions/verify');
    expect(response.status).toBe(200);
    expect(await profile()).toMatchObject({ plan_id: 'annual', is_trial: 0, trial_used: 1 });
    expect((await trial()).status).toBe(400);
  });
  it('same email on another existing UID fails closed without mutating either profile', async () => {
    await env.DB.prepare("INSERT INTO admins(id,email) VALUES ('old-uid','fixture@example.test')").run();
    expect((await trial()).status).toBe(400);
    expect(await profile()).toBeNull();
  });
  it('setup API returns full trial profile and never removes entitlement', async () => {
    await trial();
    const original = await profile();
    const create = Object.assign(new Request('https://fixture.test/api/admin/profile', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeName: 'Fixture store', storeId: 'fixture-store' }),
    }), { user: { uid: 'fixture', email: 'fixture@example.test' } });
    const response = await handleAdmin(create, env, '/api/admin/profile');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ subscriptionEnd: original?.subscription_end, trialUsed: true, isTrial: true, storeName: 'Fixture store' });
  });
  it('backfills explicit used and dated trials but not empty default profiles', async () => {
    await env.DB.prepare("DROP TRIGGER record_trial_identity_insert").run();
    await env.DB.prepare("INSERT INTO admins(id,email) VALUES ('new','new@example.test')").run();
    await env.DB.prepare("INSERT INTO admins(id,email,trial_used,is_trial,plan_id,subscription_months) VALUES ('used','used@example.test',1,0,'annual',12)").run();
    await env.DB.prepare("INSERT INTO admins(id,email,subscription_end) VALUES ('old','old@example.test','2000-01-01T00:00:00Z')").run();
    await apply(migration);
    const identities = await env.DB.prepare("SELECT identity_value FROM trial_ledger WHERE identity_type='uid' ORDER BY identity_value").all<{ identity_value: string }>();
    expect(identities.results.map((row) => row.identity_value)).toEqual(['old', 'used']);
    expect((await trial('new', 'new@example.test')).status).toBe(200);
  });
});
