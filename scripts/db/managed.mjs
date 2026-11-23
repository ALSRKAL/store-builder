import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Miniflare } from 'miniflare';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const DIRECTORY = resolve(ROOT, 'workers/migrations-managed');
export const HISTORY = 'app_schema_migrations';
export const HISTORY_SQL = `CREATE TABLE IF NOT EXISTS ${HISTORY} (
  id TEXT NOT NULL PRIMARY KEY,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  mode TEXT NOT NULL,
  backup_sha256 TEXT,
  proof_sha256 TEXT
);`;
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha256(JSON.stringify(value));
const literal = value => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const infra = name => name === 'd1_migrations' || name.startsWith('sqlite_') || name.startsWith('_cf_');
const fail = message => { throw new Error(message); };
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

// Trigger bodies and quoted strings contain semicolons; never split SQL naively.
export function tokens(sql) {
  const result = [];
  const pattern = /\s+|--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`[^`]*`|\[[^\]]*\]|[A-Za-z_][A-Za-z_0-9]*|\d+(?:\.\d+)?|\|\||<>|!=|<=|>=|==|[^\s]/gy;
  let position = 0;
  while (position < sql.length) {
    pattern.lastIndex = position;
    const match = pattern.exec(sql);
    if (!match) fail(`Cannot tokenize SQL at ${position}`);
    position = pattern.lastIndex;
    if (!/^\s|^--|^\/\*/.test(match[0])) result.push(match[0]);
  }
  return result;
}
export function statements(sql) {
  const result = [];
  let current = [], trigger = false, cases = 0, ended = false;
  for (const token of tokens(sql)) {
    current.push(token);
    const word = token.toUpperCase();
    if (current[0]?.toUpperCase() === 'CREATE' && word === 'TRIGGER') trigger = true;
    if (trigger && word === 'CASE') cases++;
    if (trigger && word === 'END') { if (cases) cases--; else ended = true; }
    if (token === ';' && (!trigger || ended)) {
      result.push(current.join(' ')); current = []; trigger = false; cases = 0; ended = false;
    }
  }
  if (current.length) { if (trigger && !ended) fail('Unterminated trigger'); result.push(current.join(' ')); }
  return result;
}
function normalized(sql) {
  return tokens(sql).filter(t => t !== ';').map(t => t.startsWith("'") ? t : t.replace(/^["`[]|["`\]]$/g, '').toLowerCase()).join(' ').replace(/\bif not exists\s+/g, '');
}
// Triggers can hide destructive writes inside otherwise additive CREATE DDL.
// Trust only these exact, reviewed whole-file bytes, never a name or a checksum
// supplied by the manifest. Any new/changed trigger source needs policy review.
const REVIEWED_TRIGGER_SOURCES = new Set([
  'fb4358649df933136691348ef63d1e8d3851daf1f58c90686e889b2fe0be2404', // 0001 timestamp triggers
  'e7a5f5d56f5fc917e341f6208e8dbda35aa9b1dd6f5ae4805dc50727283f057c', // 0002 revision triggers
  '620f615b2b874a095b3cad2893bf239535650dea1ee5b9637f1738cb9af65ed8', // 0003 identity INSERT triggers
]);
export function sqlPolicy(sql) {
  const problems = [];
  const reviewedTriggerSource = REVIEWED_TRIGGER_SOURCES.has(sha256(sql));
  for (const statement of statements(sql)) {
    const clean = tokens(statement).filter(t => !t.startsWith("'")).map(t => t.replace(/^["`[]|["`\]]$/g, '').toUpperCase()).join(' ');
    const createsTrigger = /^CREATE TRIGGER\b/.test(clean);
    if (createsTrigger && !reviewedTriggerSource) problems.push('New or changed triggers require an explicit reviewed SQL source checksum; arbitrary trigger writes are forbidden');
    const withoutEvent = clean.replace(/\bAFTER DELETE ON\b/g, 'AFTER EVENT ON').replace(/\bON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION)\b/g, 'ON EVENT ACTION');
    if (/\b(DROP|DELETE|REPLACE|VACUUM|ATTACH|DETACH|PRAGMA|REINDEX|COMMIT|ROLLBACK|SAVEPOINT)\b/.test(withoutEvent) || /^BEGIN\b/.test(clean)) problems.push('Destructive, administrative or explicit transaction SQL is forbidden');
    const allowedCreate = /^CREATE (TABLE|(?:UNIQUE )?INDEX|TRIGGER)\b/.test(clean);
    const allowedAlter = /^ALTER TABLE \w+ ADD COLUMN \w+\b/.test(clean) && !/\b(PRIMARY|UNIQUE|REFERENCES)\b/.test(clean);
    const allowedBackfill = /^INSERT OR IGNORE INTO (STORE_REVISIONS|STORE_SLUG_ALIASES|TRIAL_LEDGER)\b/.test(clean);
    if (!allowedCreate && !allowedAlter && !allowedBackfill) problems.push('Only additive DDL and reviewed identity/revision INSERT OR IGNORE backfills are allowed');
    if (allowedCreate && clean.startsWith('CREATE TRIGGER') && /\bUPDATE ADMINS SET TRIAL_USED\b/.test(clean)) problems.push('Default-based trial consumption is forbidden');
  }
  return [...new Set(problems)];
}

export async function loadManifest({ directory = DIRECTORY, base } = {}) {
  const text = await readFile(resolve(directory, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(text);
  if (manifest.version !== 1 || manifest.historyTable !== HISTORY || !Array.isArray(manifest.migrations) || !manifest.migrations.length || manifest.legacyProfiles) fail('Invalid managed manifest');
  for (const [i, entry] of manifest.migrations.entries()) {
    if (entry.id !== String(i + 1).padStart(4, '0') || !entry.file.startsWith(`${entry.id}_`)) fail('Migration IDs must be contiguous and ordered');
  }
  const sql = new Map();
  for (const entry of manifest.migrations) {
    if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(entry.file) || !isHash(entry.sha256)) fail('Invalid migration filename/checksum');
    const contents = await readFile(resolve(directory, entry.file), 'utf8');
    if (sha256(contents) !== entry.sha256) fail(`Checksum drift: ${entry.file}`);
    const problems = sqlPolicy(contents);
    if (problems.length) fail(`SQL risk policy: ${entry.file}: ${problems.join('; ')}`);
    sql.set(entry.file, contents);
  }
  const onDisk = (await readdir(directory)).filter(f => f.endsWith('.sql')).sort();
  if (JSON.stringify(onDisk) !== JSON.stringify(manifest.migrations.map(e => e.file).sort())) fail('Unmanifested or duplicated migration SQL');
  let ref = base;
  if (!ref) { try { ref = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* non-git checkout */ } }
  if (ref) {
    let paths;
    try { paths = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, '--', 'workers/migrations-managed'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split('\n').filter(Boolean); }
    catch { fail(`Cannot verify immutable git base: ${ref}`); }
    for (const path of paths.filter(p => p.endsWith('.sql'))) {
      const original = execFileSync('git', ['show', `${ref}:${path}`], { cwd: ROOT });
      const current = await readFile(resolve(directory, path.split('/').at(-1))).catch(() => fail(`Deleted immutable migration: ${path}`));
      if (!original.equals(current)) fail(`Immutable migration changed since ${ref}: ${path}`);
    }
    if (paths.includes('workers/migrations-managed/manifest.json')) {
      const previous = JSON.parse(execFileSync('git', ['show', `${ref}:workers/migrations-managed/manifest.json`], { cwd: ROOT, encoding: 'utf8' }));
      if (previous.version !== manifest.version || previous.historyTable !== manifest.historyTable || JSON.stringify(previous.migrations) !== JSON.stringify(manifest.migrations.slice(0, previous.migrations.length))) fail('Immutable manifest history changed');
    }
  }
  return { manifest, sql, manifestSha256: sha256(text), immutableBase: ref ?? null };
}

export function createLocal(persist) {
  return new Miniflare({ modules: true, script: 'export default {fetch(){return new Response("migration-test")}}', compatibilityDate: '2025-12-23', d1Databases: { DB: 'managed-migration-test' }, ...(persist ? { d1Persist: resolve(persist) } : {}) });
}
export async function executeSql(db, sql) {
  const queries = statements(sql);
  // D1 batch is transactional. No explicit BEGIN/COMMIT, which D1 does not accept.
  if (queries.length) await db.batch(queries.map(q => db.prepare(q)));
}
export const SCHEMA_SQL = "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY type, name";
const trialPredicate = alias => `${alias}.trial_used = 1 OR (( ${alias}.is_trial = 1 OR ${alias}.plan_id = 'trial') AND ${alias}.subscription_end IS NOT NULL AND COALESCE(${alias}.subscription_months, 0) = 0 AND COALESCE(${alias}.subscription_code, '') = '' AND (${alias}.plan_id IS NULL OR ${alias}.plan_id = 'trial'))`;
export function checksSql(schema) {
  const names = new Set(schema.filter(x => x.type === 'table').map(x => x.name));
  const queries = ["SELECT 'check' AS kind, 'foreignKeys' AS name, CAST(count(*) AS TEXT) AS value FROM pragma_foreign_key_check"];
  if (names.has(HISTORY)) queries.push(`SELECT 'history' AS kind, id AS name, json_object('id',id,'sha256',sha256,'applied_at',applied_at,'mode',mode,'backup_sha256',backup_sha256,'proof_sha256',proof_sha256) AS value FROM ${HISTORY}`);
  if (names.has('store_revisions') && names.has('stores')) queries.push("SELECT 'check', 'revisionCoverage', CAST(count(*) AS TEXT) FROM stores s LEFT JOIN store_revisions r ON r.store_id=s.id WHERE r.store_id IS NULL OR r.owner_id IS NOT s.owner_id OR r.slug IS NOT s.slug OR r.deleted <> 0 OR r.revision < 1 OR r.store_revision < 1 OR r.products_revision < 1 OR r.categories_revision < 1 OR r.payments_revision < 1");
  if (names.has('store_slug_aliases') && names.has('stores')) queries.push("SELECT 'check', 'aliasCoverage', CAST(count(*) AS TEXT) FROM stores s WHERE NOT EXISTS(SELECT 1 FROM store_slug_aliases a WHERE a.alias=s.slug AND a.store_id=s.id) OR NOT EXISTS(SELECT 1 FROM store_slug_aliases a WHERE a.alias=s.id AND a.store_id=s.id)");
  if (names.has('trial_ledger') && names.has('admins')) queries.push(`SELECT 'check', 'trialCoverage', CAST(count(*) AS TEXT) FROM admins a WHERE (${trialPredicate('a')}) AND (NOT EXISTS(SELECT 1 FROM trial_ledger l WHERE l.identity_type='uid' AND l.identity_value=a.id) OR (trim(a.email) <> '' AND NOT EXISTS(SELECT 1 FROM trial_ledger l WHERE l.identity_type='email' AND l.identity_value=lower(trim(a.email)))))`);
  return queries.join(' UNION ALL ') + ' ORDER BY kind, name;';
}
export function captureRows(capture) {
  if (Array.isArray(capture) && capture.length && capture.every(x => x && typeof x.type === 'string')) return capture;
  const envelopes = Array.isArray(capture) ? capture : [capture];
  if (!envelopes.length || envelopes.some(e => e?.success !== true || !Array.isArray(e.results))) fail('Invalid/unsuccessful Wrangler JSON capture');
  return envelopes.flatMap(e => e.results);
}
export function inventoryFromCaptures(schemaCapture, checksCapture, target) {
  if (!target || typeof target !== 'string') fail('Inventory requires a database target identifier');
  const schema = captureRows(schemaCapture).sort((a, b) => `${a.type}:${a.name}`.localeCompare(`${b.type}:${b.name}`));
  const rows = captureRows(checksCapture);
  if (schema.some(s => !['table', 'index', 'trigger', 'view'].includes(s.type) || typeof s.name !== 'string' || typeof s.sql !== 'string')) fail('Malformed schema capture');
  if (new Set(schema.map(s => `${s.type}:${s.name}`)).size !== schema.length) fail('Duplicate schema objects');
  if (rows.some(r => !['history', 'check'].includes(r.kind) || typeof r.name !== 'string') || new Set(rows.map(r => `${r.kind}:${r.name}`)).size !== rows.length) fail('Malformed or duplicate invariant/history rows');
  const history = rows.filter(x => x.kind === 'history').map(x => {
    const row = JSON.parse(x.value);
    if (row.id !== x.name) fail('History row ID mismatch');
    return row;
  }).sort((a, b) => a.id.localeCompare(b.id));
  const checks = Object.fromEntries(rows.filter(x => x.kind === 'check').map(x => {
    if (!/^\d+$/.test(String(x.value)) || !Number.isSafeInteger(Number(x.value))) fail('Malformed invariant count');
    return [x.name, Number(x.value)];
  }));
  return { version: 1, target, capturedAt: new Date().toISOString(), schema, history, checks };
}
export async function inspectDatabase(db, target = 'local-miniflare') {
  const schema = (await db.prepare(SCHEMA_SQL).all()).results;
  const checks = (await db.prepare(checksSql(schema)).all()).results;
  return inventoryFromCaptures([{ success: true, results: schema }], [{ success: true, results: checks }], target);
}
// Capture time is not part of database state. All schema/check/history content and target are.
export const inventoryDigest = inv => digest({ version: inv.version, target: inv.target, schema: inv.schema, history: inv.history, checks: inv.checks });

const referenceCache = new Map();
export async function getReferences(bundle) {
  if (!referenceCache.has(bundle.manifestSha256)) referenceCache.set(bundle.manifestSha256, (async () => {
    const mf = createLocal();
    try {
      const db = await mf.getD1Database('DB'), prefixes = [];
      for (const migration of bundle.manifest.migrations) {
        await executeSql(db, bundle.sql.get(migration.file));
        prefixes.push((await inspectDatabase(db)).schema);
      }
      return { prefixes };
    } finally { await mf.dispose(); }
  })().catch(error => { referenceCache.delete(bundle.manifestSha256); throw error; }));
  return referenceCache.get(bundle.manifestSha256);
}
function splitTableBody(body) {
  const parts = [], current = [];
  let depth = 0;
  for (const token of tokens(body)) {
    if (token === '(') depth++;
    else if (token === ')') depth--;
    if (token === ',' && depth === 0) { parts.push(current.join(' ')); current.length = 0; }
    else current.push(token);
  }
  if (current.length) parts.push(current.join(' '));
  return parts.map(part => part.trim()).filter(Boolean).sort();
}
/**
 * SQLite column order is not semantic for name-based access. Legacy production
 * tables can have the same columns/constraints in a different order after
 * additive ALTERs; compare them as an ordered-insensitive signature while still
 * rejecting any missing, extra, or changed definition.
 */
export function schemaCompatible(actual, expected) {
  if (normalized(actual) === normalized(expected)) return true;
  if (!/^create\s+table/i.test(actual.trim()) || !/^create\s+table/i.test(expected.trim())) return false;
  const signature = sql => {
    const norm = normalized(sql);
    const start = norm.indexOf('('), end = norm.lastIndexOf(')');
    if (start < 0 || end <= start) return null;
    return splitTableBody(norm.slice(start + 1, end)).join(' | ');
  };
  const left = signature(actual), right = signature(expected);
  return left !== null && right !== null && left === right;
}
function compareSchema(actual, expected) {
  const relevant = actual.filter(s => !infra(s.name) && s.name !== HISTORY);
  const map = new Map(relevant.map(s => [`${s.type}:${s.name}`, s]));
  const missing = [], incompatible = [];
  for (const item of expected) {
    const existing = map.get(`${item.type}:${item.name}`);
    if (!existing) missing.push({ type: item.type, name: item.name });
    else if (!schemaCompatible(existing.sql, item.sql)) incompatible.push({ type: item.type, name: item.name, reason: 'SQL structure differs (columns/defaults/constraints/FKs/index/trigger definition)' });
    map.delete(`${item.type}:${item.name}`);
  }
  return { missing, incompatible, unknown: [...map.values()].map(s => ({ type: s.type, name: s.name })) };
}
function matches(report) { return !report.missing.length && !report.incompatible.length && !report.unknown.length; }
function validateChecks(inventory, blockers) {
  const tables = new Set(inventory.schema.filter(s => s.type === 'table').map(s => s.name));
  const required = ['foreignKeys', ...(tables.has('store_revisions') ? ['revisionCoverage'] : []), ...(tables.has('store_slug_aliases') ? ['aliasCoverage'] : []), ...(tables.has('trial_ledger') ? ['trialCoverage'] : [])];
  for (const key of required) if (inventory.checks[key] !== 0) blockers.push(`Missing or failing read-only data invariant: ${key}`);
}
async function validateBackup(proof) {
  if (typeof proof.backupPath !== 'string' || !isHash(proof.backupSha256) || !Number.isSafeInteger(proof.backupBytes) || proof.backupBytes < 1) fail('Invalid backup evidence');
  const backup = await readFile(proof.backupPath).catch(() => fail('Adoption backup no longer available'));
  if (sha256(backup) !== proof.backupSha256 || backup.length !== proof.backupBytes) fail('Adoption backup checksum drift');
}
export async function planMigrations(inventory, proof, bundle) {
  bundle ??= await loadManifest();
  if (inventory.version !== 1 || typeof inventory.target !== 'string' || !inventory.target || !Array.isArray(inventory.schema) || !Array.isArray(inventory.history) || !inventory.checks) fail('Malformed inventory');
  if (inventory.schema.some(s => !['table', 'index', 'trigger', 'view'].includes(s.type) || typeof s.name !== 'string' || typeof s.sql !== 'string') || new Set(inventory.schema.map(s => `${s.type}:${s.name}`)).size !== inventory.schema.length) fail('Malformed inventory schema');
  const refs = await getReferences(bundle), blockers = [];
  validateChecks(inventory, blockers);
  const report = compareSchema(inventory.schema, refs.prefixes.at(-1));
  let mode = 'blocked', adopted = [], prefix = 0;
  const historyTable = inventory.schema.find(s => s.name === HISTORY && s.type === 'table');
  if (historyTable && normalized(historyTable.sql) !== normalized(HISTORY_SQL)) blockers.push('Incompatible managed history table');
  if (!historyTable && inventory.history.length) blockers.push('History rows without managed history table');
  if (inventory.history.length) {
    mode = 'managed'; prefix = inventory.history.length;
    for (const [i, row] of inventory.history.entries()) {
      const migration = bundle.manifest.migrations[i];
      if (!migration || row.id !== migration.id || row.sha256 !== migration.sha256) blockers.push(`Unknown, noncontiguous or drifted applied migration: ${row.id}`);
      if (!['applied', 'adopted'].includes(row.mode) || typeof row.applied_at !== 'string') blockers.push(`Invalid migration provenance: ${row.id}`);
      if (row.mode === 'adopted' && (!isHash(row.backup_sha256) || !isHash(row.proof_sha256))) blockers.push(`Missing adoption evidence: ${row.id}`);
    }
    if (!refs.prefixes[prefix - 1] || !matches(compareSchema(inventory.schema, refs.prefixes[prefix - 1]))) blockers.push('Managed schema differs from its applied manifest prefix');
  } else if (!inventory.schema.some(s => !infra(s.name) && s.name !== HISTORY)) mode = 'fresh';
  else {
    for (let i = refs.prefixes.length - 1; i >= 0; i--) {
      if (matches(compareSchema(inventory.schema, refs.prefixes[i]))) { mode = 'adoption'; prefix = i + 1; break; }
    }
    if (prefix) adopted = bundle.manifest.migrations.slice(0, prefix).map(m => m.id);
    else blockers.push('Unknown/incompatible legacy schema: incomplete schemas require a separately reviewed migration; no automatic bridge');
  }
  const identity = { inventorySha256: inventoryDigest(inventory), manifestSha256: bundle.manifestSha256, target: inventory.target, mode, adopted };
  if (adopted.length) {
    if (!proof) blockers.push('Explicit adoption proof and verified backup required; baseline is NOT assumed applied');
    else {
      for (const [key, value] of Object.entries(identity)) if (JSON.stringify(proof[key]) !== JSON.stringify(value)) blockers.push(`Stale/mismatched adoption proof: ${key}`);
      if (proof.version !== 1 || proof.acknowledgement !== 'reviewed' || typeof proof.createdAt !== 'string' || !Number.isFinite(Date.parse(proof.createdAt))) blockers.push('Invalid explicit backup/adoption evidence');
      try { await validateBackup(proof); } catch (error) { blockers.push(error.message); }
    }
  } else if (proof) blockers.push('Adoption proof is not applicable to this database state');
  return { version: 1, ...identity, safeToApply: blockers.length === 0, requiresAdoption: adopted.length > 0, pending: bundle.manifest.migrations.slice(prefix).map(m => ({ ...m })), blockers, ...report, proofSha256: proof ? digest(proof) : null, backupSha256: proof?.backupSha256 ?? null };
}
export async function createProof(inventory, backup, acknowledgement, bundle) {
  bundle ??= await loadManifest();
  if (acknowledgement !== 'reviewed') fail('Explicit --acknowledge reviewed is required');
  const bytes = await readFile(backup);
  if (!bytes.length || !/\bCREATE\s+TABLE\b/i.test(bytes.toString('utf8'))) fail('Backup must be a nonempty actual SQL schema/data export');
  const plan = await planMigrations(inventory, undefined, bundle);
  if (!plan.requiresAdoption || plan.blockers.some(b => !b.startsWith('Explicit adoption proof'))) fail('Cannot prove adoption of an unsupported or unhealthy schema');
  return { version: 1, inventorySha256: plan.inventorySha256, manifestSha256: plan.manifestSha256, target: plan.target, mode: plan.mode, adopted: plan.adopted, backupSha256: sha256(bytes), backupBytes: bytes.length, backupPath: resolve(backup), acknowledgement, createdAt: new Date().toISOString() };
}
function guardSql(schema, history) {
  const objects = schema.filter(s => !infra(s.name) && s.name !== HISTORY);
  const conditions = [`(SELECT count(*) FROM sqlite_master WHERE sql IS NOT NULL AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' AND name NOT IN ('d1_migrations','${HISTORY}')) = ${objects.length}`];
  conditions.push(`NOT EXISTS(SELECT 1 FROM json_each(${literal(JSON.stringify(objects.map(s => ({ type: s.type, name: s.name, sql: s.sql }))))}) expected WHERE NOT EXISTS(SELECT 1 FROM sqlite_master actual WHERE actual.type=json_extract(expected.value,'$.type') AND actual.name=json_extract(expected.value,'$.name') AND actual.sql=json_extract(expected.value,'$.sql')))`);
  const historyDefinition = schema.find(s => s.name === HISTORY)?.sql ?? statements(HISTORY_SQL)[0].replace(' IF NOT EXISTS', '').replace(/\s*;$/, '');
  conditions.push(`EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='${HISTORY}' AND sql=${literal(historyDefinition)})`);
  conditions.push(`(SELECT count(*) FROM ${HISTORY}) = ${history.length}`);
  for (const row of history) {
    const evidence = ['id', 'sha256', 'mode', 'backup_sha256', 'proof_sha256', ...(row.applied_at ? ['applied_at'] : [])];
    conditions.push(`EXISTS(SELECT 1 FROM ${HISTORY} WHERE ${evidence.map(k => `${k} IS ${literal(row[k])}`).join(' AND ')})`);
  }
  conditions.push(`NOT EXISTS(SELECT 1 FROM (${checksSql(schema).replace(/;$/, '')}) WHERE kind='check' AND CAST(value AS INTEGER)<>0)`);
  // A deliberately invalid JSON expression aborts even if a stale history table
  // has lost its NOT NULL constraint. D1 rolls back the whole batch/file import.
  return `INSERT INTO ${HISTORY}(id,sha256,mode) SELECT json_extract('managed migration optimistic guard failed','$'),'guard','guard' WHERE NOT (${conditions.join(' AND ')});`;
}
function historyRow(migration, mode, plan) {
  return { id: migration.id, sha256: migration.sha256, mode, backup_sha256: plan.backupSha256, proof_sha256: plan.proofSha256 };
}
function recordSql(row) {
  return `INSERT INTO ${HISTORY}(id,sha256,mode,backup_sha256,proof_sha256) VALUES(${literal(row.id)},${literal(row.sha256)},${literal(row.mode)},${literal(row.backup_sha256)},${literal(row.proof_sha256)});`;
}
export async function migrationBatches(inventory, proof, suppliedPlan, bundle) {
  bundle ??= await loadManifest();
  const plan = await planMigrations(inventory, proof, bundle);
  if (!plan.safeToApply) fail(`Unsafe migration plan: ${plan.blockers.join('; ')}`);
  if (suppliedPlan && digest(suppliedPlan) !== digest(plan)) fail('Stale/tampered plan: regenerate plan from current inventory/proof/manifest');
  const batches = [], simulator = createLocal();
  try {
    const db = await simulator.getD1Database('DB');
    // Isolated schema simulation only: never replay a full schema on an existing target.
    const order = { table: 0, index: 1, view: 2, trigger: 3 };
    const replay = inventory.schema.filter(s => !infra(s.name) && s.name !== HISTORY).sort((a, b) => order[a.type] - order[b.type]);
    for (const object of replay) await db.prepare(object.sql).run();
    await executeSql(db, HISTORY_SQL);
    let schema = inventory.schema;
    const history = [...inventory.history];
    if (plan.adopted.length) {
      const rows = bundle.manifest.migrations.filter(m => plan.adopted.includes(m.id)).map(m => historyRow(m, 'adopted', plan));
      const sql = [statements(HISTORY_SQL)[0], guardSql(schema, history), ...rows.map(recordSql)].join('\n');
      batches.push({ id: 'adoption', sql, sha256: sha256(sql) });
      schema = (await inspectDatabase(db)).schema;
      history.push(...rows);
    }
    for (const migration of plan.pending) {
      const row = historyRow(migration, 'applied', plan);
      const sql = [statements(HISTORY_SQL)[0], guardSql(schema, history), ...statements(bundle.sql.get(migration.file)), recordSql(row)].join('\n');
      batches.push({ id: migration.id, sql, sha256: sha256(sql) });
      await executeSql(db, bundle.sql.get(migration.file));
      schema = (await inspectDatabase(db)).schema;
      history.push(row);
    }
  } finally { await simulator.dispose(); }
  return { plan, batches };
}
export async function applyLocal(db, { target = 'local-miniflare', proof, plan } = {}) {
  const inventory = await inspectDatabase(db, target);
  const result = await migrationBatches(inventory, proof, plan);
  for (const batch of result.batches) await executeSql(db, batch.sql);
  const after = await planMigrations(await inspectDatabase(db, target));
  if (!after.safeToApply || after.pending.length) fail(`Post-migration validation failed: ${after.blockers.join('; ')}`);
  return { safeToApply: true, applied: result.batches.map(b => b.id), historyTable: HISTORY };
}
export async function materialize(inventory, proof, plan, out) {
  if (!out || !plan) fail('materialize requires --plan and --out directory');
  const result = await migrationBatches(inventory, proof, plan);
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length) fail('Materialization output directory must be empty');
  const batches = [];
  for (const batch of result.batches) {
    const file = resolve(out, `${batch.id}.sql`);
    await writeFile(file, batch.sql + '\n', { flag: 'wx' });
    batches.push({ id: batch.id, file, sha256: sha256(batch.sql + '\n') });
  }
  return { safeToApply: true, target: result.plan.target, inventorySha256: result.plan.inventorySha256, manifestSha256: result.plan.manifestSha256, historyTable: HISTORY, batches, execution: 'Root locked Wrangler4 d1 execute <database> --config <explicit-environment-config> --remote --file <batch.file> --json. One file import per batch; stop on failure, recapture inventory, never replay blindly.' };
}
export async function localTest() {
  const mf = createLocal();
  try {
    const db = await mf.getD1Database('DB');
    const first = await applyLocal(db), repeated = await applyLocal(db);
    return { ok: true, engine: 'Miniflare D1 (real SQLite)', first, repeated };
  } finally { await mf.dispose(); }
}
