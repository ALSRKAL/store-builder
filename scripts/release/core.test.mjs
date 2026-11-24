import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configPair, checkSecrets, workerConfig, buildEnv, run, treeHashes, validateQuality, validateStageRun, validateApproval, checkReadiness, validateRollback, httpsUrl, assembleBackupBase64 } from './core.mjs';

function config(environment) {
  const prod = environment === 'production';
  const project = prod ? 'store-prod' : 'store-stage';
  return { environment, accountId: (prod ? '2' : '1').repeat(32), workerName: `${project}-api`, pagesProject: project, pagesBranch: 'master',
    d1: { binding: 'DB', name: `${project}-db`, id: prod ? '22222222-2222-4222-8222-222222222222' : '11111111-1111-4111-8111-111111111111' },
    r2: { binding: 'R2_BUCKET', bucket: `${project}-images` }, durableObject: { binding: 'STORE_REALTIME', className: 'StoreRealtime', migrationTag: 'store-realtime-v1' },
    apiUrl: `https://${project}-api.example.com`, siteUrl: `https://${project}.example.com`, readinessUrl: `https://${project}-api.example.com/api/ready`, r2PublicUrl: `https://${project}-images.example.com`,
    firebase: { apiKey: 'public-key', authDomain: `${project}.firebaseapp.com`, projectId: project, storageBucket: `${project}.firebasestorage.app`, messagingSenderId: prod ? '22222' : '11111', appId: prod ? '1:22222:web:prod' : '1:11111:web:stage', vapidKey: 'public-vapid' },
    requiredWorkerSecrets: ['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY'], resourcesProvisioned: true, compatibilityDate: '2025-12-23' };
}
function pair(staging = config('staging'), production = config('production')) { return { RELEASE_STAGING_CONFIG: JSON.stringify(staging), RELEASE_PRODUCTION_CONFIG: JSON.stringify(production) }; }
const sha = 'a'.repeat(40);
function quality(changes = {}) { return { event: 'push', head_sha: sha, head_branch: 'master', conclusion: 'success', status: 'completed', path: '.github/workflows/quality.yml', repository: { full_name: 'owner/store' }, head_repository: { full_name: 'owner/store' }, pull_requests: [], ...changes }; }

test('release requires complete separate environment JSON configuration', () => {
  assert.equal(configPair(pair()).staging.environment, 'staging');
  assert.throws(() => configPair({}), /Missing/);
  assert.throws(() => configPair(pair(undefined, { ...config('production'), environment: 'staging' })), /mismatch/);
  assert.throws(() => configPair(pair({ ...config('staging'), resourcesProvisioned: false })), /provisioned/);
});
for (const [label, mutate] of [
  ['Worker', (s,p) => { p.workerName = s.workerName; }], ['Pages', (s,p) => { p.pagesProject = s.pagesProject; }],
  ['D1', (s,p) => { p.d1.id = s.d1.id; }], ['R2', (s,p) => { p.r2.bucket = s.r2.bucket; }],
  ['Firebase', (s,p) => { p.firebase = s.firebase; }], ['API origin', (s,p) => { p.apiUrl = s.apiUrl; p.readinessUrl = s.readinessUrl; }]
]) test(`reject shared ${label} identity`, () => { const s = config('staging'), p = config('production'); mutate(s,p); assert.throws(() => configPair(pair(s,p)), /share/); });

test('missing, unsafe binding and shell-like identifiers fail before subprocess', () => {
  assert.throws(() => configPair(pair({ ...config('staging'), workerName: 'safe;touch injected' })), /Unsafe/);
  assert.throws(() => configPair(pair({ ...config('staging'), pagesBranch: '--project-name evil' })), /Unsafe/);
  const bad = config('staging'); bad.r2.binding = 'STORE_IMAGES'; assert.throws(() => configPair(pair(bad)), /binding/);
  assert.throws(() => configPair(pair({ ...config('staging'), readinessUrl: 'https://foreign.example.com/api/ready' })), /origin/);
});

