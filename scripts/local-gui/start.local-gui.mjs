#!/usr/bin/env node
/** One process owns Vite and the isolated Miniflare fixture; never reads deployment env. */
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { createServer, preview } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { seedFixtures } from './fixtures.local-gui.mjs';

const harness = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(harness, '../..');
const production = process.argv.includes('--production');
function port(name, fallback) {
  const value = Number(process.env[name] || fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`Invalid ${name}`);
  return value;
}
const appPort = port('LOCAL_GUI_APP_PORT', production ? 5192 : 5190);
const apiPort = port('LOCAL_GUI_API_PORT', production ? 8792 : 8790);
if (appPort === apiPort) throw new Error('App and Worker need different ports');
const api = `http://127.0.0.1:${apiPort}`;
let mf;
let vite;
let child;
let stopping = false;
let serverReady = false;
let shutdownPromise;
async function shutdown() {
  stopping = true;
  return shutdownPromise ??= (async () => {
    child?.kill('SIGTERM');
    // Closing one resource must never prevent disposal of the others.
    const results = await Promise.allSettled([typeof vite?.close === 'function' ? vite.close() : vite?.httpServer ? new Promise((done) => {
      vite.httpServer.close(done);
      vite.httpServer.closeAllConnections?.();
    }) : undefined, mf?.dispose()]);
    for (const result of results) if (result.status === 'rejected') console.error(result.reason);
  })();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  const timer = setTimeout(() => process.exit(1), 8000);
  timer.unref();
  void shutdown().finally(() => process.exit(0));
});
process.once('uncaughtException', error => { console.error(error); void shutdown().finally(() => process.exit(1)); });
process.once('unhandledRejection', error => { console.error(error); void shutdown().finally(() => process.exit(1)); });
function runBuild() {
  return new Promise((done, fail) => {
    child = spawn(process.execPath, [resolve(root, 'scripts/build-ci.mjs'), '--out', process.env.CI_BUILD_OUT_DIR || 'dist-ci', '--api', api, '--mode', 'test'], {
      cwd: root, stdio: 'inherit', env: { ...process.env, CI: 'true', VITE_API_URL: api,
        VITE_R2_PUBLIC_URL: `${api}/local-gui-r2` },
    });
    const timer = setTimeout(() => { child?.kill('SIGTERM'); fail(new Error('Production build exceeded 120 seconds')); }, 120000);
    child.once('error', error => { clearTimeout(timer); fail(error); });
    child.once('exit', code => { clearTimeout(timer); child = undefined; code === 0 ? done() : fail(new Error(`Production build exited ${code}`)); });
  });
}
try {
  const bundle = await build({
    entryPoints: [resolve(harness, 'worker-entry.local-gui.ts')],
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022',
    // Production smoke uses the real Firebase verifier. Public store reads need no auth.
    plugins: production ? [] : [{ name: 'local-gui-only-worker-auth-alias', setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)utils\/auth$/ }, args => {
        if (args.importer.includes('/workers/api/')) return { path: resolve(harness, 'worker-auth.local-gui.ts') };
      });
    } }],
  });
  mf = new Miniflare({
    modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2025-12-23',
    host: '127.0.0.1', port: apiPort,
    d1Databases: { DB: 'local-gui-isolated-db' }, d1Persist: false,
    r2Buckets: { R2_BUCKET: 'local-gui-isolated-images', STORE_IMAGES: 'local-gui-isolated-images' }, r2Persist: false,
    durableObjects: { STORE_REALTIME: { className: 'StoreRealtime', useSQLite: true } }, durableObjectsPersist: false,
    bindings: { FIREBASE_PROJECT_ID: 'store-local-gui-fake', R2_PUBLIC_URL: `${api}/local-gui-r2` },
    serviceBindings: {
      LOCAL_GUI_RESET: async () => { await seedFixtures(mf, root, api); return Response.json({ reset: true }); },
      LOCAL_GUI_READY: () => Response.json({ isolated: true, ready: serverReady }, { status: serverReady ? 200 : 503 }),
    },
    outboundService: () => new Response('Isolated harness blocks outbound Worker requests', { status: 403 }),
  });
  await Promise.race([mf.ready, new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('Miniflare startup exceeded 30 seconds')), 30000); timer.unref();
  })]);
  await seedFixtures(mf, root, api);
  if (stopping) throw new Error('Stopped during initialization');
  if (production) {
    await runBuild();
    vite = await preview({ root, configFile: false, envDir: false, build: { outDir: process.env.CI_BUILD_OUT_DIR || 'dist-ci' },
      preview: { host: '127.0.0.1', port: appPort, strictPort: true } });
  } else {
    vite = await createServer({ configFile: resolve(root, 'vite.gui.config.ts'), mode: 'local-gui',
      server: { host: '127.0.0.1', port: appPort, strictPort: true },
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(api), 'import.meta.env.VITE_R2_PUBLIC_URL': JSON.stringify(`${api}/local-gui-r2`) } });
    await vite.listen();
  }
  serverReady = true;
  console.log(JSON.stringify({ isolated: true, production, app: `http://127.0.0.1:${appPort}`,
    store: `http://127.0.0.1:${appPort}/store/local-gui-shop`, api, ready: `${api}/local-gui/ready` }));
} catch (error) {
  console.error(error);
  await shutdown();
  process.exitCode = 1;
}
