/**
 * SEO Routes - Dynamic Sitemap & SEO Endpoints
 * نظام SEO متقدم لتحسين ظهور المتاجر في محركات البحث
 */

// ===== Types =====

interface Env {
    DB: D1Database;
    R2_BUCKET?: R2Bucket;
    FIREBASE_PROJECT_ID?: string;
}

interface StoreForSitemap {
    slug: string;
    name: string;
    updated_at: string;
    is_active: number;
}

interface ProductForSitemap {
    id: string;
    name: string;
    updated_at: string;
    store_slug: string;
}

// ===== Constants =====

const BASE_URL = 'https://store-build.pages.dev';

// ===== Helper Functions =====

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

// ===== Main Sitemap Generator =====

export async function generateSitemap(env: Env): Promise<Response> {
    try {
        // جلب جميع المتاجر النشطة
        const stores = await env.DB.prepare(`
      SELECT s.slug, s.name, s.updated_at, s.is_active
      FROM stores s
      INNER JOIN admins a ON s.owner_id = a.id
      WHERE s.is_active = 1 
        AND a.dashboard_is_active = 1 
        AND a.store_is_active = 1
        AND a.subscription_end > datetime('now')
      ORDER BY s.updated_at DESC
    `).all<StoreForSitemap>();

        const today = new Date().toISOString().split('T')[0];

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- الصفحة الرئيسية -->
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- صفحة الشروط والأحكام -->
  <url>
    <loc>${BASE_URL}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  
  <!-- صفحة تسجيل الدخول للتجار -->
  <url>
    <loc>${BASE_URL}/admin</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
`;

        // إضافة المتاجر النشطة
        for (const store of stores.results) {
            const lastMod = formatDate(store.updated_at);
            sitemap += `
  <!-- متجر: ${escapeXml(store.name)} -->
  <url>
    <loc>${BASE_URL}/store/${escapeXml(store.slug)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }

        sitemap += `</urlset>`;

        return new Response(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
                'X-Robots-Tag': 'noindex',
            },
        });
    } catch (error) {
        console.error('Sitemap generation error:', error);

        // Fallback sitemap
        const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

        return new Response(fallbackSitemap, {
            status: 200,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
    }
}

// ===== Robots.txt Generator =====

export function generateRobotsTxt(): Response {
    const robotsTxt = `# =============================================
# robots.txt for StoreBuilder
# https://store-build.pages.dev
# =============================================

# السماح لجميع محركات البحث
User-agent: *
Allow: /
Allow: /store/

# منع الوصول لصفحات الإدارة
Disallow: /admin/
Disallow: /admin/dashboard
Disallow: /admin/setup
Disallow: /admin/verify
Disallow: /admin/blocked

# منع الوصول للـ API
Disallow: /api/

# =============================================
# Googlebot - إعدادات خاصة
# =============================================
User-agent: Googlebot
Allow: /
Allow: /store/
Crawl-delay: 1

# =============================================
# Bingbot
# =============================================
User-agent: Bingbot
Allow: /
Allow: /store/
Crawl-delay: 2

# =============================================
# Yandex
# =============================================
User-agent: Yandex
Allow: /
Crawl-delay: 2

# =============================================
# DuckDuckBot
# =============================================
User-agent: DuckDuckBot
Allow: /

# =============================================
# Social Media Crawlers
# =============================================
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

# =============================================
# Block Bad Bots
# =============================================
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

# =============================================
# Sitemap Location
# =============================================
Sitemap: ${BASE_URL}/sitemap.xml
Sitemap: ${BASE_URL}/api/seo/sitemap.xml

# =============================================
# Host
# =============================================
Host: ${BASE_URL}
`;

    return new Response(robotsTxt, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
        },
    });
}

// ===== Store-specific Sitemap =====

export async function generateStoreSitemap(env: Env, slug: string): Promise<Response> {
    try {
        // جلب معلومات المتجر
        const store = await env.DB.prepare(`
      SELECT s.slug, s.name, s.logo, s.updated_at, s.owner_id
      FROM stores s
      WHERE s.slug = ? AND s.is_active = 1
    `).bind(slug).first<StoreForSitemap & { logo: string; owner_id: string }>();

        if (!store) {
            return new Response('Store not found', { status: 404 });
        }

        // جلب منتجات المتجر
        const products = await env.DB.prepare(`
      SELECT p.id, p.name, p.updated_at
      FROM products p
      WHERE p.store_id = ?
      ORDER BY p.updated_at DESC
      LIMIT 1000
    `).bind(store.owner_id).all<ProductForSitemap>();

        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  
  <!-- صفحة المتجر الرئيسية -->
  <url>
    <loc>${BASE_URL}/store/${escapeXml(slug)}</loc>
    <lastmod>${formatDate(store.updated_at)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
`;

        // إضافة المنتجات
        for (const product of products.results) {
            const lastMod = formatDate(product.updated_at);
            sitemap += `
  <url>
    <loc>${BASE_URL}/store/${escapeXml(slug)}?product=${product.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }

        sitemap += `</urlset>`;

        return new Response(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=1800',
            },
        });
    } catch (error) {
        console.error('Store sitemap error:', error);
        return new Response('Error generating sitemap', { status: 500 });
    }
}

// ===== SEO Stats Endpoint =====

export async function getSeoStats(env: Env): Promise<Response> {
    try {
        const stats = await env.DB.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM stores WHERE is_active = 1) as active_stores,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM categories) as total_categories
    `).first<{ active_stores: number; total_products: number; total_categories: number }>();

        return new Response(JSON.stringify({
            activeStores: stats?.active_stores ?? 0,
            totalProducts: stats?.total_products ?? 0,
            totalCategories: stats?.total_categories ?? 0,
            sitemapUrl: `${BASE_URL}/api/seo/sitemap.xml`,
            robotsUrl: `${BASE_URL}/api/seo/robots.txt`,
            lastUpdated: new Date().toISOString(),
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (error) {
        console.error('SEO stats error:', error);
        return new Response(JSON.stringify({ error: 'Error fetching stats' }), { status: 500 });
    }
}

// ===== Main Handler =====

export async function handleSeo(request: Request, env: Env, path: string): Promise<Response> {
    const method = request.method;
    const subPath = path.replace('/api/seo', '');

    // Public endpoints - no auth required
    if (method === 'GET') {
        // Main sitemap
        if (subPath === '/sitemap.xml' || subPath === '/sitemap') {
            return generateSitemap(env);
        }

        // Robots.txt
        if (subPath === '/robots.txt' || subPath === '/robots') {
            return generateRobotsTxt();
        }

        // Store-specific sitemap
        const storeMatch = subPath.match(/^\/store\/([^/]+)\/sitemap\.xml$/);
        if (storeMatch) {
            return generateStoreSitemap(env, storeMatch[1]);
        }

        // SEO stats
        if (subPath === '/stats') {
            return getSeoStats(env);
        }
    }

    return new Response('Not Found', { status: 404 });
}
