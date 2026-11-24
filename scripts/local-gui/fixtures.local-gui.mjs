import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export const fixturePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64');
function statements(sql) {
  const clean = sql.replace(/--[^\n]*/g, '');
  return clean.match(/\s*CREATE\s+TRIGGER[\s\S]*?END\s*;|[^;]+;/gi)?.map(value => value.trim()).filter(Boolean) ?? [];
}
export async function seedFixtures(mf, root, api) {
  const db = await mf.getD1Database('DB');
  for (const file of ['workers/schema.sql', 'workers/migrations/add_payment_methods.sql',
    'workers/migrations/add_fcm_tokens.sql', 'workers/migrations/add_push_subscriptions.sql',
    'workers/migrations/add_orders_table.sql', 'workers/migrations/add_store_revisions.sql', 'workers/migrations/add_trial_ledger.sql']) {
    for (const statement of statements(await readFile(resolve(root, file), 'utf8'))) {
      try { await db.prepare(statement).run(); }
      catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }); }
    }
  }
  // Local GUI resets rerun this seed on the same in-memory DB; ALTER is not idempotent.
  const storeColumns = await db.prepare("SELECT name FROM pragma_table_info('stores')").all();
  if (!storeColumns.results.some(column => column.name === 'description')) {
    await db.prepare('ALTER TABLE stores ADD COLUMN description TEXT').run();
  }
  // Always deterministic, throwaway DB only; no on-disk D1/R2 or deployment config.
  for (const table of ['orders', 'payment_receipts', 'fcm_tokens', 'push_subscriptions', 'store_payment_methods', 'products', 'categories', 'stores',
    'usage', 'admins', 'trial_ledger', 'rate_limits']) await db.prepare(`DELETE FROM ${table}`).run();
  const now = new Date().toISOString();
  // This paid owner is established, not a first-run account. SQLite's default
  // datetime('now') has no zone and would trigger onboarding in UTC CI while
  // appearing older in some developer browser timezones. Fresh trial accounts
  // retain their real creation timestamps and exercise the onboarding UI.
  await db.prepare(`INSERT INTO admins(id,email,store_name,store_id,slug,whatsapp,
    subscription_start,subscription_end,subscription_months,plan_id,is_trial,trial_used,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind('local-gui-owner', 'owner@example.test',
    'متجر تجريبي محلي', 'local-gui-shop', 'local-gui-shop', '0000000000',
    now, '2099-01-01T00:00:00.000Z', 12, 'annual', 0, 1, '2020-01-01T00:00:00.000Z').run();
  await db.prepare(`INSERT INTO admins(id,email,subscription_start,subscription_end,plan_id,is_trial,trial_used)
    VALUES(?,?,?,?,?,?,?)`).bind('local-gui-expired', 'expired@example.test',
    '2020-01-01T00:00:00.000Z', '2020-01-08T00:00:00.000Z', 'trial', 1, 1).run();
  // A deleted-profile identity with consumed trial tests the ledger rather than only expiry.
  await db.prepare(`INSERT INTO trial_ledger(identity_type,identity_value,claim_id,started_at,subscription_end)
    VALUES(?,?,?,?,?)`).bind('email', 'used@example.test', 'local-gui-deleted-claim',
    '2020-01-01T00:00:00.000Z', '2020-01-08T00:00:00.000Z').run();
  await db.prepare(`INSERT INTO stores(id,slug,name,owner_id,whatsapp,currency,theme,location,announcement,social_links)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).bind('local-gui-shop', 'local-gui-shop', 'متجر تجريبي محلي',
    'local-gui-owner', '0000000000', 'SAR', JSON.stringify({ primary: '#385a4f', secondary: '#f4f1e8', displayMode: 'grid' }),
    JSON.stringify({ enabled: true, lat: 15.3694, lng: 44.191, address: 'عنوان خيالي للاختبار المحلي', description: 'لا يوجد متجر حقيقي' }),
    JSON.stringify({ enabled: true, message: 'إعلان محلي تجريبي — لا توجد طلبات حقيقية', backgroundColor: '#385a4f', textColor: '#ffffff', isScrolling: true, canClose: true }),
    JSON.stringify({ enabled: false, links: {} })).run();
  await db.prepare('INSERT INTO categories(id,store_id,name,sort_order) VALUES(?,?,?,?)')
    .bind('local-gui-category', 'local-gui-owner', 'منتجات تجريبية', 0).run();
  const bucket = await mf.getR2Bucket('R2_BUCKET');
  for (const key of ['fixture-a.png', 'fixture-b.png']) await bucket.put(key, Uint8Array.from(fixturePng).buffer,
    { httpMetadata: { contentType: 'image/png' } });
  for (const [id, name, price, image] of [
    ['local-gui-product-a', 'منتج تجريبي أول', 25, 'fixture-a.png'],
    ['local-gui-product-b', 'منتج تجريبي ثان', 45, 'fixture-b.png'],
  ]) await db.prepare(`INSERT INTO products(id,store_id,name,price,description,images,category_id,colors,sizes)
    VALUES(?,?,?,?,?,?,?,?,?)`).bind(id, 'local-gui-owner', name, price, 'بيانات خيالية للاختبار فقط',
    JSON.stringify([`${api}/local-gui-r2/${image}`]), 'local-gui-category', '[]', '[]').run();
  await db.prepare(`INSERT INTO store_payment_methods(id,store_id,provider_id,country_code,label,config_details,require_receipt)
    VALUES(?,?,?,?,?,?,?)`).bind('local-gui-payment', 'local-gui-owner', 'stc_pay', 'SA',
    'حساب تجريبي محلي', JSON.stringify({ phone: '0500000000', accountName: 'LOCAL GUI Fictional Account' }), 0).run();
  await db.prepare('CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT)').run();
  await db.prepare('INSERT OR REPLACE INTO settings(key,value,updated_at) VALUES(?,?,?)').bind('contact', '0000000000', now).run();
}
