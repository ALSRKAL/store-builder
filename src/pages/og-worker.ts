/**
 * Pages advanced-mode worker.
 *
 * Static hosting cannot expose per-store Open Graph/Twitter metadata to link
 * preview crawlers (they do not run the React app). This worker fetches the
 * canonical public store data, rewrites the static shell's head, and also
 * serves environment-correct robots.txt/sitemap.xml.
 */

import { buildStoreMeta, type OgStore } from './og-meta';

declare const __STORE_API_URL__: string;

interface RewriterElement {
  setInnerContent(content: string): void;
  setAttribute(name: string, value: string): void;
  append(content: string, options?: { html?: boolean }): void;
  remove(): void;
}
interface RewriterHandlers { element?: (element: RewriterElement) => void; }
interface RewriterLike {
  on(selector: string, handlers: RewriterHandlers): RewriterLike;
  transform(response: Response): Response;
}
declare const HTMLRewriter: { new (): RewriterLike };

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
}

type CfFetchInit = RequestInit & {
  cf?: { cacheTtl?: number; cacheEverything?: boolean };
};

const API_URL = __STORE_API_URL__;
const HTML_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

function htmlHeaders(base?: Headers): Headers {
  const headers = new Headers(base);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', HTML_CACHE);
  return headers;
}

async function fetchStore(slug: string): Promise<(OgStore & { isActive?: boolean }) | null> {
  if (!API_URL) return null;
  try {
    const endpoint = new URL(`/api/public/store/${encodeURIComponent(slug)}`, API_URL).href;
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3500),
      cf: { cacheTtl: 60, cacheEverything: true },
    } as CfFetchInit);
    if (!response.ok) return null;
    const data = await response.json() as OgStore & { isActive?: boolean };
    if (!data || typeof data.slug !== 'string' || typeof data.name !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

async function shell(env: Env, request: Request): Promise<Response> {
  return env.ASSETS.fetch(new URL('/index.html', request.url).href);
}

function rewriteShell(response: Response, request: Request, store: OgStore & { isActive?: boolean }): Response {
  const meta = buildStoreMeta(store, new URL(request.url).origin);
  const rewriter = new HTMLRewriter();
  const setText = (selector: string, value: string): void => {
    rewriter.on(selector, { element: element => element.setInnerContent(value) });
  };
  const setAttr = (selector: string, attribute: string, value: string): void => {
    rewriter.on(selector, { element: element => element.setAttribute(attribute, value) });
  };
  setText('title', meta.title);
  setAttr('meta[name="description"]', 'content', meta.description);
  setAttr('meta[name="robots"]', 'content', meta.robots);
  setAttr('meta[name="theme-color"]', 'content', meta.themeColor);
  setAttr('link[rel="canonical"]', 'href', meta.canonical);
  setAttr('link[rel="icon"]', 'href', meta.icon);
  setAttr('link[rel="apple-touch-icon"]', 'href', meta.icon);
  setAttr('meta[property="og:title"]', 'content', meta.title);
  setAttr('meta[property="og:description"]', 'content', meta.description);
  setAttr('meta[property="og:image"]', 'content', meta.image);
  setAttr('meta[property="og:url"]', 'content', meta.canonical);
  setAttr('meta[property="og:type"]', 'content', 'website');
  setAttr('meta[property="og:locale"]', 'content', 'ar_SA');
  setAttr('meta[name="twitter:card"]', 'content', 'summary_large_image');
  setAttr('meta[name="twitter:title"]', 'content', meta.title);
  setAttr('meta[name="twitter:description"]', 'content', meta.description);
  setAttr('meta[name="twitter:image"]', 'content', meta.image);
  rewriter.on('script[type="application/ld+json"]', { element: element => element.remove() });
  rewriter.on('head', { element: element => element.append(meta.extraHead, { html: true }) });
  return rewriter.transform(response);
}

async function respondWithMeta(env: Env, request: Request, store: OgStore & { isActive?: boolean }): Promise<Response> {
  const response = await shell(env, request);
  if (!response.ok) return response;
  const transformed = rewriteShell(response, request, store);
  return new Response(transformed.body, { status: 200, headers: htmlHeaders(transformed.headers) });
}

function robotsTxt(origin: string): Response {
  const body = `# StoreBuilder
User-agent: *
Allow: /
Allow: /store/
Disallow: /admin/
Disallow: /api/

User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

User-agent: LinkedInBot
Allow: /

Sitemap: ${origin}/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}

async function sitemapXml(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  if (API_URL) {
    try {
      const response = await fetch(new URL('/api/seo/sitemap.xml', API_URL).href, {
        headers: { Accept: 'application/xml' },
        signal: AbortSignal.timeout(3500),
        cf: { cacheTtl: 300, cacheEverything: true },
      } as CfFetchInit);
      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'application/xml; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=300, s-maxage=900');
        return new Response(response.body, { status: 200, headers });
      }
    } catch {
      // Fall through to a valid minimal sitemap.
    }
  }
  const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
</urlset>`;
  return new Response(fallback, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}

async function noIndexShell(env: Env, request: Request): Promise<Response> {
  const response = await shell(env, request);
  if (!response.ok) return response;
  const transformed = new HTMLRewriter().on('meta[name="robots"]', {
    element: element => element.setAttribute('content', 'noindex, nofollow'),
  }).transform(response);
  return new Response(transformed.body, { status: 200, headers: htmlHeaders(transformed.headers) });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'GET') return env.ASSETS.fetch(request);

    if (url.pathname === '/robots.txt') return robotsTxt(url.origin);
    if (url.pathname === '/sitemap.xml') return sitemapXml(request);

    const match = url.pathname.match(/^\/store\/([^/]+)(\/.*)?$/);
    if (!match) return env.ASSETS.fetch(request);
    let slug: string;
    try {
      slug = decodeURIComponent(match[1]);
    } catch {
      return env.ASSETS.fetch(request);
    }
    const tail = match[2] ?? '';
    const store = await fetchStore(slug);
    if (!store) return noIndexShell(env, request);
    if (store.slug && store.slug !== slug) {
      const target = new URL(`/store/${encodeURIComponent(store.slug)}${tail}`, url.origin);
      target.search = url.search;
      return Response.redirect(target.href, 301);
    }
    // Product/cart/checkout routes keep client-side metadata; only the store
    // landing page needs the social canonical shell today.
    if (tail && tail !== '/') return env.ASSETS.fetch(request);
    return respondWithMeta(env, request, store);
  },
};
