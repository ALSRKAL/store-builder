import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
export type Guard = { mapFailure: boolean; knownErrors: RegExp[]; unexpected: string[]; assert: () => void };
async function guardContext(context: BrowserContext, app: string, api: string): Promise<Guard> {
  const state: Guard = { mapFailure: false, knownErrors: [], unexpected: [], assert() { expect(this.unexpected, 'Unexpected browser network/console/page errors').toEqual([]); } };
  const origins = new Set([new URL(app).origin, new URL(api).origin]);
  context.on('page', page => {
    page.on('response', response => {
      if (response.status() >= 400 && !state.knownErrors.some(pattern => pattern.test(`${response.status()} ${response.url()}`))) {
        state.unexpected.push(`response: ${response.status()} ${response.url()}`);
      }
    });
    page.on('pageerror', error => state.unexpected.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error' && !state.knownErrors.some(pattern => pattern.test(message.text()))) state.unexpected.push(`console: ${message.text()}`);
    });
  });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (origins.has(url.origin) || ['data:', 'blob:'].includes(url.protocol)) return route.continue();
    if (url.hostname === 'unpkg.com' && /^\/leaflet@1\.9\.4\/dist\/(leaflet\.(js|css)|images\/[a-z-]+\.png)$/.test(url.pathname)) {
      if (state.mapFailure && url.pathname.endsWith('leaflet.js')) return route.fulfill({ status: 503, contentType: 'application/javascript', body: '', headers: { 'access-control-allow-origin': '*' } });
      const asset = url.pathname.split('/dist/')[1];
      return route.fulfill({ body: await readFile(resolve(root, 'node_modules/leaflet/dist', asset)),
        contentType: asset.endsWith('.js') ? 'application/javascript' : asset.endsWith('.css') ? 'text/css' : 'image/png',
        headers: { 'access-control-allow-origin': '*' } });
    }
    if (/^[abc]\.tile\.openstreetmap\.org$/.test(url.hostname) && /^\/\d+\/\d+\/\d+\.png$/.test(url.pathname)) return route.fulfill({ body: png, contentType: 'image/png' });
    if (url.hostname === 'fonts.googleapis.com' && url.pathname === '/css2') return route.fulfill({ body: '/* offline system-font fixture; no remote font download */', contentType: 'text/css' });
    if (url.hostname === 'images.unsplash.com' && /^\/photo-(1542272604-787c3835535d|1584917865442-de89df76afd3|1441986300917-64674bd600d8|1602810318383-e386cc2a3ccf|1595777457583-95e059d581b8|1542291026-7eec264c27ff|1524592094714-0f0654e20314)$/.test(url.pathname)) return route.fulfill({ body: png, contentType: 'image/png' });
    state.unexpected.push(`external request: ${route.request().method()} ${url.href}`);
    await route.abort('blockedbyclient');
  });
  return state;
}
type Fixtures = { apiURL: string; guard: Guard; customer: { context: BrowserContext; page: Page; guard: Guard } };
export const test = base.extend<Fixtures>({
  apiURL: async ({ baseURL }, use) => {
    const production = new URL(baseURL!).port === (process.env.LOCAL_GUI_APP_PORT || '5192');
    await use(`http://127.0.0.1:${process.env.LOCAL_GUI_API_PORT || (production ? '8792' : '8791')}`);
  },
  guard: [async ({ context, baseURL, apiURL, request }, use) => {
    await expect.poll(async () => (await request.get(`${apiURL}/local-gui/ready`)).status(), { timeout: 15_000 }).toBe(200);
    expect((await request.post(`${apiURL}/local-gui/reset`)).ok()).toBeTruthy();
    const guard = await guardContext(context, baseURL!, apiURL);
    await use(guard);
    guard.assert();
  }, { auto: true }],
  customer: async ({ browser, baseURL, apiURL, guard }, use, testInfo) => {
    void guard;
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const customerGuard = await guardContext(context, baseURL!, apiURL);
    const page = await context.newPage();
    // Playwright starts tracing for browser.newContext as part of test instrumentation.
    try {
      await use({ context, page, guard: customerGuard });
      customerGuard.assert();
    } finally {
      try {
        if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) await page.screenshot({ path: testInfo.outputPath('customer-failed.png'), fullPage: true });
      } finally { await context.close(); }
    }
  },
});
export { expect };
export async function login(page: Page, email = 'owner@example.test') {
  await page.goto('/admin');
  await page.getByLabel('البريد الإلكتروني', { exact: true }).fill(email);
  await page.getByLabel('كلمة المرور', { exact: true }).fill('LocalOnly123!');
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
}
export async function tab(page: Page, name: 'الإعدادات' | 'المظهر') {
  await page.getByRole('link', { name: name === 'المظهر' ? /تخصيص المظهر|المظهر/ : name }).filter({ visible: true }).click();
}
export async function settings(page: Page, section: string) {
  await tab(page, 'الإعدادات');
  const toggle = page.getByRole('button', { name: new RegExp(section) });
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
}
export async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}
export async function snapshot(request: APIRequestContext, api: string) {
  return (await request.get(`${api}/local-gui/snapshot`)).json();
}
