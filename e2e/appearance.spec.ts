import { test, expect, login, noOverflow, settings, tab, snapshot } from './fixtures';

test('responsive real App utility CSS and desktop/mobile navigation geometry', async ({ page, request, apiURL }, info) => {
  const state = await snapshot(request, apiURL);
  expect(state.admins.find((row: { email: string }) => row.email === 'owner@example.test').created_at).toBe('2020-01-01T00:00:00.000Z');
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('dialog', { name: 'جولة تعريفية' })).toHaveCount(0);
  const main = page.locator('main');
  await expect(main).toBeVisible();
  await expect.poll(() => main.evaluate(el => getComputedStyle(el).paddingLeft)).toBe(info.project.name === 'desktop' ? '24px' : '16px');
  await expect.poll(() => main.evaluate(el => getComputedStyle(el).maxWidth)).toBe('1152px');
  const nav = page.getByRole(info.project.name === 'desktop' ? 'complementary' : 'navigation', { name: 'تنقل لوحة التحكم' }).filter({ visible: true });
  await expect(nav).toHaveCount(1);
  const navBox = await nav.boundingBox();
  expect(navBox).not.toBeNull();
  if (info.project.name === 'desktop') expect(navBox!.width).toBeGreaterThan(200);
  else expect(navBox!.y + navBox!.height).toBeCloseTo(page.viewportSize()!.height, 0);
  await noOverflow(page);
  if (info.project.name === 'mobile') {
    await settings(page, 'معلومات المتجر');
    await expect(page.getByRole('heading', { name: 'المتجر والهوية' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'الطلبات والدفع' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'الحساب والتطبيق' })).toBeVisible();
    const copyButton = page.getByRole('button', { name: 'نسخ الرابط', exact: true }).filter({ visible: true });
    const openLink = page.getByRole('link', { name: 'فتح المتجر', exact: true }).filter({ visible: true });
    const brandButton = page.getByRole('button', { name: 'الانتقال إلى المنتجات', exact: true }).filter({ visible: true });
    for (const control of [copyButton, openLink, brandButton]) {
      await expect(control).toBeVisible();
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: 'تعديل اسم المتجر' }).click();
    await noOverflow(page);
    await page.getByRole('button', { name: 'إلغاء تعديل الاسم' }).click();
  }
  await page.goto('/store/local-gui-shop');
  await expect(page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ })).toBeVisible();
  if (info.project.name === 'mobile') {
    const mobileAdd = page.getByRole('button', { name: 'أضف منتج تجريبي أول إلى السلة', exact: true }).filter({ visible: true }).first();
    await expect(mobileAdd).toBeVisible();
    expect((await mobileAdd.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    for (const name of [/فتح البحث/, /فتح التصنيفات/, /السلة،/]) {
      const control = page.getByRole('button', { name }).filter({ visible: true }).first();
      await expect(control).toBeVisible();
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ }).first().click();
    for (const name of ['أضف للسلة', 'اطلب الآن']) {
      const control = page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
      await expect(control).toBeVisible();
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.keyboard.press('Escape');
  }
  const grid = page.locator('main .grid').filter({ has: page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ }) }).last();
  await expect.poll(() => grid.evaluate(el => getComputedStyle(el).display)).toBe('grid');
  const card = page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ });
  expect((await card.boundingBox())!.width).toBeGreaterThan(140);
  await noOverflow(page);
});

test('admin theme and settings persist to separate unauthenticated storefront context', async ({ page, customer, request, apiURL }) => {
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await customer.page.goto('/store/local-gui-shop');
  await expect(customer.page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ })).toBeVisible();
  await tab(page, 'المظهر');
  await page.getByRole('button', { name: 'إعادة تعيين', exact: true }).click();
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await expect.poll(async () => {
    const data = await (await request.get(`${apiURL}/local-gui/snapshot`)).json();
    return JSON.parse(data.stores[0].theme).primary;
  }).not.toBe('#385a4f');
  await settings(page, 'معلومات المتجر');
  await page.getByRole('button', { name: 'تعديل رقم الواتساب' }).click();
  await page.getByLabel('رقم الواتساب', { exact: true }).fill('0501111111');
  await page.getByRole('button', { name: 'حفظ رقم الواتساب' }).click();
  await expect.poll(async () => (await (await request.get(`${apiURL}/api/public/store/local-gui-shop`)).json()).whatsapp).toContain('0501111111');
  await customer.page.reload();
  await expect(customer.page.getByRole('button', { name: /عرض تفاصيل منتج تجريبي أول/ })).toBeVisible();
  const theme = await (await request.get(`${apiURL}/api/public/store/local-gui-shop`)).json();
  expect(theme.theme.primary).not.toBe('#385a4f');
  await expect.poll(() => customer.page.getByRole('button', { name: 'أضف منتج تجريبي أول إلى السلة' }).evaluate(el => getComputedStyle(el).getPropertyValue('--store-primary').trim())).toBe(theme.theme.primary);
  expect(await customer.page.evaluate(() => localStorage.getItem('store-app.local-gui.identity.v1'))).toBeNull();
  await noOverflow(page);
  await noOverflow(customer.page);
});

test('announcement max length, real edge-to-edge motion, dismissal/new identity and reduced motion', async ({ page, customer }) => {
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await settings(page, 'الشريط الإعلاني');
  const message = 'إعلان محلي طويل ١٢٣ ABC '.repeat(10);
  await page.getByLabel('نص الإعلان').fill(message);
  await expect(page.getByLabel('نص الإعلان')).toHaveValue(message.slice(0, 150));
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await customer.page.goto('/store/local-gui-shop');
  const bar = customer.page.getByRole('region', { name: 'إعلان المتجر', exact: true });
  await expect(bar).toBeVisible();
  const track = bar.locator('.announcement-track');
  await expect(track).toHaveAttribute('data-ready', 'true');
  // Read animation geometry; do not pause/seek/rewrite the animation to force a pass.
  const geometry = await track.evaluate(el => {
    const style = getComputedStyle(el);
    const viewport = el.parentElement!;
    const animation = el.getAnimations()[0];
    return { start: parseFloat(style.getPropertyValue('--announcement-start')),
      end: parseFloat(style.getPropertyValue('--announcement-end')),
      duration: parseFloat(style.animationDuration), viewport: viewport.clientWidth, text: el.scrollWidth,
      frames: animation ? (animation.effect as KeyframeEffect).getKeyframes().map(frame => frame.transform) : [] };
  });
  expect(geometry.start).toBeCloseTo(geometry.viewport + 2, 0);
  expect(geometry.end).toBeCloseTo(-geometry.text - 2, 0);
  expect(geometry.duration).toBeCloseTo((geometry.start - geometry.end) / 55, 1);
  expect(geometry.frames).toHaveLength(2);
  expect(geometry.frames[0]).toContain(String(geometry.start));
  expect(geometry.frames[1]).toContain(String(geometry.end));
  await customer.page.getByRole('button', { name: 'إغلاق الشريط الإعلاني' }).click();
  await expect(bar).toHaveCount(0);
  await page.getByLabel('نص الإعلان').fill('إعلان جديد بعد الإغلاق');
  await page.getByRole('button', { name: 'حفظ التغييرات', exact: true }).click();
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('إعلان جديد بعد الإغلاق');
  await customer.page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => track.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect.poll(() => track.evaluate(el => getComputedStyle(el).whiteSpace)).toBe('normal');
  await noOverflow(customer.page);
});
