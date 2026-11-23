import { test, expect, noOverflow } from './fixtures';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('actual root production build loads public store lazy modules and compiled utility geometry without GUI aliases', async ({ page, request, apiURL }, info) => {
  const root = resolve(import.meta.dirname, '..', process.env.CI_BUILD_OUT_DIR || 'dist-ci');
  const assets = await readdir(resolve(root, 'assets'));
  const scripts = assets.filter(name => name.endsWith('.js'));
  expect(scripts.some(name => /^Store-/.test(name))).toBeTruthy();
  expect(scripts.some(name => /^SettingsTab-/.test(name))).toBeTruthy();
  expect(scripts.some(name => /^Dashboard-/.test(name))).toBeTruthy();
  for (const name of scripts) expect(await readFile(resolve(root, 'assets', name), 'utf8')).not.toMatch(/LOCAL GUI|local-gui\.identity|firebase-auth\.local-gui|bootstrap\.local-gui|local-gui-only-worker-auth-alias/);
  const loaded: string[] = [];
  page.on('response', response => { if (new URL(response.url()).pathname.endsWith('.js')) loaded.push(response.url()); });
  await page.goto('/store/local-gui-shop');
  await expect(page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ })).toBeVisible();
  await page.getByRole('button', { name: /موقعنا/ }).click();
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await page.getByRole('button', { name: /موقعنا/ }).click();
  expect(loaded.some(url => /Store-[^/]+\.js/.test(url))).toBeTruthy();
  expect(loaded.some(url => /Dashboard-[^/]+\.js/.test(url))).toBeFalsy();
  const grid = page.locator('main .grid').filter({ has: page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ }) }).last();
  await expect.poll(() => grid.evaluate(el => getComputedStyle(el).display)).toBe('grid');
  const box = await page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ }).boundingBox();
  expect(box!.width).toBeGreaterThan(140);
  expect(box!.width).toBeLessThan(info.project.name.endsWith('desktop') ? 500 : 300);
  await noOverflow(page);
  await page.getByRole('button', { name: 'أضف منتج تجريبي أول إلى السلة' }).click();
  await page.getByRole('button', { name: /السلة، 1 عنصر/ }).click();
  await page.getByRole('button', { name: 'إتمام الطلب', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'اختيار طريقة الدفع' })).toBeVisible();
  expect(loaded.some(url => /Store-[^/]+\.js/.test(url))).toBeTruthy();
  expect(loaded.some(url => /SettingsTab-[^/]+\.js/.test(url))).toBeFalsy();
  // Fake local token must not be accepted by the production Worker verifier.
  expect((await request.get(`${apiURL}/api/admin/profile`, { headers: { Authorization: 'Bearer invalid' } })).status()).toBe(401);
  expect(await page.evaluate(() => localStorage.getItem('store-app.local-gui.identity.v1'))).toBeNull();
});
