import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'acorn';
import { workerConfig, writeJson, treeHashes, run, buildEnv } from './core.mjs';

export function assertWorkerModules(directory) {
  const hashes = treeHashes(directory);
  if (!existsSync(resolve(directory, 'index.js'))) throw new Error('Worker bundle is missing index.js');
  for (const file of Object.keys(hashes)) if (/\.(?:js|mjs)$/.test(file)) {
    const source = readFileSync(resolve(directory, file), 'utf8');
    try { parse(source, { ecmaVersion: 'latest', sourceType: 'module' }); }
    catch { throw new Error(`Worker artifact is not valid JavaScript: ${file}`); }
  }
  const entry = parse(readFileSync(resolve(directory, 'index.js'), 'utf8'), { ecmaVersion: 'latest', sourceType: 'module' });
  const exports = entry.body.flatMap(node => node.type === 'ExportNamedDeclaration' ? [...node.specifiers.map(specifier => specifier.exported.name), ...(node.declaration?.id ? [node.declaration.id.name] : [])] : []);
  if (!(exports.includes('default') || entry.body.some(node => node.type === 'ExportDefaultDeclaration')) || !exports.includes('StoreRealtime')) throw new Error('Worker bundle must preserve default handler and StoreRealtime Durable Object export');
  return hashes;
}
function dryrun(root, args, env) {
  return run('npm', ['exec', '--no', '--', 'wrangler', 'deploy', ...args, '--dry-run'], { cwd: root, env: { ...env, WRANGLER_SEND_METRICS: 'false', CI: 'true' } });
}
export function validateWorkerArtifact({ root, config, directory, work, releaseId }) {
  assertWorkerModules(directory);
  mkdirSync(work, { recursive: true });
  const configFile = resolve(work, 'artifact-worker.json');
  const generated = workerConfig(config, root, resolve(directory, 'index.js'));
  if (releaseId) generated.vars.RELEASE_ID = releaseId;
  writeJson(configFile, generated);
  const emptyEnv = resolve(work, 'empty.env'); writeFileSync(emptyEnv, '');
  // Real upload assembly in dry-run mode: no credentials or cloud writes, all extra modules included.
  dryrun(root, ['--config', configFile, '--no-bundle', '--outdir', resolve(work, 'redeploy-check'), '--env-file', emptyEnv], buildEnv(config));
  return configFile;
}
export function buildWorkerArtifact({ root, config, directory, work }) {
  mkdirSync(directory, { recursive: true }); mkdirSync(work, { recursive: true });
  const sourceConfig = resolve(work, 'source-worker.json'); writeJson(sourceConfig, workerConfig(config, root));
  const emptyEnv = resolve(work, 'empty.env'); writeFileSync(emptyEnv, '');
  // --outfile is Wrangler's serialized multipart upload body, NOT executable JavaScript.
  // --outdir emits the real entrypoint and companion modules, which remain immutable together.
  dryrun(root, ['--config', sourceConfig, '--outdir', directory, '--env-file', emptyEnv], buildEnv(config));
  const configFile = validateWorkerArtifact({ root, config, directory, work: resolve(work, 'validate') });
  return { entrypoint: resolve(directory, 'index.js'), configFile, hashes: assertWorkerModules(directory) };
}
