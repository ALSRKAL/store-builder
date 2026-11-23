import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SHA = /^[0-9a-f]{40}$/;
const NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
export const required = (value, label) => { if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value)) throw new Error(`Missing or invalid ${label}`); return value; };
export function httpsUrl(value, label) {
  const url = new URL(required(value, label));
  const privateIp = /^(localhost|127\.|0\.|\[|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.)/;
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search || privateIp.test(url.hostname)) throw new Error(`Unsafe ${label}`);
  return url.href.replace(/\/$/, '');
}
function name(value, label) { if (!NAME.test(required(value, label))) throw new Error(`Unsafe ${label}`); return value; }
export function validateConfig(config, environment) {
  if (!config || config.environment !== environment) throw new Error('Environment configuration mismatch');
  if (!/^[0-9a-f]{32}$/.test(config.accountId)) throw new Error('Invalid accountId');
  name(config.workerName, 'workerName'); name(config.pagesProject, 'pagesProject'); name(config.d1?.name, 'd1.name'); name(config.r2?.bucket, 'r2.bucket');
  if (!UUID.test(config.d1?.id)) throw new Error('Invalid D1 ID');
  if (config.d1.binding !== 'DB' || config.r2.binding !== 'R2_BUCKET') throw new Error('Worker requires DB and R2_BUCKET bindings');
  if (config.durableObject?.binding !== 'STORE_REALTIME' || config.durableObject.className !== 'StoreRealtime') throw new Error('Missing STORE_REALTIME binding');
  name(config.durableObject.migrationTag, 'durableObject.migrationTag');
  required(config.pagesBranch, 'pagesBranch');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,99}$/.test(config.pagesBranch) || config.pagesBranch.includes('..')) throw new Error('Unsafe Pages branch');
  for (const key of ['apiUrl', 'siteUrl', 'readinessUrl', 'r2PublicUrl']) config[key] = httpsUrl(config[key], key);
  if (new URL(config.readinessUrl).origin !== new URL(config.apiUrl).origin) throw new Error('Readiness URL must belong to Worker origin');
  if (config.readinessUrl !== `${config.apiUrl}/api/ready`) throw new Error('Readiness must use /api/ready');
  const firebase = config.firebase;
  for (const key of ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'vapidKey']) required(firebase?.[key], `firebase.${key}`);
  if (!/^[a-z][a-z0-9-]{4,29}$/.test(firebase.projectId)) throw new Error('Invalid Firebase project ID');
  if (firebase.authDomain !== `${firebase.projectId}.firebaseapp.com` || ![`${firebase.projectId}.appspot.com`, `${firebase.projectId}.firebasestorage.app`].includes(firebase.storageBucket)) throw new Error('Firebase identities must match project');
  if (!Array.isArray(config.requiredWorkerSecrets) || !config.requiredWorkerSecrets.length || config.requiredWorkerSecrets.some(key => !/^FCM_(CLIENT_EMAIL|PRIVATE_KEY)$/.test(key)) || !['FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY'].every(key => config.requiredWorkerSecrets.includes(key))) throw new Error('Declare required FCM Worker secrets');
  if (config.resourcesProvisioned !== true) throw new Error('D1/R2/Pages must be provisioned explicitly before release');
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(config.compatibilityDate)) throw new Error('Missing pinned compatibilityDate');
  return config;
}
export function configPair(env = process.env) {
  const staging = validateConfig(JSON.parse(required(env.RELEASE_STAGING_CONFIG, 'RELEASE_STAGING_CONFIG')), 'staging');
  const production = validateConfig(JSON.parse(required(env.RELEASE_PRODUCTION_CONFIG, 'RELEASE_PRODUCTION_CONFIG')), 'production');
  for (const getter of [c => c.workerName, c => c.pagesProject, c => c.d1.id, c => c.d1.name, c => c.r2.bucket, c => c.firebase.projectId, c => c.firebase.appId, c => c.firebase.messagingSenderId, c => c.r2PublicUrl, c => new URL(c.apiUrl).origin, c => new URL(c.siteUrl).origin]) {
    if (getter(staging) === getter(production)) throw new Error('Staging and production must not share resource identities or origins');
  }
  return { staging, production };
}
export function checkSecrets(config, env = process.env) {
  required(env.CLOUDFLARE_API_TOKEN, 'CLOUDFLARE_API_TOKEN');
  if (env.CLOUDFLARE_ACCOUNT_ID !== config.accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID does not match selected environment');
  const secrets = JSON.parse(required(env.WORKER_SECRETS_JSON, 'WORKER_SECRETS_JSON'));
  if (!secrets || typeof secrets !== 'object' || Array.isArray(secrets)) throw new Error('Worker secrets must be an object');
  if (Object.keys(secrets).some(key => !config.requiredWorkerSecrets.includes(key))) throw new Error('Undeclared Worker secret entry');
  const approved = {};
  for (const key of config.requiredWorkerSecrets) {
    if (typeof secrets[key] !== 'string') throw new Error(`Missing or invalid ${key}`);
    required(secrets[key].replaceAll('\n', '\\n'), key);
    approved[key] = secrets[key];
  }
  if (!approved.FCM_CLIENT_EMAIL.endsWith(`@${config.firebase.projectId}.iam.gserviceaccount.com`)) throw new Error('FCM service account belongs to wrong Firebase project');
  if (!approved.FCM_PRIVATE_KEY.includes('-----BEGIN PRIVATE KEY-----')) throw new Error('Invalid FCM private key');
  return approved;
}
export function workerConfig(config, root, main) {
  return {
    name: config.workerName, account_id: config.accountId,
    main: main || resolve(root, 'workers/api/index.ts'), compatibility_date: config.compatibilityDate,
    compatibility_flags: ['nodejs_compat'], workers_dev: true, observability: { enabled: true },
    d1_databases: [{ binding: 'DB', database_name: config.d1.name, database_id: config.d1.id }],
    r2_buckets: [{ binding: 'R2_BUCKET', bucket_name: config.r2.bucket }],
    durable_objects: { bindings: [{ name: 'STORE_REALTIME', class_name: 'StoreRealtime' }] },
    migrations: [{ tag: config.durableObject.migrationTag, new_sqlite_classes: ['StoreRealtime'] }],
    vars: { ENVIRONMENT: config.environment, FIREBASE_PROJECT_ID: config.firebase.projectId, FCM_PROJECT_ID: config.firebase.projectId, R2_PUBLIC_URL: config.r2PublicUrl },
    ...(main ? { no_bundle: true, find_additional_modules: true, rules: [
      { type: 'ESModule', globs: ['**/*.js', '**/*.mjs'], fallthrough: true },
      { type: 'CompiledWasm', globs: ['**/*.wasm'], fallthrough: true },
      { type: 'Text', globs: ['**/*.txt', '**/*.html'], fallthrough: true },
      { type: 'Data', globs: ['**/*.bin'], fallthrough: true }
    ] } : {})
  };
}
export function buildEnv(config, env = process.env) {
  // Vite public configuration only. Do not leak cloud credentials to build subprocesses.
  const clean = Object.fromEntries(Object.entries(env).filter(([key]) => !/TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ADOPTION|^VITE_|RELEASE_.*CONFIG/.test(key)));
  return { ...clean, STORE_ISOLATED_BUILD: 'true', VITE_API_URL: config.apiUrl, VITE_R2_PUBLIC_URL: config.r2PublicUrl,
    ...Object.fromEntries(Object.entries(config.firebase).map(([key, value]) => [`VITE_FIREBASE_${key.replace(/[A-Z]/g, letter => `_${letter}`).toUpperCase()}`, value])) };
}
export function redactError(value, env = process.env, limit = 1800) {
  let text = String(value ?? 'Unknown failure');
  const sensitive = [];
  function collect(value) {
    if (typeof value === 'string' && value.length >= 4) sensitive.push(value);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  for (const [key, value] of Object.entries(env)) if (/TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ADOPTION/i.test(key) && value) {
    collect(value);
    try { collect(JSON.parse(value)); } catch { /* Plain secret, not JSON. */ }
  }
  for (const secret of sensitive.sort((a, b) => b.length - a.length)) text = text.split(secret).join('[REDACTED]').split(JSON.stringify(secret).slice(1, -1)).join('[REDACTED]');
  text = text.replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[REDACTED PRIVATE KEY]')
    .replace(/(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/((?:token|password|secret|private_key)["']?\s*[:=]\s*)[^\s,}]+/gi, '$1[REDACTED]')
    // Remove ANSI terminal escape sequences from bounded diagnostics.
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;]*m/g, '');
  return text.length > limit ? `${text.slice(0, limit)} [truncated]` : text;
}
export function run(command, args, options = {}) {
  if (!['npm', process.execPath].includes(command) || args.some(arg => typeof arg !== 'string' || arg.includes('\0'))) throw new Error('Unsafe subprocess');
  const result = spawnSync(command, args, { cwd: options.cwd, env: options.env ?? process.env, input: options.input, encoding: 'utf8', shell: false, timeout: options.timeout ?? 300000, maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message ?? result.stderr ?? `exit ${result.status}`;
    throw new Error(redactError(`Subprocess failed (${command} ${args.slice(0, 3).join(' ')}; exit ${result.status}): ${detail}`, options.env ?? process.env));
  }
  return result.stdout;
}
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function writeJson(path, value) { mkdirSync(resolve(path, '..'), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
export function treeHashes(directory) {
  const hashes = {};
  function walk(path) { for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(path, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Artifact symlinks prohibited');
    if (entry.isDirectory()) walk(full); else if (statSync(full).isFile()) hashes[relative(directory, full).replaceAll('\\', '/')] = createHash('sha256').update(readFileSync(full)).digest('hex');
  } }
  walk(directory); return hashes;
}
export function validateQuality(runInfo, repository, branch, sha) {
  if (!SHA.test(sha) || runInfo.head_sha !== sha || runInfo.event !== 'push' || runInfo.head_branch !== branch || runInfo.conclusion !== 'success' || runInfo.status !== 'completed' || runInfo.path !== '.github/workflows/quality.yml' || runInfo.repository?.full_name !== repository || runInfo.head_repository?.full_name !== repository || (runInfo.pull_requests?.length ?? 0) !== 0) throw new Error('Not a successful trusted default-branch Quality push');
  return sha;
}
export function validateStageRun(runInfo, repository) {
  if (runInfo.event !== 'workflow_run' || runInfo.path !== '.github/workflows/release.yml' || runInfo.conclusion !== 'success' || runInfo.status !== 'completed' || runInfo.repository?.full_name !== repository) throw new Error('Not a successful staging Release run');
}
export function validateApproval(env, environment) {
  if (env.PRODUCTION_APPROVAL_CONFIGURED !== 'true' || env.PRODUCTION_APPROVAL_MODE !== 'required-reviewers') throw new Error('Production approval is not configured/confirmed');
  const reviewer = environment.protection_rules?.find(rule => rule.type === 'required_reviewers');
  if (!reviewer?.reviewers?.length || reviewer.prevent_self_review !== true || environment.can_admins_bypass !== false) throw new Error('Production requires non-bypassable required reviewers and prevent_self_review; unsupported private-account plans must not deploy');
}
export async function checkReadiness(url, fetcher = fetch, releaseId) {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`Readiness returned ${response.status}`);
  const body = await response.json();
  if (body.status !== 'ready' || !['database', 'schema', 'storage', 'realtime'].every(key => body.checks?.[key] === true || body.checks?.[key] === 'ok') || (releaseId && body.releaseId !== releaseId)) throw new Error('Readiness must prove schema, storage, Durable Object availability and selected release ID');
  return body;
}
export function validateRollback(config, workerVersion, pagesDeployment, currentVersion) {
  if (!UUID.test(workerVersion?.id) || !UUID.test(pagesDeployment?.id) || pagesDeployment.environment !== 'production' || pagesDeployment.latest_stage?.name !== 'deploy' || pagesDeployment.latest_stage?.status !== 'success' || pagesDeployment.deployment_trigger?.metadata?.branch !== config.pagesBranch) throw new Error('Rollback requires retained Worker version and successful Pages production deployment on configured branch');
  if (currentVersion) {
    const bindings = workerVersion.resources?.bindings;
    const currentBindings = currentVersion.resources?.bindings;
    if (!Array.isArray(bindings) || !Array.isArray(currentBindings)) throw new Error('Cannot verify retained rollback binding identities');
    const binding = name => bindings.find(item => item.name === name);
    const sha = pagesDeployment.deployment_trigger.metadata.commit_hash;
    const releaseId = binding('RELEASE_ID')?.text;
    if (!SHA.test(sha) || typeof releaseId !== 'string' || !releaseId.startsWith(`${config.environment}-${sha}-`) || releaseId !== pagesDeployment.deployment_trigger.metadata.commit_message) throw new Error('Worker and Pages must belong to same recorded release');
    if (binding('DB')?.id !== config.d1.id || binding('R2_BUCKET')?.bucket_name !== config.r2.bucket || binding('FIREBASE_PROJECT_ID')?.text !== config.firebase.projectId) throw new Error('Rollback would change resource identities');
    const durable = binding('STORE_REALTIME');
    const currentDurable = currentBindings.find(item => item.name === 'STORE_REALTIME');
    if (!durable?.namespace_id || durable.namespace_id !== currentDurable?.namespace_id || durable.class_name !== 'StoreRealtime') throw new Error('Rollback cannot cross Durable Object namespace/migration boundaries');
  }
}