test('reject missing environment secrets, wrong accounts and cross-project FCM identity', () => {
  const selected = config('staging');
  assert.throws(() => checkSecrets(selected, {}), /TOKEN/);
  const env = { CLOUDFLARE_API_TOKEN: 'scoped-token', CLOUDFLARE_ACCOUNT_ID: selected.accountId, WORKER_SECRETS_JSON: JSON.stringify({ FCM_CLIENT_EMAIL: 'app@store-stage.iam.gserviceaccount.com', FCM_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nprivate-test-fixture\n-----END PRIVATE KEY-----' }) };
  assert.ok(checkSecrets(selected, env));
  assert.throws(() => checkSecrets(selected, { ...env, CLOUDFLARE_ACCOUNT_ID: 'wrong' }), /match/);
  assert.throws(() => checkSecrets(selected, { ...env, WORKER_SECRETS_JSON: '{}' }), /FCM/);
  assert.throws(() => checkSecrets(selected, { ...env, WORKER_SECRETS_JSON: JSON.stringify({ FCM_CLIENT_EMAIL: 'app@store-prod.iam.gserviceaccount.com', FCM_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----' }) }), /wrong Firebase/);
});

test('reject undeclared, null and non-string secret entries rather than deleting secrets', () => {
  const selected = config('staging');
  const secret = { FCM_CLIENT_EMAIL: 'app@store-stage.iam.gserviceaccount.com', FCM_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----' };
  const env = { CLOUDFLARE_API_TOKEN: 'scoped-token', CLOUDFLARE_ACCOUNT_ID: selected.accountId };
  for (const change of [{ OTHER_SECRET: null }, { OTHER_SECRET: 'value' }, { FCM_PRIVATE_KEY: null }, { FCM_CLIENT_EMAIL: 123 }]) {
    assert.throws(() => checkSecrets(selected, { ...env, WORKER_SECRETS_JSON: JSON.stringify({ ...secret, ...change }) }), /Undeclared|Missing or invalid/);
  }
  assert.deepEqual(checkSecrets(selected, { ...env, WORKER_SECRETS_JSON: JSON.stringify(secret) }), secret);
});

test('shared Firebase staging requires explicit opt-in and byte-identical public config', () => {
  const s = config('staging'), p = config('production');
  s.firebase = { ...p.firebase, sharedWithProduction: true };
  assert.doesNotThrow(() => configPair(pair(s, p)));
  assert.throws(() => configPair(pair({ ...s, firebase: { ...p.firebase, sharedWithProduction: true, vapidKey: 'other' } }, p)), /exactly match/);
  assert.throws(() => configPair(pair(s, { ...p, firebase: { ...p.firebase, sharedWithProduction: true } })), /Production must not declare/);
  const implicit = config('staging'); implicit.firebase = { ...p.firebase };
  assert.throws(() => configPair(pair(implicit, p)), /share/);
});

test('generated Worker config includes all binding identities and initial SQLite DO migration', () => {
  const generated = workerConfig(config('staging'), '/project');
  assert.equal(generated.main, '/project/workers/api/index.ts');
  assert.equal(generated.r2_buckets[0].binding, 'R2_BUCKET');
  assert.equal(generated.durable_objects.bindings[0].name, 'STORE_REALTIME');
  assert.deepEqual(generated.migrations[0].new_sqlite_classes, ['StoreRealtime']);
  assert.equal(generated.vars.FIREBASE_PROJECT_ID, 'store-stage');
  assert.equal(generated.vars.SITE_URL, 'https://store-stage.example.com');
  assert.equal(generated.vars.API_URL, 'https://store-stage-api.example.com');
  assert.equal(generated.d1_databases[0].migrations_dir, undefined, 'never discover/apply old migration directory');
});

test('build gets exact public environment configuration, never cloud/private credentials', () => {
  const env = buildEnv(config('staging'), { PATH: '/bin', CLOUDFLARE_API_TOKEN: 'secret', GITHUB_TOKEN: 'secret', WORKER_SECRETS_JSON: 'secret', FCM_PRIVATE_KEY: 'secret', VITE_API_URL: 'https://production.invalid' });
  assert.equal(env.VITE_API_URL, 'https://store-stage-api.example.com');
  assert.equal(env.VITE_SITE_URL, 'https://store-stage.example.com');
  assert.equal(env.VITE_FIREBASE_PROJECT_ID, 'store-stage');
  for (const key of ['CLOUDFLARE_API_TOKEN', 'GITHUB_TOKEN', 'WORKER_SECRETS_JSON', 'FCM_PRIVATE_KEY']) assert.equal(env[key], undefined);
});

test('trust excludes PRs/forks/arbitrary workflow/branch or failed/incomplete runs', () => {
  assert.equal(validateQuality(quality(), 'owner/store', 'master', sha), sha);
  for (const patch of [{ event: 'pull_request' }, { head_branch: 'feature' }, { conclusion: 'failure' }, { status: 'in_progress' }, { head_sha: 'b'.repeat(40) }, { path: '.github/workflows/other.yml' }, { head_repository: { full_name: 'fork/store' } }, { pull_requests: [{}] }]) assert.throws(() => validateQuality(quality(patch), 'owner/store', 'master', sha), /trusted/);
});

test('production source must be successful staging workflow_run, not arbitrary dispatch', () => {
  const stage = quality({ event: 'workflow_run', path: '.github/workflows/release.yml' });
  assert.doesNotThrow(() => validateStageRun(stage, 'owner/store'));
  assert.throws(() => validateStageRun({ ...stage, event: 'workflow_dispatch' }, 'owner/store'));
});

test('production gate fails closed for unsupported/private plans, missing reviewer attestation and bypass', () => {
  const env = { PRODUCTION_APPROVAL_CONFIGURED: 'true', PRODUCTION_APPROVAL_MODE: 'required-reviewers' };
  const protectedEnv = { can_admins_bypass: false, protection_rules: [{ type: 'required_reviewers', reviewers: [{ reviewer: { id: 1 } }], prevent_self_review: true }] };
  assert.doesNotThrow(() => validateApproval(env, protectedEnv));
  assert.throws(() => validateApproval({}, protectedEnv));
  assert.throws(() => validateApproval(env, {}));
  assert.throws(() => validateApproval(env, { ...protectedEnv, can_admins_bypass: true }));
  assert.throws(() => validateApproval(env, { ...protectedEnv, protection_rules: [{ ...protectedEnv.protection_rules[0], prevent_self_review: false }] }));
});

test('readiness is real schema/storage/realtime health and same release, not liveness', async () => {
  const mock = body => async () => ({ ok: true, json: async () => body });
  const body = { status: 'ready', checks: { database: true, schema: true, storage: true, realtime: true }, releaseId: 'staging-tested-run' };
  assert.equal((await checkReadiness('https://safe.example.com/api/ready', mock(body), body.releaseId)).releaseId, body.releaseId);
  await assert.rejects(() => checkReadiness('https://safe.example.com', mock({ status: 'ok' })));
  await assert.rejects(() => checkReadiness('https://safe.example.com', mock(body), 'wrong-release'));
  await assert.rejects(() => checkReadiness('https://safe.example.com', mock({ ...body, checks: { ...body.checks, schema: false } })));
});

test('rollback blocks failed, preview, wrong-branch, absent versions before mutation', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const pages = { id, environment: 'production', latest_stage: { name: 'deploy', status: 'success' }, deployment_trigger: { metadata: { branch: 'master' } } };
  assert.doesNotThrow(() => validateRollback(config('staging'), { id }, pages));
  for (const patch of [{ environment: 'preview' }, { latest_stage: { name: 'deploy', status: 'failure' } }, { deployment_trigger: { metadata: { branch: 'feature' } } }, { id: '--bad' }]) assert.throws(() => validateRollback(config('staging'), { id }, { ...pages, ...patch }));
});

test('safe subprocess uses argument arrays and never interprets shell syntax', () => {
  const temp = mkdtempSync(join(tmpdir(), 'release-shell-'));
  try {
    const payload = `; touch ${join(temp, 'injected')} ; $(touch ${join(temp, 'injected')})`;
    const result = run(process.execPath, ['-e', 'process.stdout.write(process.argv[1])', payload]);
    assert.equal(result, payload);
    assert.throws(() => readFileSync(join(temp, 'injected')), /ENOENT/);
    assert.throws(() => run('sh', ['-c', payload]), /Unsafe/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('artifact hashes are deterministic, detect modifications and reject symlink traversal', () => {
  const temp = mkdtempSync(join(tmpdir(), 'release-hash-'));
  try {
    writeFileSync(join(temp, 'index.html'), 'staging'); const hashes = treeHashes(temp);
    assert.deepEqual(treeHashes(temp), hashes);
    writeFileSync(join(temp, 'index.html'), 'production'); assert.notDeepEqual(treeHashes(temp), hashes);
    symlinkSync('/etc/passwd', join(temp, 'leak')); assert.throws(() => treeHashes(temp), /symlinks/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('monitor URL rejects local/plain HTTP and credential-bearing URLs', () => {
  for (const url of ['http://example.com', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.1', 'https://user:password@example.com', 'https://example.com?token=secret']) assert.throws(() => httpsUrl(url, 'monitor URL'));
});

test('adoption backup chunks are contiguous and ordered', () => {
  assert.equal(assembleBackupBase64({ DB_ADOPTION_BACKUP_BASE64_1: 'AAA', DB_ADOPTION_BACKUP_BASE64_2: 'BBB' }), 'AAABBB');
  assert.equal(assembleBackupBase64({ DB_ADOPTION_BACKUP_BASE64: 'single' }), 'single');
  assert.equal(assembleBackupBase64({}), '');
  assert.throws(() => assembleBackupBase64({ DB_ADOPTION_BACKUP_BASE64_1: 'AAA', DB_ADOPTION_BACKUP_BASE64_3: 'CCC' }), /contiguous/);
  assert.throws(() => assembleBackupBase64({ DB_ADOPTION_BACKUP_BASE64_2: 'BBB' }), /contiguous/);
});
