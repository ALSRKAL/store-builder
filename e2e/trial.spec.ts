import { test, expect, login, tab, noOverflow } from './fixtures';

test('fresh trial setup persists through logout and relogin without a second grant', async ({ page, guard, request, apiURL }, info) => {
  // SlugService intentionally probes a nonexistent new slug, receiving one real 404.
  guard.knownErrors.push(/^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/, new RegExp(`^404 ${apiURL}/api/public/store/mtjr-tjrbh-${info.project.name}$`));
  const email = `fresh-${info.project.name}@example.test`;
  await login(page, email);
  await expect(page.getByRole('button', { name: 'ابدأ فترة تجريبية مجانية (7 أيام)' })).toBeVisible();
  await page.getByRole('button', { name: 'ابدأ فترة تجريبية مجانية (7 أيام)' }).click();
  await expect(page.getByRole('heading', { name: 'إعداد المتجر' })).toBeVisible();
  await page.getByLabel('اسم المتجر', { exact: true }).fill(`متجر تجربة ${info.project.name}`);
  await page.getByLabel('رقم الواتساب', { exact: true }).fill('777123456');
  await page.getByRole('button', { name: 'إنشاء المتجر' }).click();
  await expect(page).toHaveURL(/dashboard/);
  const skip = page.getByRole('button', { name: 'تخطي', exact: true });
  await skip.click();
  await expect(page.getByRole('dialog', { name: 'جولة تعريفية' })).toHaveCount(0);
  const before = await (await request.get(`${apiURL}/local-gui/snapshot`)).json();
  const profile = before.admins.find((row: { email: string }) => row.email === email);
  expect(profile.trial_used).toBe(1);
  expect(profile.store_id).toBeTruthy();
  await tab(page, 'الإعدادات');
  await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await login(page, email);
  await expect(page).toHaveURL(/dashboard/);
  expect(await page.getByRole('button', { name: /ابدأ فترة تجريبية/ }).count()).toBe(0);
  const after = await (await request.get(`${apiURL}/local-gui/snapshot`)).json();
  expect(after.admins.find((row: { email: string }) => row.email === email).subscription_end).toBe(profile.subscription_end);
  expect(after.trial_ledger.filter((row: { identity_value: string }) => row.identity_value === email)).toHaveLength(1);
  await noOverflow(page);
});

for (const email of ['expired@example.test', 'used@example.test']) {
  test(`expired/consumed ${email} cannot restart trial even after logout and relogin`, async ({ page, request, apiURL }) => {
    await login(page, email);
    await expect(page.getByRole('heading', { name: 'تفعيل الاشتراك' })).toBeVisible();
    const trial = page.getByRole('button', { name: /ابدأ فترة تجريبية/ });
    await expect(trial).toHaveCount(0);
    await expect(page.getByText('لقد استخدمت الفترة التجريبية من قبل', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await login(page, email);
    await expect(page.getByRole('heading', { name: 'تفعيل الاشتراك' })).toBeVisible();
    await expect(trial).toHaveCount(0);
    const state = await (await request.get(`${apiURL}/local-gui/snapshot`)).json();
    const matching = state.admins.find((row: { email: string }) => row.email === email);
    if (matching) expect(new Date(matching.subscription_end).getTime()).toBeLessThan(Date.now());
    expect(state.trial_ledger.filter((row: { identity_value: string }) => row.identity_value === email)).toHaveLength(1);
    await noOverflow(page);
  });
}
