#!/usr/bin/env node
/** Check repository candidates without printing or transmitting secret values. */
import { spawnSync } from 'node:child_process';
import { readFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
if (git.status !== 0) throw new Error('Secret gate requires a Git working tree');
const failures = [];
const ignored = /^(?:node_modules|dist(?:-ci)?|coverage|artifacts|test-results|playwright-report)\//;
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s*(?:\\n)?[A-Za-z0-9+/=]{32,}/,
  /"type"\s*:\s*"service_account"[\s\S]{0,1000}"private_key"\s*:/,
  /(?:ghp|gho|ghs)_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
];
for (const file of new Set(git.stdout.split('\0').filter(Boolean))) {
  if (ignored.test(file)) continue;
  if (/(?:^|\/)(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?)$/.test(file) && !/\.example$/.test(file)) {
    failures.push(`${file}: environment file must not be committed`);
    continue;
  }
  if (/(?:firebase-adminsdk|service-account).*\.json$|\.(?:pem|key)$/.test(file)) {
    failures.push(`${file}: credential filename must not be committed`);
    continue;
  }
  let stat;
  try { stat = await lstat(resolve(root, file)); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
  const data = await readFile(resolve(root, file), 'utf8');
  if (patterns.some(pattern => pattern.test(data))) failures.push(`${file}: potential credential detected (value redacted)`);
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log('Repository credential guard passed');
