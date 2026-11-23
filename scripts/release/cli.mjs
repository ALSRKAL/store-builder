import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configPair, checkSecrets, workerConfig, buildEnv, run, fingerprint, writeJson, treeHashes, validateQuality, validateApproval, checkReadiness, validateRollback, SHA, UUID, required, httpsUrl, redactError } from './core.mjs';
import { buildWorkerArtifact, validateWorkerArtifact } from './worker-artifact.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, '.release');
const env = process.env;
const command = process.argv[2];
const environment = env.RELEASE_ENVIRONMENT || 'staging';
const report = { command, environment, runId: env.GITHUB_RUN_ID || null, startedAt: new Date().toISOString(), status: 'failed', steps: [] };
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const artifact = resolve(root, 'release-artifact');
function step(name, result) { report.steps.push({ name, ...result }); writeJson(resolve(output, 'report.json'), report); }
function wrangler(args, options = {}) {
  return run('npm', ['exec', '--no', '--', 'wrangler', ...args], { cwd: root, env: { ...env, WRANGLER_SEND_METRICS: 'false', CI: 'true' }, ...options });
}
function db(args) {
  const cleanDbEnv = Object.fromEntries(Object.entries(env).filter(([key]) => !/TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ADOPTION|RELEASE_.*CONFIG/.test(key)));
  const bytes = run(process.execPath, ['scripts/db/migrations.mjs', ...args], { cwd: root, env: cleanDbEnv });
  return bytes;
}
function inspection(args = []) { return JSON.parse(db(['inspection-sql', ...args])).sql; }
async function api(base, path, token, method = 'GET', body) {
  const response = await fetch(`${base}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${required(token, 'API token')}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(base.includes('github') ? { 'X-GitHub-Api-Version': '2022-11-28' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok || data.success === false) throw new Error(`Remote ${method} failed (${response.status}, ${path.split('/').slice(-2).join('/')})`);
  return data.result ?? data;
}
const gh = path => api('https://api.github.com', path, env.GITHUB_TOKEN);
function cf(config, path, method, body) { return api('https://api.cloudflare.com/client/v4', `/accounts/${config.accountId}${path}`, env.CLOUDFLARE_API_TOKEN, method, body); }
async function trusted(sha, qualityRunId) {
  const repo = required(env.GITHUB_REPOSITORY, 'GITHUB_REPOSITORY');
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo) || !SHA.test(sha) || !/^\d+$/.test(qualityRunId)) throw new Error('Invalid source identity');
  const repository = await gh(`/repos/${repo}`);
  const quality = await gh(`/repos/${repo}/actions/runs/${qualityRunId}`);
  validateQuality(quality, repo, repository.default_branch, sha);
  const runs = await gh(`/repos/${repo}/actions/workflows/quality.yml/runs?event=push&branch=${encodeURIComponent(repository.default_branch)}&head_sha=${sha}&per_page=100`);
  const latest = runs.workflow_runs?.find(item => item.head_sha === sha && item.event === 'push');
  if (String(latest?.id) !== qualityRunId) throw new Error('Selected Quality run is not the latest push run for this tested SHA');
  const compare = await gh(`/repos/${repo}/compare/${sha}...${encodeURIComponent(repository.default_branch)}`);
  if (compare.merge_base_commit?.sha !== sha || !['ahead', 'identical'].includes(compare.status)) throw new Error('Tested SHA no longer belongs to trusted default branch');
  return { repository: repo, defaultBranch: repository.default_branch, sha, qualityRunId: String(qualityRunId) };
}
async function approval() {
  if (environment !== 'production') return;
  validateApproval(env, await gh(`/repos/${env.GITHUB_REPOSITORY}/environments/production`));
}
function selected() { const pair = configPair(env); if (!['staging', 'production'].includes(environment)) throw new Error('Invalid release environment'); return pair[environment]; }
function generated(config, main, releaseId) {
  const file = resolve(output, `${environment}-worker.json`);
  const result = workerConfig(config, root, main);
  if (releaseId) result.vars.RELEASE_ID = releaseId;
  writeJson(file, result); return file;
}
function verifyArtifact(config) {
  const manifest = json(resolve(artifact, 'manifest.json'));
  const releaseMarker = json(resolve(artifact, 'files/pages/release.json'));
  if (releaseMarker.environment !== environment || releaseMarker.sha !== env.RELEASE_SHA) throw new Error('Artifact Pages release marker mismatch');
  if (manifest.environment !== environment || manifest.configFingerprint !== fingerprint(config) || !SHA.test(manifest.sha) || String(manifest.qualityRunId) !== String(env.QUALITY_RUN_ID) || manifest.sha !== env.RELEASE_SHA || JSON.stringify(treeHashes(resolve(artifact, 'files'))) !== JSON.stringify(manifest.hashes)) throw new Error('Artifact SHA, environment, public configuration or checksum mismatch');
  return manifest;
}
async function remotePreflight(config) {
  const database = await cf(config, `/d1/database/${config.d1.id}`);
  if (database.name !== config.d1.name) throw new Error('D1 name/identity mismatch');
  await cf(config, `/r2/buckets/${config.r2.bucket}`);
  const pages = await cf(config, `/pages/projects/${config.pagesProject}`);
  if (pages.production_branch !== config.pagesBranch) throw new Error('Pages branch must be existing project production branch (separate staging project)');
  return pages;
}
async function migrate(config, configFile) {
  const work = resolve(output, 'db'); mkdirSync(work, { recursive: true });
  const schemaFile = resolve(work, 'schema.json'); const checksFile = resolve(work, 'checks.json'); const inventoryFile = resolve(work, 'inventory.json'); const planFile = resolve(work, 'plan.json');
  writeFileSync(schemaFile, wrangler(['d1', 'execute', 'DB', '--config', configFile, '--remote', '--command', inspection(), '--json']));
  writeFileSync(checksFile, wrangler(['d1', 'execute', 'DB', '--config', configFile, '--remote', '--command', inspection(['--capture', schemaFile]), '--json']));
  db(['inspect', '--capture', schemaFile, '--checks', checksFile, '--target', config.d1.id, '--out', inventoryFile]);
  const proofFile = resolve(work, 'proof.json'); const proofArgs = [];
  if (env.DB_ADOPTION_PROOF_JSON) {
    const proof = JSON.parse(env.DB_ADOPTION_PROOF_JSON);
    const backupFile = resolve(work, 'adoption-backup.sql');
    const encoded = required(env.DB_ADOPTION_BACKUP_BASE64, 'DB_ADOPTION_BACKUP_BASE64');
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(encoded)) throw new Error('Invalid adoption backup encoding');
    const bytes = Buffer.from(encoded, 'base64');
    if (createHash('sha256').update(bytes).digest('hex') !== proof.backupSha256 || bytes.length !== proof.backupBytes) throw new Error('Adoption backup checksum/length mismatch');
    writeFileSync(backupFile, bytes, { mode: 0o600 });
    // Only relocate verified proof material; never generate acknowledgement or baseline history.
    proof.backupPath = backupFile;
    writeJson(proofFile, proof); proofArgs.push('--proof', proofFile);
  }
  const plan = JSON.parse(db(['plan', '--inventory', inventoryFile, ...proofArgs]));
  if (!plan.safeToApply || (plan.requiresAdoption && !proofArgs.length)) throw new Error('Schema adoption requires explicit reviewed proof; unsafe migration plan blocked');
  writeJson(planFile, plan);
  const checkpoint = JSON.parse(wrangler(['d1', 'time-travel', 'info', 'DB', '--config', configFile, '--json']));
  // Bookmarks are recovery references, not backups. Never restore SQL automatically.
  if (!checkpoint.bookmark && !checkpoint.result?.bookmark) throw new Error('Missing D1 Time Travel checkpoint bookmark');
  writeJson(resolve(output, 'checkpoint.json'), { databaseId: config.d1.id, bookmark: checkpoint.bookmark ?? checkpoint.result.bookmark, createdAt: new Date().toISOString() });
  step('checkpoint', { databaseId: config.d1.id });
  const batches = resolve(work, 'batches');
  const batchManifest = JSON.parse(db(['materialize', '--plan', planFile, '--inventory', inventoryFile, ...proofArgs, '--out', batches]));
  if (!batchManifest.safeToApply || batchManifest.target !== config.d1.id || !Array.isArray(batchManifest.batches)) throw new Error('Missing validated migration batch manifest');
  for (const batch of batchManifest.batches) {
    const filename = basename(batch.file);
    const fullPath = resolve(batches, filename);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.sql$/.test(filename) || resolve(batch.file) !== fullPath || createHash('sha256').update(readFileSync(fullPath)).digest('hex') !== batch.sha256) throw new Error('Unsafe migration filename or checksum');
    wrangler(['d1', 'execute', 'DB', '--config', configFile, '--remote', '--file', fullPath, '--json']);
  }
  // A second read + plan must show no unapplied migrations; do not infer success from exit alone.
  writeFileSync(schemaFile, wrangler(['d1', 'execute', 'DB', '--config', configFile, '--remote', '--command', inspection(), '--json']));
  writeFileSync(checksFile, wrangler(['d1', 'execute', 'DB', '--config', configFile, '--remote', '--command', inspection(['--capture', schemaFile]), '--json']));
  db(['inspect', '--capture', schemaFile, '--checks', checksFile, '--target', config.d1.id, '--out', inventoryFile]);
  const after = JSON.parse(db(['plan', '--inventory', inventoryFile]));
  if (!after.safeToApply || after.pending?.length || after.requiresAdoption) throw new Error('Post-migration schema/ledger validation failed');
  step('forward-migrations', { batches: batchManifest.batches.length });
}
async function waitReady(config, releaseId) {
  for (let attempt = 0; attempt < 12; attempt++) {
    try { return await checkReadiness(config.readinessUrl, fetch, releaseId); } catch (error) {
      if (attempt === 11) throw error;
      await new Promise(done => setTimeout(done, 5000));
    }
  }
}
// Pages edge propagation can lag behind the successful deployment record; poll with a unique cache key.
async function waitPagesMarker(config, manifest, releaseId) {
  let last = 'marker unavailable';
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const url = `${config.siteUrl}/release.json?release=${encodeURIComponent(releaseId)}&attempt=${attempt}`;
      const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } });
      if (response.ok) {
        const live = await response.json();
        if (live.sha === manifest.sha && live.environment === environment) return live;
        last = `sha=${live.sha} environment=${live.environment}`;
      } else last = `status ${response.status}`;
    } catch (error) { last = error instanceof Error ? error.message : String(error); }
    if (attempt < 11) await new Promise(done => setTimeout(done, 5000));
  }
  throw new Error(`Pages deployed SHA/environment readiness mismatch (last seen ${last})`);
}
async function build(config) {
  const provenance = await trusted(env.RELEASE_SHA, env.QUALITY_RUN_ID);
  mkdirSync(resolve(artifact, 'files'), { recursive: true });
  const files = resolve(artifact, 'files'); const publicEnv = buildEnv(config);
  run('npm', ['run', 'build', '--', '--mode', environment, '--outDir', resolve(files, 'pages')], { cwd: root, env: publicEnv });
  writeJson(resolve(files, 'pages/release.json'), { sha: provenance.sha, environment });
  buildWorkerArtifact({ root, config, directory: resolve(files, 'worker'), work: resolve(output, 'worker-build') });
  if (!existsSync(resolve(files, 'worker/index.js')) || !existsSync(resolve(files, 'pages/index.html'))) throw new Error('Build did not produce complete immutable artifacts');
  writeJson(resolve(artifact, 'manifest.json'), { schema: 1, environment, ...provenance, configFingerprint: fingerprint(config), hashes: treeHashes(files), builtAt: new Date().toISOString() });
  step('build', { sha: provenance.sha });
}
async function deploy(config) {
  await approval(); checkSecrets(config); const manifest = verifyArtifact(config);
  await trusted(manifest.sha, String(manifest.qualityRunId));
  // Reject invalid JS/missing modules and perform real no-bundle upload assembly before any DB mutation.
  validateWorkerArtifact({ root, config, directory: resolve(artifact, 'files/worker'), work: resolve(output, 'worker-preflight') });
  step('worker-artifact-preflight', { validJavaScript: true, dryrunRedeploy: true });
  const pages = await remotePreflight(config);
  const releaseId = `${environment}-${manifest.sha}-${required(env.GITHUB_RUN_ID, 'GITHUB_RUN_ID')}`;
  report.releaseId = releaseId; report.sha = manifest.sha;
  const configFile = generated(config, resolve(artifact, 'files/worker/index.js'), releaseId);
  await migrate(config, configFile);
  // deploy, not versions upload: first SQLite Durable Object migration is supported by deploy.
  wrangler(['deploy', '--config', configFile, '--no-bundle']);
  step('worker-deploy', { worker: config.workerName });
  wrangler(['secret', 'bulk', '--config', configFile], { input: JSON.stringify(checkSecrets(config)) });
  step('worker-secrets', { configured: true });
  await waitReady(config, releaseId); step('worker-readiness', { ready: true });
  wrangler(['pages', 'deploy', resolve(artifact, 'files/pages'), '--project-name', config.pagesProject, '--branch', config.pagesBranch, '--commit-hash', manifest.sha, '--commit-message', releaseId, '--commit-dirty=false']);
  step('pages-deploy', { project: config.pagesProject, branch: pages.production_branch });
  const latest = await cf(config, `/pages/projects/${config.pagesProject}/deployments?per_page=10`);
  const matching = latest.find(item => item.deployment_trigger?.metadata?.commit_hash === manifest.sha && item.deployment_trigger?.metadata?.commit_message === releaseId && item.environment === 'production' && item.latest_stage?.name === 'deploy' && item.latest_stage?.status === 'success');
  if (!matching) throw new Error('Cannot confirm successful Pages release deployment');
  await waitPagesMarker(config, manifest, releaseId);
  step('pages-marker', { sha: manifest.sha });
  const deployments = await cf(config, `/workers/scripts/${config.workerName}/deployments`);
  const current = deployments.deployments?.[0];
  if (current?.versions?.length !== 1 || current.versions[0].percentage !== 100) throw new Error('Cannot identify fully deployed Worker version');
  report.workerVersionId = current.versions[0].version_id; report.pagesDeploymentId = matching.id;
  if (!UUID.test(report.workerVersionId) || !UUID.test(report.pagesDeploymentId)) throw new Error('Invalid confirmed release identifiers');
  const deployedVersion = await cf(config, `/workers/scripts/${config.workerName}/versions/${report.workerVersionId}`);
  if (deployedVersion.resources?.bindings?.find(item => item.name === 'RELEASE_ID')?.text !== releaseId) throw new Error('Current Worker version differs from tested release');
  writeJson(resolve(output, 'release.json'), { ...manifest, releaseId, workerVersionId: report.workerVersionId, pagesDeploymentId: report.pagesDeploymentId });
}
async function rollback(config) {
  await approval(); checkSecrets(config);
  if (env.ROLLBACK_CONFIRMATION !== 'code-only-no-sql') throw new Error('Explicit code-only rollback confirmation required');
  const workerId = required(env.ROLLBACK_WORKER_VERSION_ID, 'ROLLBACK_WORKER_VERSION_ID'); const pagesId = required(env.ROLLBACK_PAGES_DEPLOYMENT_ID, 'ROLLBACK_PAGES_DEPLOYMENT_ID');
  if (!UUID.test(workerId) || !UUID.test(pagesId)) throw new Error('Invalid rollback IDs');
  await remotePreflight(config);
  const worker = await cf(config, `/workers/scripts/${config.workerName}/versions/${workerId}`);
  const pages = await cf(config, `/pages/projects/${config.pagesProject}/deployments/${pagesId}`);
  const deployments = await cf(config, `/workers/scripts/${config.workerName}/deployments`);
  const active = deployments.deployments?.[0];
  if (active?.versions?.length !== 1 || active.versions[0].percentage !== 100) throw new Error('Rollback requires a known current 100% deployment');
  const current = await cf(config, `/workers/scripts/${config.workerName}/versions/${active.versions[0].version_id}`);
  validateRollback(config, worker, pages, current);
  if (worker.resources?.script_runtime?.migration_tag !== current.resources?.script_runtime?.migration_tag) throw new Error('Rollback cannot cross applied Durable Object migration tags');
  if (!SHA.test(pages.deployment_trigger?.metadata?.commit_hash)) throw new Error('Rollback target lacks commit provenance');
  await trusted(pages.deployment_trigger.metadata.commit_hash, required(env.ROLLBACK_QUALITY_RUN_ID, 'ROLLBACK_QUALITY_RUN_ID'));
  if (env.ROLLBACK_SCHEMA_COMPATIBLE !== 'true') throw new Error('Operator must confirm retained code compatibility with current forward-only schema');
  // Same endpoint/payload as verified Wrangler rollback, intentionally no ?force=true.
  // Wrangler --yes may auto-confirm changed secrets; this guarded API fails instead.
  await cf(config, `/workers/scripts/${config.workerName}/deployments`, 'POST', { strategy: 'percentage', versions: [{ version_id: workerId, percentage: 100 }], annotations: { 'workers/message': `Code-only recovery run ${env.GITHUB_RUN_ID}` } });
  step('worker-rollback', { versionId: workerId });
  const rolled = await cf(config, `/workers/scripts/${config.workerName}/deployments`);
  if (rolled.deployments?.[0]?.versions?.[0]?.version_id !== workerId || rolled.deployments[0].versions.length !== 1 || rolled.deployments[0].versions[0].percentage !== 100) throw new Error('Worker rollback was not confirmed');
  await waitReady(config, worker.resources.bindings.find(item => item.name === 'RELEASE_ID').text); step('worker-readiness', { ready: true });
  // Wrangler has no Pages rollback command. Official API only accepts retained successful production deployments.
  await cf(config, `/pages/projects/${config.pagesProject}/deployments/${pagesId}/rollback`, 'POST');
  step('pages-rollback', { deploymentId: pagesId });
  const restored = await cf(config, `/pages/projects/${config.pagesProject}`);
  if (restored.canonical_deployment?.id !== pagesId) throw new Error('Pages rollback target was not confirmed');
}
async function monitor() {
  if (env.MONITORING_ENABLED !== 'true') { report.status = 'skipped'; return; }
  const urls = JSON.parse(required(env.MONITOR_URLS_JSON, 'MONITOR_URLS_JSON'));
  if (!Array.isArray(urls) || !urls.length || urls.length > 10) throw new Error('Configure 1-10 monitoring targets');
  for (const target of urls) {
    const url = httpsUrl(target.url, 'monitor URL');
    if (target.kind === 'readiness') await checkReadiness(url);
    else if (target.kind === 'site') { const result = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15000) }); if (!result.ok) throw new Error(`Monitor returned ${result.status}`); }
    else throw new Error('Unknown monitor target kind');
    step('monitor', { url, healthy: true });
  }
}
try {
  mkdirSync(output, { recursive: true });
  if (command === 'monitor') await monitor();
  else if (command === 'trust') {
    const result = await trusted(env.RELEASE_SHA, env.QUALITY_RUN_ID); writeJson(resolve(output, 'trust.json'), result); await approval();
  } else {
    const config = selected();
    if (command === 'preflight') { checkSecrets(config); await approval(); await trusted(env.RELEASE_SHA, env.QUALITY_RUN_ID); step('preflight', { safe: true }); }
    else if (command === 'build') await build(config);
    else if (command === 'deploy') await deploy(config);
    else if (command === 'rollback') await rollback(config);
    else throw new Error('Expected preflight, trust, build, deploy, rollback, monitor');
  }
  if (report.status !== 'skipped') report.status = 'success';
} catch (error) {
  report.error = redactError(error.message, env); process.exitCode = 1; console.error(report.error);
} finally {
  report.finishedAt = new Date().toISOString(); writeJson(resolve(output, 'report.json'), report);
  // Raw captures, proof and generated SQL may contain schema-sensitive information. Only explicit reports/checkpoint/release manifests become workflow artifacts.
  rmSync(resolve(output, 'db'), { recursive: true, force: true });
}
