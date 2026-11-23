#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = fileURLToPath(new URL('..', import.meta.url));
const directory = resolve(root, process.argv[2] || 'dist-ci');
const entries = await readdir(resolve(directory, 'assets'));
const styles = entries.filter(name => name.endsWith('.css'));
if (!styles.length) throw new Error('No compiled stylesheets found');
const selectors = new Set();
for (const name of styles) {
  const document = postcss.parse(await readFile(resolve(directory, 'assets', name), 'utf8'));
  document.walkRules(rule => rule.selectors?.forEach(selector => selectors.add(selector)));
}
for (const selector of ['.flex', '.grid', '.bg-card', '.text-foreground', '.p-4', '.lg\\:hidden', '.text-danger']) {
  if (!selectors.has(selector)) throw new Error(`Compiled CSS is missing ${selector}`);
}
const forbidden = ['/scripts/local-gui/', 'LOCAL_GUI_ONLY', 'local-gui-not-a-real-signature'];
for (const name of entries.filter(file => file.endsWith('.js'))) {
  const source = await readFile(resolve(directory, 'assets', name), 'utf8');
  for (const marker of forbidden) if (source.includes(marker)) throw new Error(`Test-only marker ${marker} leaked into production asset ${name}`);
}
const html = await readFile(resolve(directory, 'index.html'), 'utf8');
if (!html.includes('/assets/')) throw new Error('Production index does not reference built assets');
console.log(`Compiled CSS and production isolation passed (${styles.length} stylesheets, ${selectors.size} selectors)`);
