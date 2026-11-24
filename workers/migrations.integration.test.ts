import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Miniflare } from 'miniflare';
import {
  ROOT, DIRECTORY, HISTORY, HISTORY_SQL, loadManifest, createLocal, executeSql,
  inspectDatabase, planMigrations, migrationBatches, applyLocal, createProof,
  materialize, sha256, captureRows, inventoryFromCaptures, checksSql, sqlPolicy, statements,
} from '../scripts/db/managed.mjs';

const instances: Miniflare[] = [];
let temporary: string;
let bundle: Awaited<ReturnType<typeof loadManifest>>;
async function database() {
  const mf = createLocal();
  instances.push(mf);
  return mf.getD1Database('DB');
}
async function migratePrefix(db: Awaited<ReturnType<typeof database>>, count: number) {
  for (const migration of bundle.manifest.migrations.slice(0, count)) await executeSql(db, bundle.sql.get(migration.file));
}
async function backupFor(db: Awaited<ReturnType<typeof database>>, name: string) {
  const file = resolve(temporary, name);
  // Operator proof validation hashes a human-reviewed readable SQL export.
  const schema = (await inspectDatabase(db)).schema;
  await writeFile(file, schema.map(s => s.sql + ';').join('\n') + '\n-- Human-reviewed local fixture export\n');
  return file;
}
function cli(...args: string[]) {
  return spawnSync(process.execPath, [resolve(ROOT, 'scripts/db/migrations.mjs'), ...args], { cwd: ROOT, encoding: 'utf8' });
}

beforeAll(async () => {
  temporary = await mkdtemp(resolve(tmpdir(), 'store-managed-migrations-'));
  bundle = await loadManifest();
});
afterAll(async () => {
  await Promise.all(instances.map(mf => mf.dispose()));
  await rm(temporary, { recursive: true, force: true });
});

