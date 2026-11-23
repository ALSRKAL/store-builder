#!/usr/bin/env node
// This CLI never authenticates, installs packages, or executes remote commands.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadManifest, localTest, SCHEMA_SQL, checksSql, captureRows, inventoryFromCaptures, planMigrations, createProof, materialize, createLocal, inspectDatabase, applyLocal } from './managed.mjs';

const [command, ...args] = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!args[i]?.startsWith('--') || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Expected --option value: ${args[i]}`);
  options[args[i].slice(2)] = args[i + 1];
}
const json = async path => JSON.parse(await readFile(resolve(path), 'utf8'));
const required = key => options[key] || (() => { throw new Error(`--${key} is required`); })();
let exitCode = 0;
async function run() {
  switch (command) {
    case 'check': {
      const bundle = await loadManifest({ base: options.base });
      return { ok: true, historyTable: bundle.manifest.historyTable, manifestSha256: bundle.manifestSha256, immutableBase: bundle.immutableBase, migrations: bundle.manifest.migrations };
    }
    case 'local-test': return localTest();
    case 'inspection-sql':
      return options.capture
        ? { phase: 'checks', readOnly: true, sql: checksSql(captureRows(await json(options.capture))) }
        : { phase: 'schema', readOnly: true, sql: SCHEMA_SQL + ';' };
    case 'inspect': {
      if (options.capture) return inventoryFromCaptures(await json(options.capture), await json(required('checks')), required('target'));
      const mf = createLocal(required('persist'));
      try { return await inspectDatabase(await mf.getD1Database('DB'), options.target ?? 'local-miniflare'); }
      finally { await mf.dispose(); }
    }
    case 'plan': {
      const result = await planMigrations(await json(required('inventory')), options.proof ? await json(options.proof) : undefined);
      if (!result.safeToApply) exitCode = 2;
      return result;
    }
    case 'proof':
      return createProof(await json(required('inventory')), required('backup'), required('acknowledge'));
    case 'materialize':
      return materialize(await json(required('inventory')), options.proof ? await json(options.proof) : undefined, await json(required('plan')), resolve(options['out-dir'] ?? required('out')));
    case 'local-apply': {
      const mf = createLocal(required('persist'));
      try { return await applyLocal(await mf.getD1Database('DB'), { target: options.target ?? 'local-miniflare', proof: options.proof ? await json(options.proof) : undefined, plan: options.plan ? await json(options.plan) : undefined }); }
      finally { await mf.dispose(); }
    }
    default: throw new Error('Usage: node scripts/db/migrations.mjs check [--base git-ref] | local-test | inspection-sql [--capture schema.json] | inspect --capture schema.json --checks checks.json --target database-id [--out inventory.json] | plan --inventory inventory.json [--proof proof.json] [--out plan.json] | proof --inventory inventory.json --backup dump.sql --acknowledge reviewed --out proof.json | materialize --plan plan.json --inventory inventory.json [--proof proof.json] --out empty-directory | local-apply --persist local-directory');
  }
}
try {
  const result = await run();
  const text = JSON.stringify(result, null, 2) + '\n';
  if (options.out && command !== 'materialize') await writeFile(resolve(options.out), text);
  process.stdout.write(text);
  process.exitCode = exitCode;
} catch (error) {
  process.stderr.write(JSON.stringify({ ok: false, error: error.message }) + '\n');
  process.exitCode = 1;
}
