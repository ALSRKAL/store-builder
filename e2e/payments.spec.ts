import { test, expect, login, settings, png, noOverflow } from './fixtures';

async function openPayments(page: Parameters<typeof login>[0]) {
  await login(page);
  await expect(page).toHaveURL(/dashboard/);
  await settings(page, 'طرق الدفع');
  await expect(page.getByRole('button', { name: 'تعديل حساب تجريبي محلي', exact: true })).toBeVisible();
}

test('payment add/edit/reopen keeps dialog draft across async refresh and persists receipt order locally', async ({ page, customer, request, apiURL }) => {
  await openPayments(page);
  await page.getByRole('button', { name: 'إضافة', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'السعودية', exact: true }).click();
  await dialog.getByRole('button', { name: /STC Pay/ }).click();
  await dialog.getByLabel('تسمية مخصصة (اختياري)', { exact: true }).fill('حساب إيصال CI');
  await dialog.getByRole('textbox', { name: 'رقم الجوال', exact: true }).fill('0502222222');
  await dialog.getByRole('switch', { name: 'طلب إيصال الدفع' }).click();
  await dialog.getByLabel('تعليمات للعميل (اختياري)', { exact: true }).fill('إيصال خيالي فقط');
  await dialog.getByRole('button', { name: 'إضافة طريقة الدفع' }).click();
  await expect(dialog).toHaveCount(0);
  let releaseRefresh!: () => void;
  const refreshGate = new Promise<void>(resolve => { releaseRefresh = resolve; });
  let refreshSeen!: () => void;
  const refreshStarted = new Promise<void>(resolve => { refreshSeen = resolve; });
  await page.route(`${apiURL}/api/payments`, async route => {
    const response = await route.fetch();
    refreshSeen();
    await refreshGate;
    await route.fulfill({ response });
  });
  await page.getByRole('button', { name: 'تحديث القائمة', exact: true }).click();
  await refreshStarted;
  await page.getByRole('button', { name: 'تعديل حساب إيصال CI' }).click();
  dialog = page.getByRole('dialog', { name: 'تعديل طريقة الدفع' });
  await expect(dialog.getByRole('textbox', { name: 'رقم الجوال', exact: true })).toHaveValue('0502222222');
  await dialog.getByLabel('تسمية مخصصة (اختياري)', { exact: true }).fill('حساب إيصال معدل');
  await dialog.getByRole('textbox', { name: 'رقم الجوال', exact: true }).fill('0503333333');
  // Release an actual local Worker response after the draft is typed; no fake data/event.
  const refreshed = page.waitForResponse(response => response.url().endsWith('/api/payments') && response.status() === 200);
  releaseRefresh();
  await refreshed;
  await page.unroute(`${apiURL}/api/payments`);
  await expect(dialog.getByRole('textbox', { name: 'رقم الجوال', exact: true })).toHaveValue('0503333333');
  await dialog.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'تعديل حساب إيصال معدل' }).click();
  await expect(dialog.getByRole('textbox', { name: 'رقم الجوال', exact: true })).toHaveValue('0503333333');
  await expect(dialog.getByRole('switch', { name: 'طلب إيصال الدفع' })).toHaveAttribute('aria-checked', 'true');
  await dialog.getByRole('button', { name: 'إلغاء', exact: true }).click();

  const shop = customer.page;
  await shop.goto('/store/local-gui-shop');
  await shop.getByRole('button', { name: 'أضف منتج تجريبي أول إلى السلة' }).click();
  await shop.getByRole('button', { name: /السلة، 1 عنصر/ }).click();
  await shop.getByRole('button', { name: 'إتمام الطلب', exact: true }).click();
  const checkout = shop.getByRole('dialog');
  await checkout.getByRole('button', { name: /حساب إيصال معدل/ }).click();
  await checkout.getByRole('button', { name: 'التالي', exact: true }).click();
  await checkout.getByRole('textbox', { name: 'الاسم الكامل', exact: true }).fill('عميل محلي CI');
  await checkout.getByLabel(/رقم الهاتف/).fill('777123456');
  await checkout.getByLabel(/العنوان/).fill('مدينة خيالية شارع الاختبار');
  await checkout.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(checkout.getByRole('heading', { name: 'رفع إيصال الدفع' })).toBeVisible();
  await checkout.locator('input[type=file]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: png });
  await expect(checkout.getByRole('img', { name: 'إيصال الدفع' })).toBeVisible();
  // Merchant change is pushed by the actual Worker/DO, not a synthetic browser response.
  await page.getByRole('button', { name: 'تعديل حساب إيصال معدل' }).click();
  await dialog.getByRole('textbox', { name: 'رقم الجوال', exact: true }).fill('0504444444');
  await dialog.getByRole('button', { name: 'حفظ التعديلات' }).click();
  await expect(checkout.getByRole('alert')).toContainText('تم تحديث تفاصيل طريقة الدفع');
  await expect(checkout.getByRole('heading', { name: 'رفع إيصال الدفع' })).toBeVisible();
  // Account destination changed: stale receipt is deliberately invalidated, customer draft survives.
  await expect(checkout.getByRole('img', { name: 'إيصال الدفع' })).toHaveCount(0);
  await expect(checkout.getByRole('button', { name: 'إرسال الطلب', exact: true })).toBeDisabled();
  await checkout.getByRole('button', { name: 'رجوع', exact: true }).click();
  await expect(checkout.getByRole('textbox', { name: 'الاسم الكامل', exact: true })).toHaveValue('عميل محلي CI');
  await checkout.getByRole('button', { name: 'التالي', exact: true }).click();
  await checkout.locator('input[type=file]').setInputFiles({ name: 'receipt-updated.png', mimeType: 'image/png', buffer: png });
  await expect(checkout.getByRole('img', { name: 'إيصال الدفع' })).toBeVisible();
  await checkout.getByRole('button', { name: 'إرسال الطلب', exact: true }).click();
  await expect(checkout.getByRole('heading', { name: 'تم إرسال الطلب' })).toBeVisible();
  const state = await (await request.get(`${apiURL}/local-gui/snapshot`)).json();
  expect(state.orders).toHaveLength(1);
  expect(state.orders[0].customer_name).toBe('عميل محلي CI');
  expect(state.orders[0].receipt_image).toBeTruthy();
  expect(state.orders[0].order_number).toBeTruthy();
  expect(state.store_payment_methods.find((method: { label: string }) => method.label === 'حساب إيصال معدل').config_details).toContain('0504444444');
  await noOverflow(shop);
});