describe('managed D1 migration release safety (real Miniflare SQLite)', () => {
  it('installs the complete baseline on a fresh database and repeats without changes', async () => {
    const db = await database();
    expect(await applyLocal(db)).toMatchObject({ safeToApply: true, applied: ['0001', '0002', '0003', '0004'] });
    const before = await inspectDatabase(db);
    expect(before.history.map(row => row.id)).toEqual(['0001', '0002', '0003', '0004']);
    expect(before.schema.filter(s => s.type === 'table').map(s => s.name)).toEqual(expect.arrayContaining([
      'admins', 'stores', 'products', 'categories', 'subscription_codes', 'usage',
      'store_payment_methods', 'payment_receipts', 'orders', 'fcm_tokens', 'push_subscriptions',
      'rate_limits', 'settings', 'error_logs', 'trial_ledger', 'store_revisions', 'store_slug_aliases', HISTORY,
    ]));
    expect(await applyLocal(db)).toMatchObject({ applied: [] });
    expect((await inspectDatabase(db)).history).toEqual(before.history);
    expect((await planMigrations(before)).pending).toEqual([]);
    expect(await db.prepare("SELECT name FROM pragma_table_info('admins') WHERE name='whatsapp_api_key'").first()).not.toBeNull();
  });

  it('keeps numbered migration bytes exact, rejects checksum changes and forbidden SQL', async () => {
    expect(bundle.sql.get('0002_store_revisions.sql')).toBe(await readFile(resolve(ROOT, 'workers/migrations/add_store_revisions.sql'), 'utf8'));
    expect(bundle.sql.get('0003_trial_ledger.sql')).toBe(await readFile(resolve(ROOT, 'workers/migrations/add_trial_ledger.sql'), 'utf8'));
    const copy = resolve(temporary, 'checksum-copy');
    await cp(DIRECTORY, copy, { recursive: true });
    await writeFile(resolve(copy, '0001_baseline.sql'), bundle.sql.get('0001_baseline.sql') + '\n-- tampered\n');
    await expect(loadManifest({ directory: copy })).rejects.toThrow('Checksum drift');
    expect(sqlPolicy('UPDATE admins SET trial_used=1;')).not.toEqual([]);
    expect(sqlPolicy('BEGIN TRANSACTION; COMMIT;')).not.toEqual([]);
    expect(sqlPolicy('CREATE TABLE unsafe(id TEXT); DROP TABLE admins;')).not.toEqual([]);
    expect(statements("CREATE TRIGGER sample AFTER INSERT ON admins BEGIN SELECT CASE WHEN NEW.id='a;b' THEN 1 ELSE 0 END; SELECT 2; END; CREATE TABLE second(id TEXT);")).toHaveLength(2);
    const result = cli('check', '--base', 'ae83fe7d2168391a1024b60ef4dffe2c55ce1747');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).migrations).toHaveLength(4);
  });

  it('rejects arbitrary and quoted trigger writes unless the exact source bytes were reviewed', async () => {
    for (const migration of bundle.manifest.migrations) expect(sqlPolicy(bundle.sql.get(migration.file))).toEqual([]);
    const arbitrary = 'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE admins SET email=NULL; END;';
    const unsafe = [
      arbitrary,
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE "admins" SET "email"=NULL; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE `admins` SET `email`=NULL; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE [admins] SET [email]=NULL; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE admins SET trial_used=1; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE "admins" SET "trial_used"=1; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE `admins` SET `trial_used`=1; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE [admins] SET [trial_used]=1; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN UPDATE admins SET email=NULL, trial_used=1; END;',
      'CREATE TRIGGER unsafe AFTER INSERT ON admins BEGIN INSERT INTO admins(id,email) VALUES(NEW.id,NEW.email); END;',
      bundle.sql.get('0002_store_revisions.sql') + '\n' + arbitrary,
      bundle.sql.get('0002_store_revisions.sql') + '\n-- changed reviewed bytes\n',
    ];
    for (const sql of unsafe) expect(sqlPolicy(sql).join(' ')).toContain('explicit reviewed SQL source checksum');
    // Updating a manifest checksum cannot grant approval to an otherwise unsafe trigger.
    const copy = resolve(temporary, 'trigger-policy-copy');
    await cp(DIRECTORY, copy, { recursive: true });
    const file = '0005_unreviewed_trigger.sql';
    await writeFile(resolve(copy, file), arbitrary);
    const manifest = JSON.parse(await readFile(resolve(copy, 'manifest.json'), 'utf8'));
    manifest.migrations.push({ id: '0005', file, sha256: sha256(arbitrary) });
    await writeFile(resolve(copy, 'manifest.json'), JSON.stringify(manifest));
    await expect(loadManifest({ directory: copy })).rejects.toThrow('SQL risk policy');
  });

  it('rejects populated incomplete/unknown schemas instead of claiming the baseline was applied', async () => {
    const db = await database();
    await executeSql(db, await readFile(resolve(ROOT, 'workers/schema.sql'), 'utf8'));
    await db.prepare("INSERT INTO admins(id,email) VALUES('existing','existing@example.test')").run();
    const inventory = await inspectDatabase(db, 'unsupported-db');
    const plan = await planMigrations(inventory);
    expect(plan.safeToApply).toBe(false);
    expect(plan.mode).toBe('blocked');
    expect(plan.missing).toEqual(expect.arrayContaining([{ type: 'table', name: 'orders' }]));
    expect(plan.blockers.join(' ')).toContain('no automatic bridge');
    const backup = await backupFor(db, 'unsupported.sql');
    await expect(createProof(inventory, backup, 'reviewed')).rejects.toThrow('unsupported');
    await expect(applyLocal(db, { target: 'unsupported-db' })).rejects.toThrow('Unsafe');
    expect(await db.prepare('SELECT email FROM admins').first()).toEqual({ email: 'existing@example.test' });
    expect(await db.prepare(`SELECT name FROM sqlite_master WHERE name='${HISTORY}'`).first()).toBeNull();
    const file = resolve(temporary, 'unsupported-inventory.json');
    await writeFile(file, JSON.stringify(inventory));
    const result = cli('plan', '--inventory', file);
    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout).safeToApply).toBe(false);
  });

  it('adopts a complete current baseline only with explicit proof, preserving orders/payments/flags', async () => {
    const db = await database();
    // Build the deployed pre-realtime schema from unchanged legacy sources, not the new baseline.
    await executeSql(db, await readFile(resolve(ROOT, 'workers/schema.sql'), 'utf8'));
    for (const file of ['add_orders_table.sql', 'add_fcm_tokens.sql', 'add_push_subscriptions.sql', 'add_whatsapp_api_key.sql']) {
      await executeSql(db, await readFile(resolve(ROOT, 'workers/migrations', file), 'utf8'));
    }
    for (const statement of statements(bundle.sql.get('0001_baseline.sql')).filter(sql => /^CREATE TABLE IF NOT EXISTS (settings|error_logs)\b/i.test(sql))) await db.prepare(statement).run();
    await db.batch([
      db.prepare("INSERT INTO admins(id,email,plan_id,is_trial,trial_used,subscription_end,subscription_months) VALUES('paid','paid@example.test','annual',1,0,'2099-01-01',12)"),
      db.prepare("INSERT INTO admins(id,email) VALUES('new','new@example.test')"),
      db.prepare("INSERT INTO admins(id,email,trial_used,subscription_end) VALUES('used',' Used@Example.Test ',1,'2025-01-01')"),
      db.prepare("INSERT INTO stores(id,slug,name,owner_id) VALUES('shop','my-shop','Existing','paid')"),
      db.prepare("INSERT INTO store_payment_methods(id,store_id,provider_id,country_code,config_details) VALUES('payment','paid','bank','SA','{}')"),
      db.prepare("INSERT INTO orders(id,store_id,order_number,customer_name,customer_phone,items,total) VALUES('order','paid','ORD-1','Buyer','050','[]',120)"),
      db.prepare("INSERT INTO settings(key,value) VALUES('store','kept')"),
    ]);
    const before = await db.prepare('SELECT id,trial_used FROM admins ORDER BY id').all();
    const inventory = await inspectDatabase(db, 'production-fixture-id');
    const blocked = await planMigrations(inventory);
    expect(blocked).toMatchObject({ mode: 'adoption', safeToApply: false, adopted: ['0001'] });
    expect(blocked.blockers).toHaveLength(1);
    const backup = await backupFor(db, 'baseline-backup.sql');
    await expect(createProof(inventory, backup, 'yes')).rejects.toThrow('reviewed');
    const proof = await createProof(inventory, backup, 'reviewed');
    const plan = await planMigrations(inventory, proof);
    expect(plan).toMatchObject({ safeToApply: true, mode: 'adoption' });
    const result = await applyLocal(db, { target: inventory.target, proof, plan });
    expect(result.applied).toEqual(['adoption', '0002', '0003', '0004']);
    expect((await db.prepare('SELECT id,trial_used FROM admins ORDER BY id').all()).results).toEqual(before.results);
    expect(await db.prepare('SELECT total FROM orders').first()).toEqual({ total: 120 });
    expect(await db.prepare('SELECT config_details FROM store_payment_methods').first()).toEqual({ config_details: '{}' });
    expect(await db.prepare('SELECT value FROM settings').first()).toEqual({ value: 'kept' });
    expect(await db.prepare("SELECT revision FROM store_revisions WHERE store_id='shop'").first()).toEqual({ revision: 1 });
    expect((await db.prepare('SELECT identity_type,identity_value FROM trial_ledger ORDER BY identity_type').all()).results).toEqual([
      { identity_type: 'email', identity_value: 'used@example.test' }, { identity_type: 'uid', identity_value: 'used' },
    ]);
    expect((await inspectDatabase(db, inventory.target)).history[0]).toMatchObject({ mode: 'adopted', backup_sha256: proof.backupSha256, proof_sha256: sha256(JSON.stringify(proof)) });
    expect(await applyLocal(db, { target: inventory.target })).toMatchObject({ applied: [] });
  });

  it('proof-adopts a complete current schema without reapplying SQL or changing populated data', async () => {
    const db = await database();
    await migratePrefix(db, 4);
    await db.prepare("INSERT INTO admins(id,email,plan_id,is_trial) VALUES('owner','owner@example.test','annual',0)").run();
    await db.prepare("INSERT INTO stores(id,slug,name,owner_id) VALUES('full','full','Kept','owner')").run();
    const inventory = await inspectDatabase(db, 'complete-current-id');
    const proof = await createProof(inventory, await backupFor(db, 'complete-backup.sql'), 'reviewed');
    const plan = await planMigrations(inventory, proof);
    expect(plan.pending).toEqual([]);
    const result = await migrationBatches(inventory, proof, plan);
    expect(result.batches.map(b => b.id)).toEqual(['adoption']);
    expect(result.batches[0].sql).not.toContain('CREATE TABLE IF NOT EXISTS stores');
    await applyLocal(db, { target: inventory.target, proof, plan });
    expect(await db.prepare("SELECT name FROM stores WHERE id='full'").first()).toEqual({ name: 'Kept' });
    expect(await db.prepare("SELECT revision FROM store_revisions WHERE store_id='full'").first()).toEqual({ revision: 1 });
  });

  it('blocks tampered/stale proof, backup, manifest fingerprint, inventory and materialized plan', async () => {
    const db = await database();
    await migratePrefix(db, 1);
    const inventory = await inspectDatabase(db, 'proof-target');
    const backup = await backupFor(db, 'tamper-backup.sql');
    const proof = await createProof(inventory, backup, 'reviewed');
    const plan = await planMigrations(inventory, proof);
    for (const bad of [
      { ...proof, target: 'other-db' }, { ...proof, acknowledgement: 'auto' },
      { ...proof, inventorySha256: '0'.repeat(64) }, { ...proof, manifestSha256: '0'.repeat(64) },
      { ...proof, backupSha256: '0'.repeat(64) },
    ]) expect((await planMigrations(inventory, bad)).safeToApply).toBe(false);
    await expect(materialize(inventory, proof, { ...plan, target: 'different' }, resolve(temporary, 'tampered-plan'))).rejects.toThrow('Stale/tampered plan');
    await expect(materialize({ ...inventory, target: 'other' }, proof, plan, resolve(temporary, 'tampered-inventory'))).rejects.toThrow('Unsafe');
    await writeFile(backup, '-- changed backup');
    expect((await planMigrations(inventory, proof)).blockers).toContain('Adoption backup checksum drift');
    await expect(materialize(inventory, proof, plan, resolve(temporary, 'tampered-backup'))).rejects.toThrow('Unsafe');
  });

  it('rolls back DDL and history on stale schema/history guards and on batch statement failures', async () => {
    const db = await database();
    const inventory = await inspectDatabase(db), plan = await planMigrations(inventory);
    const { batches } = await migrationBatches(inventory, undefined, plan);
    await db.prepare('CREATE TABLE unexpected(id TEXT)').run();
    await expect(executeSql(db, batches[0].sql)).rejects.toThrow();
    expect(await db.prepare("SELECT name FROM sqlite_master WHERE name='stores'").first()).toBeNull();
    expect(await db.prepare(`SELECT name FROM sqlite_master WHERE name='${HISTORY}'`).first()).toBeNull();
    const other = await database();
    await executeSql(other, HISTORY_SQL);
    await expect(executeSql(other, "CREATE TABLE rollback_probe(id TEXT); INSERT INTO app_schema_migrations(id,sha256,mode) VALUES(NULL,'invalid','invalid');")).rejects.toThrow();
    expect(await other.prepare("SELECT name FROM sqlite_master WHERE name='rollback_probe'").first()).toBeNull();
    await executeSql(other, batches[0].sql);
    await other.prepare("UPDATE app_schema_migrations SET mode='unexpected' WHERE id='0001'").run();
    await expect(executeSql(other, batches[1].sql)).rejects.toThrow();
    expect(await other.prepare("SELECT name FROM sqlite_master WHERE name='store_revisions'").first()).toBeNull();
    expect((await planMigrations(await inspectDatabase(other))).safeToApply).toBe(false);
    const staleHistory = await database();
    await staleHistory.prepare('CREATE TABLE app_schema_migrations(id TEXT,sha256 TEXT,mode TEXT,applied_at TEXT,backup_sha256 TEXT,proof_sha256 TEXT)').run();
    await expect(executeSql(staleHistory, batches[0].sql)).rejects.toThrow();
    expect(await staleHistory.prepare("SELECT name FROM sqlite_master WHERE name='stores'").first()).toBeNull();
  });

  it('blocks applied checksum drift and failing read-only data invariants', async () => {
    const db = await database();
    await applyLocal(db);
    await db.prepare("UPDATE app_schema_migrations SET sha256=? WHERE id='0001'").bind('0'.repeat(64)).run();
    expect((await planMigrations(await inspectDatabase(db))).blockers.join(' ')).toContain('drifted');
    const unhealthy = await database();
    await migratePrefix(unhealthy, 3);
    await unhealthy.prepare("INSERT INTO admins(id,email,plan_id,is_trial) VALUES('owner','owner@example.test','annual',0)").run();
    await unhealthy.prepare("INSERT INTO stores(id,slug,name,owner_id) VALUES('shop','shop','Shop','owner')").run();
    await unhealthy.prepare("DELETE FROM store_revisions WHERE store_id='shop'").run();
    const inventory = await inspectDatabase(unhealthy);
    expect((await planMigrations(inventory)).blockers).toContain('Missing or failing read-only data invariant: revisionCoverage');
    await expect(createProof(inventory, await backupFor(unhealthy, 'unhealthy.sql'), 'reviewed')).rejects.toThrow('unhealthy');
  });

  it('round-trips Wrangler JSON and CLI artifacts, materializes exact guarded bytes with out-dir alias', async () => {
    const db = await database();
    const inventory = await inspectDatabase(db, 'cli-target');
    const schemaCapture = [{ success: true, results: inventory.schema }];
    const checksCapture = [{ success: true, results: [{ kind: 'check', name: 'foreignKeys', value: '0' }] }];
    expect(inventoryFromCaptures(schemaCapture, checksCapture, 'cli-target').checks).toEqual({ foreignKeys: 0 });
    expect(() => captureRows([{ success: false, results: [] }])).toThrow('unsuccessful');
    const schemaPath = resolve(temporary, 'schema.json'), checksPath = resolve(temporary, 'checks.json');
    const inventoryPath = resolve(temporary, 'inventory.json'), planPath = resolve(temporary, 'plan.json');
    await writeFile(schemaPath, JSON.stringify(schemaCapture));
    await writeFile(checksPath, JSON.stringify(checksCapture));
    expect(JSON.parse(cli('inspection-sql').stdout)).toMatchObject({ phase: 'schema', readOnly: true });
    expect(JSON.parse(cli('inspection-sql', '--capture', schemaPath).stdout)).toMatchObject({ phase: 'checks', sql: checksSql(inventory.schema) });
    expect(cli('inspect', '--capture', schemaPath, '--checks', checksPath, '--target', 'cli-target', '--out', inventoryPath).status).toBe(0);
    expect(cli('plan', '--inventory', inventoryPath, '--out', planPath).status).toBe(0);
    const output = resolve(temporary, 'cli-batches');
    const result = cli('materialize', '--inventory', inventoryPath, '--plan', planPath, '--out-dir', output);
    expect(result.status, result.stderr).toBe(0);
    const artifact = JSON.parse(result.stdout);
    expect(artifact).toMatchObject({ safeToApply: true, target: 'cli-target' });
    expect(artifact.batches.map(b => b.id)).toEqual(['0001', '0002', '0003', '0004']);
    for (const batch of artifact.batches) {
      const sql = await readFile(batch.file, 'utf8');
      expect(sha256(sql)).toBe(batch.sha256);
      expect(sql).not.toMatch(/BEGIN TRANSACTION|COMMIT;/i);
      await executeSql(db, sql);
    }
    expect((await planMigrations(await inspectDatabase(db, 'cli-target'))).pending).toEqual([]);
    await expect(materialize(inventory, undefined, await planMigrations(inventory), output)).rejects.toThrow('must be empty');
  }, 90_000);
});
