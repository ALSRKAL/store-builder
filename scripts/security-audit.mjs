#!/usr/bin/env node
/** Fail releases on unreviewed high/critical dependency findings or a failed audit service. */
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function assessAudit(report, exceptions = [], now = Date.now()) {
  if (report?.error || report?.auditReportVersion !== 2 || !report?.vulnerabilities || !report?.metadata?.vulnerabilities) {
    throw new Error('Dependency audit report is unavailable or malformed');
  }
  for (const exception of exceptions) {
    if (!exception.package || !exception.advisory || !exception.reason || !exception.expires || Date.parse(exception.expires) <= now) {
      throw new Error('Audit exceptions must have a package, advisory, reason and future expiry');
    }
  }
  const blocked = [];
  for (const [name, value] of Object.entries(report.vulnerabilities)) {
    if (!['high', 'critical'].includes(value.severity)) continue;
    const advisories = value.via.filter(item => typeof item === 'object');
    const permitted = advisories.length > 0 && advisories.every(item => exceptions.some(exception =>
      exception.package === name && exception.advisory === item.url && Date.parse(exception.expires) > now));
    if (!permitted) blocked.push({ package: name, severity: value.severity });
  }
  return blocked;
}

async function main() {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const output = resolve(root, 'artifacts/security');
  await mkdir(output, { recursive: true });
  let exceptions = [];
  try { exceptions = JSON.parse(await readFile(resolve(root, 'scripts/audit-exceptions.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const result = spawnSync(process.execPath, [process.env.npm_execpath || resolve(process.execPath, '../../lib/node_modules/npm/bin/npm-cli.js'), 'audit', '--json'], {
    cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 10 * 1024 * 1024,
  });
  await writeFile(resolve(output, 'npm-audit.json'), result.stdout || '{}');
  if (result.error || result.signal || ![0, 1].includes(result.status)) throw new Error('npm audit did not complete successfully');
  const blocked = assessAudit(JSON.parse(result.stdout), exceptions);
  await writeFile(resolve(output, 'summary.json'), JSON.stringify({ blocked, checkedAt: new Date().toISOString() }, null, 2));
  if (blocked.length) {
    console.error(`Release blocked by ${blocked.length} high/critical dependency findings:`);
    for (const item of blocked) console.error(`- ${item.package}: ${item.severity}`);
    process.exitCode = 1;
  } else console.log('Dependency security gate passed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