test('disabled selected payment never auto-navigates checkout or loses customer draft', async ({ page, customer }) => {
  await openPayments(page);
  const shop = customer.page;
  await shop.goto('/store/local-gui-shop');
  await shop.getByRole('button', { name: 'أضف منتج تجريبي أول إلى السلة' }).click();
  await shop.getByRole('button', { name: /السلة، 1 عنصر/ }).click();
  await shop.getByRole('button', { name: 'إتمام الطلب', exact: true }).click();
  const checkout = shop.getByRole('dialog');
  await checkout.getByRole('button', { name: /حساب تجريبي محلي/ }).click();
  await checkout.getByRole('button', { name: 'التالي', exact: true }).click();
  await checkout.getByRole('textbox', { name: 'الاسم الكامل', exact: true }).fill('مسودة محفوظة');
  await page.getByRole('switch', { name: 'تفعيل حساب تجريبي محلي', exact: true }).click();
  await expect(checkout.getByRole('alert')).toContainText('طريقة الدفع المختارة لم تعد متاحة');
  await expect(checkout.getByRole('heading', { name: 'بيانات التوصيل والمراجعة' })).toBeVisible();
  await expect(checkout.getByRole('textbox', { name: 'الاسم الكامل', exact: true })).toHaveValue('مسودة محفوظة');
  await expect(checkout.getByRole('button', { name: 'إرسال الطلب' })).toBeDisabled();
  await expect(checkout.getByRole('textbox', { name: 'الاسم الكامل', exact: true })).toHaveValue('مسودة محفوظة');
});
