import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const text = name => readFileSync(resolve(root, '.github/workflows', name), 'utf8');

test('all external Actions are official full verified commit pins and Node version exact', () => {
  const verified = new Set(['d23441a48e516b6c34aea4fa41551a30e30af803', '249970729cb0ef3589644e2896645e5dc5ba9c38', 'ea165f8d65b6e75b540449e92b4886f43607fa02', '634f93cb2916e3fdff6788551b99b062d0335ce0', 'ed597411d8f924073f98dfc5c65a23a2325f34cd']);
  for (const file of readdirSync(resolve(root, '.github/workflows'))) {
    const workflow = text(file);
    for (const match of workflow.matchAll(/uses:\s+(\S+)/g)) {
      assert.match(match[1], /^actions\/[a-z-]+@[a-f0-9]{40}$/);
      assert.ok(verified.has(match[1].split('@')[1]));
    }
    assert.match(workflow, /node-version: '24\.22\.3'/);
    assert.doesNotMatch(workflow, /pull_request_target|contents: write|id-token: write/);
    assert.match(workflow, /persist-credentials: false/);
  }
});

test('quality CI has no deployment secrets and contains all measured gates', () => {
  const quality = text('quality.yml');
  assert.doesNotMatch(quality, /secrets\.|CLOUDFLARE_API_TOKEN|wrangler.*(?:deploy|rollback)(?!.*dry)/);
  for (const gate of ['npm ci','typecheck:worker','typecheck:tooling','test:coverage','test:release','db:check','db:test','lint:gate','security:audit','build:ci','check:css','build:worker','test:e2e']) assert.ok(quality.includes(gate), `missing ${gate}`);
  assert.match(quality, /if: always\(\)/);
});

test('production manual protected job promotes previously-built artifact, never rebuilds', () => {
  const release = text('release.yml');
  assert.match(release, /workflow_dispatch:/);
  assert.match(release, /head_branch !== repo\.default_branch/);
  assert.match(release, /quality\.event !== 'push'/);
  assert.match(release, /environment: production/);
  assert.match(release, /prevent_self_review !== true/);
  assert.match(release, /can_admins_bypass !== false/);
  const production = release.slice(release.lastIndexOf('\n  production:\n'));
  assert.doesNotMatch(production, /npm run build|cli\.mjs build/);
  assert.match(production, /run-id: \$\{\{ needs.source.outputs.stage_run_id \}\}/);
  assert.match(production, /DB_ADOPTION_PROOF_JSON/);
});

test('rollback is independent, manual, reviewed, locked against releases and no SQL', () => {
  const rollback = text('rollback.yml');
  assert.match(rollback, /workflow_dispatch:/);
  assert.match(rollback, /group: release-\$\{\{ inputs.environment \}\}/);
  assert.match(rollback, /environment: \$\{\{ inputs.environment \}\}/);
  assert.match(rollback, /code-only-no-sql/);
  assert.doesNotMatch(rollback, /d1.*restore|migrations.*apply|workflow_run:/);
  const cli = readFileSync(resolve(root, 'scripts/release/cli.mjs'), 'utf8');
  assert.match(cli, /no \?force=true/);
  assert.doesNotMatch(cli, /wrangler\(\['rollback'/);
});

test('monitor is opt-in, read-only and has no webhook or cloud secrets', () => {
  const monitor = text('monitor.yml');
  assert.match(monitor, /if: vars.MONITORING_ENABLED == 'true'/);
  assert.doesNotMatch(monitor.replace(/^\s*#.*$/gm, ''), /secrets\.|webhook|cli\.mjs deploy/);
  assert.match(monitor, /run: npm ci/);
});
