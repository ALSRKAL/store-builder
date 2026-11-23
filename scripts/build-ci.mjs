#!/usr/bin/env node
/** Build the real production entry with explicit fictional CI settings, never local env files. */
import { build } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing ${name}`);
  return args[index + 1];
};
const out = resolve(root, option('--out', 'dist-ci'));
if (!out.startsWith(`${root}/`) || out === resolve(root, 'src')) throw new Error('Build output must be a dedicated project subdirectory');
const api = new URL(option('--api', 'http://127.0.0.1:8792'));
if (!['127.0.0.1', 'localhost', '[::1]'].includes(api.hostname) || api.protocol !== 'http:') {
  throw new Error('CI build requires an isolated loopback API');
}
const env = {
  VITE_API_URL: api.origin,
  VITE_R2_PUBLIC_URL: `${api.origin}/local-gui-r2`,
  VITE_FIREBASE_API_KEY: 'ci-public-fictional-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
  VITE_FIREBASE_PROJECT_ID: 'store-ci-isolated',
  VITE_FIREBASE_STORAGE_BUCKET: 'store-ci-isolated',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: 'ci-public-fictional-app',
  VITE_FIREBASE_VAPID_KEY: '',
};
for (const key of Object.keys(process.env)) if (key.startsWith('VITE_')) delete process.env[key];
Object.assign(process.env, env, { STORE_ISOLATED_BUILD: 'true' });
await build({ root, configFile: resolve(root, 'vite.config.js'), mode: option('--mode', 'test'),
  envDir: false, build: { outDir: out, emptyOutDir: true },
});
console.log(JSON.stringify({ build: 'production-entry', api: api.origin, outDir: out, isolated: true }));
