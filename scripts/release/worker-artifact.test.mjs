import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorkerArtifact, assertWorkerModules, validateWorkerArtifact } from './worker-artifact.mjs';
import { redactError, run } from './core.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const config = {
  environment: 'staging', accountId: '1'.repeat(32), workerName: 'store-artifact-test', compatibilityDate: '2025-12-23',
  d1: { name: 'store-artifact-db', id: '11111111-1111-4111-8111-111111111111' }, r2: { bucket: 'store-artifact-images' },
  durableObject: { migrationTag: 'store-realtime-v1' }, apiUrl: 'https://api.artifact.invalid', r2PublicUrl: 'https://images.artifact.invalid',
  firebase: { projectId: 'store-artifact' }
};

test('real locked Wrangler builds JavaScript artifact and assembles no-bundle redeploy locally', { timeout: 120000 }, () => {
  const temp = mkdtempSync(join(tmpdir(), 'store-real-worker-artifact-'));
  try {
    const directory = resolve(temp, 'files/worker');
    const result = buildWorkerArtifact({ root, config, directory, work: resolve(temp, 'work') });
    assert.ok(result.hashes['index.js']);
    const source = readFileSync(result.entrypoint, 'utf8');
    assert.doesNotMatch(source.slice(0, 500), /Content-Disposition:|multipart\/form-data/);
    assert.match(source, /StoreRealtime/);
    const generated = JSON.parse(readFileSync(result.configFile, 'utf8'));
    assert.equal(generated.no_bundle, true);
    assert.equal(generated.find_additional_modules, true);
    assert.equal(generated.durable_objects.bindings[0].class_name, 'StoreRealtime');
    assert.equal(generated.r2_buckets[0].binding, 'R2_BUCKET');
    assert.deepEqual(assertWorkerModules(directory), result.hashes);
    // Same actual dry-run used before migrations in deploy(), no remote calls.
    validateWorkerArtifact({ root, config, directory, work: resolve(temp, 'pre-migration') });
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('serialized multipart payload or missing Durable Object export fails before Wrangler/D1 mutation', () => {
  const temp = mkdtempSync(join(tmpdir(), 'store-invalid-worker-artifact-'));
  try {
    mkdirSync(resolve(temp, 'worker'));
    writeFileSync(resolve(temp, 'worker/index.js'), '--boundary\r\nContent-Disposition: form-data; name="index.js"\r\nexport default {};');
    assert.throws(() => assertWorkerModules(resolve(temp, 'worker')), /not valid JavaScript/);
    writeFileSync(resolve(temp, 'worker/index.js'), 'export default { fetch() {} };');
    assert.throws(() => assertWorkerModules(resolve(temp, 'worker')), /StoreRealtime/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('diagnostics redact direct, JSON escaped, bearer credentials and are bounded', () => {
  const env = { CLOUDFLARE_API_TOKEN: 'cloud-secret-fixture', WORKER_SECRETS_JSON: JSON.stringify({ FCM_PRIVATE_KEY: 'private-secret-fixture\nline2', FCM_CLIENT_EMAIL: 'private@store-artifact.iam.gserviceaccount.com' }) };
  const message = `error cloud-secret-fixture Bearer unknown-secret ${env.WORKER_SECRETS_JSON} ${'X'.repeat(5000)}`;
  const redacted = redactError(message, env);
  assert.doesNotMatch(redacted, /cloud-secret-fixture|unknown-secret|private-secret-fixture|private@/);
  assert.ok(redacted.length < 1900);
  assert.match(redacted, /truncated/);
  assert.throws(() => run(process.execPath, ['-e', 'console.error("cloud-secret-fixture");process.exit(1)'], { env }), error => error.message.includes('[REDACTED]') && !error.message.includes('cloud-secret-fixture'));
});
