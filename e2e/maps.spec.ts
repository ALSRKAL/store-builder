import { test, expect, login, settings, noOverflow } from './fixtures';

test('pinned local Leaflet renders public map and fake GPS picker saves bounded coordinates', async ({ page, request, apiURL }) => {
  await page.goto('/store/local-gui-shop');
  await page.getByRole('button', { name: /موقعنا/ }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await expect(page.getByText('جاري تحميل الخريطة…')).toHaveCount(0);
  expect(await page.evaluate(() => (window.L as typeof window.L & { version: string })?.version)).toBe('1.9.4');
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await settings(page, 'موقع المتجر');
  await page.getByRole('button', { name: 'تعديل الموقع' }).click();
  const dialog = page.getByRole('dialog', { name: 'تحديد موقع المتجر' });
  await expect(dialog.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'تحديد موقعي الحالي' }).click();
  await expect(dialog.getByLabel('خط العرض', { exact: true })).toHaveValue('15.3694');
  await expect(dialog.getByLabel('خط الطول', { exact: true })).toHaveValue('44.191');
  await dialog.getByLabel('خط العرض', { exact: true }).fill('91');
  await dialog.getByRole('button', { name: 'حفظ الموقع' }).click();
  await expect(dialog.getByRole('alert')).toContainText('خط العرض بين -90 و90');
  await dialog.getByLabel('خط العرض', { exact: true }).fill('15.3694');
  await dialog.getByLabel('العنوان (اختياري)', { exact: true }).fill('عنوان GPS خيالي محفوظ');
  await dialog.getByRole('button', { name: 'حفظ الموقع' }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await (await request.get(`${apiURL}/api/public/store/local-gui-shop`)).json()).location.address).toBe('عنوان GPS خيالي محفوظ');
  await noOverflow(page);
});

test('explicit Leaflet load failure removes spinner and preserves manual location fallback', async ({ page, guard }) => {
  guard.mapFailure = true;
  // Exactly the deliberately failed script resource; all other errors remain failures.
  guard.knownErrors.push(/^Failed to load resource: the server responded with a status of 503/, /^503 https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js$/);
  await page.goto('/store/local-gui-shop');
  await page.getByRole('button', { name: /موقعنا/ }).click();
  await expect(page.getByText('تعذّر تحميل الخريطة. استخدم الاتجاهات أو افتح الموقع في الخرائط أدناه.')).toBeVisible();
  await expect(page.getByText('جاري تحميل الخريطة…')).toHaveCount(0);
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await settings(page, 'موقع المتجر');
  await page.getByRole('button', { name: 'تعديل الموقع' }).click();
  const dialog = page.getByRole('dialog', { name: 'تحديد موقع المتجر' });
  await expect(dialog.getByText('تعذّر تحميل الخريطة. يمكنك إدخال الموقع يدوياً أدناه.')).toBeVisible();
  await dialog.getByLabel('رابط الخريطة أو الإحداثيات').fill('15.5,44.2');
  await dialog.getByRole('button', { name: 'استخدام الموقع' }).click();
  await expect(dialog.getByLabel('خط العرض', { exact: true })).toHaveValue('15.5');
  await expect(dialog.getByLabel('خط الطول', { exact: true })).toHaveValue('44.2');
  await noOverflow(page);
});
