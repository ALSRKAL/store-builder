import { describe, expect, it } from 'vitest';
import { buildStoreMeta, cleanText, escapeHtml, safeJsonForScript } from './og-meta';

const store = {
  slug: 'my-store',
  name: 'متجر الاختبار',
  description: 'أفضل متجر للملابس والإكسسوارات',
  logo: 'https://cdn.example.com/logo.webp',
  theme: { primary: '#1e6b4a' },
  location: { address: 'صنعاء، اليمن' },
  socialLinks: { instagram: 'https://instagram.com/store', empty: null },
  isActive: true,
};

describe('buildStoreMeta', () => {
  it('builds canonical store metadata with store logo and description', () => {
    const meta = buildStoreMeta(store, 'https://store-build.pages.dev');
    expect(meta.title).toBe('متجر الاختبار | تسوق أونلاين');
    expect(meta.description).toBe('أفضل متجر للملابس والإكسسوارات');
    expect(meta.canonical).toBe('https://store-build.pages.dev/store/my-store');
    expect(meta.image).toBe('https://cdn.example.com/logo.webp');
    expect(meta.themeColor).toBe('#1E6B4A');
    expect(meta.robots).toBe('index, follow');
    expect(meta.extraHead).toContain('og:site_name');
    expect(meta.extraHead).toContain('twitter:image:alt');
    expect(meta.extraHead).toContain('PostalAddress');
    expect(meta.extraHead).toContain('instagram.com/store');
  });

  it('falls back to a branded PNG when the logo is missing, unsafe or SVG', () => {
    const base = buildStoreMeta({ ...store, logo: null }, 'https://store-build.pages.dev');
    expect(base.image).toBe('https://store-build.pages.dev/og-image.png');
    const svg = buildStoreMeta({ ...store, logo: '/logo.svg' }, 'https://store-build.pages.dev');
    expect(svg.image).toBe('https://store-build.pages.dev/og-image.png');
    expect(svg.icon).toBe('https://store-build.pages.dev/logo.svg');
    const data = buildStoreMeta({ ...store, logo: 'data:image/png;base64,abc' }, 'https://store-build.pages.dev');
    expect(data.image).toBe('https://store-build.pages.dev/og-image.png');
  });

  it('marks closed stores noindex and derives a description when missing', () => {
    const meta = buildStoreMeta({ ...store, description: null, isActive: false }, 'https://staging.example');
    expect(meta.robots).toBe('noindex, nofollow');
    expect(meta.description).toContain('متجر الاختبار');
    expect(meta.canonical).toBe('https://staging.example/store/my-store');
  });

  it('escapes JSON-LD so store text cannot break out of the script tag', () => {
    const meta = buildStoreMeta({ ...store, name: '</script><script>alert(1)</script>' }, 'https://store-build.pages.dev');
    expect(meta.extraHead).not.toContain('</script><script>alert(1)');
    expect(meta.extraHead).toContain('\\u003c/script');
  });
});

describe('metadata text helpers', () => {
  it('collapses whitespace and truncates safely', () => {
    expect(cleanText('  a\n\t b  ', 4)).toBe('a b');
    expect(cleanText(null, 4)).toBe('');
  });

  it('escapes HTML attributes', () => {
    expect(escapeHtml('"a" & <b>')).toBe('&quot;a&quot; &amp; &lt;b&gt;');
    expect(safeJsonForScript({ value: '</script>' })).toContain('\\u003c/script\\u003e');
  });
});
