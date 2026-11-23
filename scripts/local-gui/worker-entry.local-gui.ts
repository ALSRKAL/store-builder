/** LOCAL GUI ONLY. Bundled only by start.local-gui.mjs; not a production entry. */
import actualWorker from '../../workers/api/index';
export { StoreRealtime } from '../../workers/api/index';

export default {
  async fetch(request: Request, env: Parameters<typeof actualWorker.fetch>[1], ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/local-gui-r2/')) {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      const bucket = (env as typeof env & { R2_BUCKET: R2Bucket }).R2_BUCKET;
      const object = await bucket.get(decodeURIComponent(url.pathname.slice('/local-gui-r2/'.length)));
      if (!object) return new Response('Missing local fixture image', { status: 404 });
      const headers = new Headers({ 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }
    if (url.pathname === '/local-gui/reset' && request.method === 'POST') {
      return (env as typeof env & { LOCAL_GUI_RESET: Fetcher }).LOCAL_GUI_RESET.fetch(request);
    }
    if (url.pathname === '/local-gui/ready' && request.method === 'GET') {
      const store = await env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind('local-gui-shop').first();
      const product = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind('local-gui-product-a').first();
      if (!store || !product) return Response.json({ isolated: true, seeded: false }, { status: 503 });
      return (env as typeof env & { LOCAL_GUI_READY: Fetcher }).LOCAL_GUI_READY.fetch(request);
    }
    if (url.pathname === '/local-gui/snapshot' && request.method === 'GET') {
      const tables = ['admins', 'stores', 'products', 'categories', 'store_payment_methods', 'orders', 'trial_ledger', 'store_revisions'];
      const result: Record<string, unknown> = { localGuiOnly: true };
      for (const table of tables) result[table] = (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;
      return Response.json(result, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } });
    }
    return actualWorker.fetch(request, env, ctx);
  },
};
