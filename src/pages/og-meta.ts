/**
 * Pure metadata builders for the storefront's server-rendered HTML.
 * Kept free of DOM/Workers APIs so they can be unit tested.
 */

export interface OgStore {
  slug: string;
  name: string;
  description?: string | null;
  logo?: string | null;
  theme?: { primary?: string | null } | null;
  location?: { address?: string | null; description?: string | null } | null;
  announcement?: { message?: string | null; text?: string | null } | null;
  socialLinks?: Record<string, unknown> | null;
  isActive?: boolean;
}

export interface StoreMeta {
  title: string;
  description: string;
  image: string;
  icon: string;
  canonical: string;
  robots: string;
  themeColor: string;
  jsonLd: string;
  extraHead: string;
}

const FALLBACK_ORIGIN = 'https://store-build.pages.dev';
const FALLBACK_IMAGE = '/og-image.png';
const FALLBACK_ICON = '/favicon.svg';

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max).trim();
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function absoluteHttpUrl(value: unknown, base: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function safeOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return FALLBACK_ORIGIN;
    return url.origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

function hexColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim().toUpperCase() : null;
}

/** Replace a value only when it cannot break out of a <script> block. */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function socialProfiles(store: OgStore, origin: string): string[] {
  const values = Object.values(store.socialLinks ?? {});
  return values
    .map(value => absoluteHttpUrl(value, origin))
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);
}

/**
 * Builds the exact meta payload used by both the Pages worker and its tests.
 * The canonical URL is always based on the canonical store slug, never the
 * alias the visitor may have opened.
 */
export function buildStoreMeta(store: OgStore, originInput: string): StoreMeta {
  const origin = safeOrigin(originInput);
  const name = cleanText(store.name, 70) || 'متجر';
  const fullDescription = cleanText(store.description, 300)
    || `${name} — متجر إلكتروني للتسوق أونلاين.`;
  const description = fullDescription.slice(0, 160).trim();
  const title = `${name} | تسوق أونلاين`;
  const canonical = new URL(`/store/${encodeURIComponent(store.slug)}`, origin).href;
  const fallbackImage = new URL(FALLBACK_IMAGE, origin).href;
  const logo = absoluteHttpUrl(store.logo, origin);
  // Social crawlers do not render SVG previews, so keep the branded PNG fallback.
  const image = logo && !/\.svg(?:$|[?#])/i.test(logo) ? logo : fallbackImage;
  const icon = logo ?? new URL(FALLBACK_ICON, origin).href;
  const themeColor = hexColor(store.theme?.primary) ?? '#F4F1E8';
  const robots = store.isActive === false ? 'noindex, nofollow' : 'index, follow';
  const address = cleanText(store.location?.address, 200);
  const sameAs = socialProfiles(store, origin);
  const jsonLdObject: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name,
    url: canonical,
    image,
    description: fullDescription,
  };
  if (address) jsonLdObject['address'] = { '@type': 'PostalAddress', streetAddress: address };
  if (sameAs.length) jsonLdObject['sameAs'] = sameAs;
  const jsonLd = safeJsonForScript(jsonLdObject);
  const extraHead = [
    `<meta property="og:site_name" content="${escapeHtml(name)}">`,
    `<meta property="og:image:secure_url" content="${escapeHtml(image)}">`,
    `<meta property="og:image:alt" content="${escapeHtml(name)}">`,
    `<meta name="twitter:image:alt" content="${escapeHtml(name)}">`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join('\n');
  return { title, description, image, icon, canonical, robots, themeColor, jsonLd, extraHead };
}
