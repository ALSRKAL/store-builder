import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRollback } from './core.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const sha = 'a'.repeat(40);
const config = { environment: 'production', pagesBranch: 'master', d1: { id }, r2: { bucket: 'store-prod-images' }, firebase: { projectId: 'store-prod' } };
function version() { return { id, resources: { bindings: [{ name: 'DB', type: 'd1', id }, { name: 'R2_BUCKET', type: 'r2_bucket', bucket_name: 'store-prod-images' }, { name: 'FIREBASE_PROJECT_ID', type: 'plain_text', text: 'store-prod' }, { name: 'RELEASE_ID', type: 'plain_text', text: `production-${sha}-123` }, { name: 'STORE_REALTIME', type: 'durable_object_namespace', namespace_id: 'stable-namespace', class_name: 'StoreRealtime' }] } }; }
const pages = { id, environment: 'production', latest_stage: { name: 'deploy', status: 'success' }, deployment_trigger: { metadata: { branch: 'master', commit_hash: sha, commit_message: `production-${sha}-123` } } };

test('rollback verifies same tested release Worker/Pages and existing storage namespaces', () => {
  assert.doesNotThrow(() => validateRollback(config, version(), pages, version()));
  const wrong = version(); wrong.resources.bindings.find(item => item.name === 'RELEASE_ID').text = `staging-${sha}-123`;
  assert.throws(() => validateRollback(config, wrong, pages, version()), /same recorded release/);
  const db = version(); db.resources.bindings.find(item => item.name === 'DB').id = '22222222-2222-4222-8222-222222222222';
  assert.throws(() => validateRollback(config, db, pages, version()), /identities/);
  const moved = version(); moved.resources.bindings.find(item => item.name === 'STORE_REALTIME').namespace_id = 'new-namespace';
  assert.throws(() => validateRollback(config, moved, pages, version()), /namespace/);
  assert.throws(() => validateRollback(config, version(), pages, { id }), /Cannot verify/);
});

test('release CLI missing configuration fails closed with machine-readable failure without cloud calls', async () => {
  // Child runs in a temporary copy so diagnostics never pollute real workspace or contact a cloud.
  const { spawnSync } = await import('node:child_process');
  const temp = mkdtempSync(join(tmpdir(), 'release-closed-'));
  try {
    const fs = await import('node:fs');
    fs.mkdirSync(join(temp, 'scripts/release'), { recursive: true });
    for (const file of ['cli.mjs', 'core.mjs', 'worker-artifact.mjs']) writeFileSync(join(temp, 'scripts/release', file), readFileSync(new URL(file, import.meta.url)));
    symlinkSync(new URL('../../node_modules', import.meta.url), join(temp, 'node_modules'));
    const result = spawnSync(process.execPath, [join(temp, 'scripts/release/cli.mjs'), 'preflight'], { cwd: temp, encoding: 'utf8', env: { PATH: process.env.PATH, RELEASE_ENVIRONMENT: 'production' } });
    assert.equal(result.status, 1);
    const report = JSON.parse(readFileSync(join(temp, '.release/report.json'), 'utf8'));
    assert.equal(report.status, 'failed');
    assert.match(report.error, /RELEASE_STAGING_CONFIG/);
    assert.deepEqual(report.steps, []);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('disabled monitoring makes no HTTP calls and records explicit skip', async () => {
  const { spawnSync } = await import('node:child_process');
  const temp = mkdtempSync(join(tmpdir(), 'release-monitor-'));
  try {
    const fs = await import('node:fs'); fs.mkdirSync(join(temp, 'scripts/release'), { recursive: true });
    for (const file of ['cli.mjs', 'core.mjs', 'worker-artifact.mjs']) writeFileSync(join(temp, 'scripts/release', file), readFileSync(new URL(file, import.meta.url)));
    symlinkSync(new URL('../../node_modules', import.meta.url), join(temp, 'node_modules'));
    const result = spawnSync(process.execPath, [join(temp, 'scripts/release/cli.mjs'), 'monitor'], { cwd: temp, encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(readFileSync(join(temp, '.release/report.json'), 'utf8')).status, 'skipped');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
