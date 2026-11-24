import { defineConfig, devices } from '@playwright/test';
const appPort = process.env.LOCAL_GUI_APP_PORT || '5192';
const apiPort = process.env.LOCAL_GUI_API_PORT || '8792';
const browserChannel = process.env.CI ? 'chrome' : undefined;
export default defineConfig({
  testDir: './e2e', testMatch: '**/*.production.spec.ts', workers: 1, retries: 0,
  forbidOnly: Boolean(process.env.CI), timeout: 45_000, expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/production' }]] : 'list',
  outputDir: 'test-results/production',
  use: { baseURL: `http://127.0.0.1:${appPort}`, serviceWorkers: 'block',
    ...(browserChannel ? { channel: browserChannel } : {}),
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'production-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'production-mobile', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
  webServer: { command: 'node scripts/local-gui/start.local-gui.mjs --production',
    env: { LOCAL_GUI_APP_PORT: appPort, LOCAL_GUI_API_PORT: apiPort },
    url: `http://127.0.0.1:${apiPort}/local-gui/ready`, timeout: 180_000, reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 } },
});
