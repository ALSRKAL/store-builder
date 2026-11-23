import type { Env } from '../types';
import { jsonResponse } from './helpers';

const REQUIRED_TABLES = [
  'admins', 'stores', 'products', 'categories', 'store_payment_methods', 'payment_receipts',
  'orders', 'trial_ledger', 'store_revisions', 'store_slug_aliases', 'rate_limits',
];

export async function healthResponse(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== '/api/health' && path !== '/api/ready') return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
  }
  if (path === '/api/health') {
    const response = jsonResponse({ status: 'ok', releaseId: env.RELEASE_ID ?? null });
    response.headers.set('Cache-Control', 'no-store');
    return request.method === 'HEAD' ? new Response(null, response) : response;
  }

  const checks = { database: false, schema: false, storage: false, realtime: false };
  try {
    const db = env.DB.withSession('first-primary');
    const rows = await db.prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${REQUIRED_TABLES.map(() => '?').join(',')})`,
    ).bind(...REQUIRED_TABLES).all<{ name: string }>();
    checks.database = rows.success;
    checks.schema = REQUIRED_TABLES.every(name => rows.results.some(row => row.name === name));
  } catch { /* Readiness must fail closed without exposing database errors. */ }
  try {
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.head('__readiness__');
      checks.storage = true;
    }
  } catch { /* No object is created or changed by this check. */ }
  try {
    if (env.STORE_REALTIME) {
      env.STORE_REALTIME.idFromName('__readiness__');
      checks.realtime = true;
    }
  } catch { /* Verify namespace availability without creating a Durable Object. */ }

  const ready = Object.values(checks).every(Boolean);
  const response = jsonResponse({ status: ready ? 'ready' : 'not_ready', checks, releaseId: env.RELEASE_ID ?? null }, ready ? 200 : 503);
  response.headers.set('Cache-Control', 'no-store');
  return request.method === 'HEAD' ? new Response(null, response) : response;
}
