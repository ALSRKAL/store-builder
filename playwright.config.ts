import { defineConfig, devices } from '@playwright/test';
const appPort = process.env.LOCAL_GUI_APP_PORT || '5191';
const apiPort = process.env.LOCAL_GUI_API_PORT || '8791';
// GitHub-hosted runners ship Google Chrome; using it avoids a fragile browser download.
const browserChannel = process.env.CI ? 'chrome' : undefined;
export default defineConfig({
  testDir: './e2e', testIgnore: '**/*.production.spec.ts',
  fullyParallel: false, workers: 1, retries: 0, forbidOnly: Boolean(process.env.CI),
  timeout: 60_000, expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results/browser',
  use: { baseURL: `http://127.0.0.1:${appPort}`, serviceWorkers: 'block',
    ...(browserChannel ? { channel: browserChannel } : {}),
    trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: { command: 'node scripts/local-gui/start.local-gui.mjs',
    env: { LOCAL_GUI_APP_PORT: appPort, LOCAL_GUI_API_PORT: apiPort },
    url: `http://127.0.0.1:${apiPort}/local-gui/ready`, timeout: 90_000, reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 } },
});
