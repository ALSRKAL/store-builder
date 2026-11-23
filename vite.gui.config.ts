/** LOCAL GUI ONLY. Explicit dev config: no env files, production build or remote API. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const harness = resolve(root, 'scripts/local-gui');
const appPort = Number(process.env.LOCAL_GUI_APP_PORT || 5190);
const apiPort = Number(process.env.LOCAL_GUI_API_PORT || 8790);
const fakeEnv = {
  MODE: 'local-gui', DEV: true, PROD: false, BASE_URL: '/', SSR: false,
  VITE_API_URL: `http://127.0.0.1:${apiPort}`,
  VITE_R2_PUBLIC_URL: `http://127.0.0.1:${apiPort}/local-gui-r2`,
  VITE_FIREBASE_API_KEY: 'local-gui-fake-no-secret',
  VITE_FIREBASE_AUTH_DOMAIN: '127.0.0.1',
  VITE_FIREBASE_PROJECT_ID: 'store-local-gui-fake',
  VITE_FIREBASE_STORAGE_BUCKET: 'local-gui-isolated',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
  VITE_FIREBASE_APP_ID: 'local-gui-fictional-app',
  VITE_FIREBASE_VAPID_KEY: '',
};
const csp = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline' https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com", "font-src 'self' data:",
  `img-src 'self' data: blob: http://127.0.0.1:${apiPort} https://*.tile.openstreetmap.org https://images.unsplash.com`,
  `connect-src 'self' http://127.0.0.1:${apiPort} ws://127.0.0.1:${apiPort} ws://127.0.0.1:${appPort} https://unpkg.com`,
  "frame-src 'self' https://www.openstreetmap.org", "worker-src 'self' blob:", "form-action 'self'", "object-src 'none'",
].join('; ');

export default defineConfig(({ command }) => {
  if (command !== 'serve') throw new Error('LOCAL GUI configuration is dev-only; production build forbidden');
  return {
    root, envDir: false,
    css: { postcss: { plugins: [tailwindcss({ config: resolve(root, 'tailwind.config.js') }), autoprefixer()] } },
    cacheDir: resolve(harness, '.vite-cache'),
    define: { 'import.meta.env': JSON.stringify(fakeEnv), ...Object.fromEntries(
      Object.entries(fakeEnv).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])) },
    resolve: { alias: [
      { find: /^(?:.*\/)?config\/firebase(?:\.ts)?$/, replacement: resolve(harness, 'firebase-config.local-gui.ts') },
      { find: /^firebase\/auth$/, replacement: resolve(harness, 'firebase-auth.local-gui.ts') },
    ] },
    plugins: [react(), {
      name: 'local-gui-only-html',
      transformIndexHtml: { order: 'pre', handler(html) {
        return html
          .replace(/<link\b[^>]*href=["']https?:\/\/[^>]*>/g, '')
          .replace('/src/main.tsx', '/scripts/local-gui/bootstrap.local-gui.ts');
      } },
    }],
    server: { host: '127.0.0.1', port: appPort, strictPort: true,
      headers: { 'Content-Security-Policy': csp },
      fs: { allow: [root] } },
  };
});
