#!/usr/bin/env node
import { ESLint } from 'eslint';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles(['.']);
const actual = {};
let errors = 0;
for (const result of results) for (const message of result.messages) {
  if (message.severity === 2) {
    errors++;
    console.error(`${relative(root, result.filePath)}:${message.line}: ${message.message} [${message.ruleId}]`);
  } else {
    const key = `${relative(root, result.filePath)}:${message.ruleId}`;
    actual[key] = (actual[key] || 0) + 1;
  }
}
const output = resolve(root, 'artifacts/lint');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'eslint.json'), JSON.stringify(results, null, 2));
const baselineFile = resolve(root, 'scripts/lint-baseline.json');
if (process.argv.includes('--record')) {
  if (process.env.CI) throw new Error('CI cannot regenerate the lint debt baseline');
  if (errors) throw new Error('Fix lint errors before recording warnings');
  await writeFile(baselineFile, JSON.stringify({ description: 'Explicit existing warning counts by file/rule. New warnings fail CI; lower these counts as debt is fixed.', warnings: actual }, null, 2) + '\n');
  console.log(`Recorded ${Object.values(actual).reduce((sum, count) => sum + count, 0)} existing warnings`);
} else {
  const baseline = JSON.parse(await readFile(baselineFile, 'utf8'));
  if (!baseline.warnings || typeof baseline.warnings !== 'object') throw new Error('Invalid lint baseline');
  let newWarnings = 0;
  for (const [key, count] of Object.entries(actual)) if (count > (baseline.warnings[key] || 0)) {
    newWarnings += count - (baseline.warnings[key] || 0);
    console.error(`New lint debt: ${key} (${count} > ${baseline.warnings[key] || 0})`);
  }
  if (errors || newWarnings) process.exitCode = 1;
  else console.log(`Lint debt gate passed (0 errors, 0 new warnings, ${Object.values(actual).reduce((sum, count) => sum + count, 0)} existing warnings)`);
}
