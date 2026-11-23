/**
 * Tailwind Configuration
 *
 * توكنات الألوان تعتمد مرجعية HEX في `src/index.css` (لتوافق مع themeUtils.ts
 * الذي يحسب التباين من قيم HEX). لدعم كلاسات الشفافية مثل `bg-primary/10`
 * نغلّف كل لون بـ color-mix مع <alpha-value>.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: {
    relative: true,
    files: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        display: ['Alexandria', 'IBM Plex Sans Arabic', 'sans-serif'],
        cairo: ['IBM Plex Sans Arabic', 'sans-serif'],
      },
      colors: {
        /* ===== شفافية آمنة لأي توكن HEX ===== */
        border: "color-mix(in srgb, var(--border) calc(<alpha-value> * 100%), transparent)",
        "border-strong": "color-mix(in srgb, var(--border-strong) calc(<alpha-value> * 100%), transparent)",
        input: "color-mix(in srgb, var(--border-strong) calc(<alpha-value> * 100%), transparent)",
        ring: "color-mix(in srgb, var(--ring) calc(<alpha-value> * 100%), transparent)",
        background: "color-mix(in srgb, var(--bg) calc(<alpha-value> * 100%), transparent)",
        foreground: "color-mix(in srgb, var(--fg) calc(<alpha-value> * 100%), transparent)",
        /** عائلة النصوص — text-fg / text-fg-muted / text-fg-subtle */
        fg: {
          DEFAULT: "color-mix(in srgb, var(--fg) calc(<alpha-value> * 100%), transparent)",
          muted: "color-mix(in srgb, var(--fg-muted) calc(<alpha-value> * 100%), transparent)",
          subtle: "color-mix(in srgb, var(--fg-subtle) calc(<alpha-value> * 100%), transparent)",
        },
        /** الطبقة المعتمة خلف النوافذ والأدراج والتلميحات */
        scrim: {
          DEFAULT: "color-mix(in srgb, var(--scrim) calc(<alpha-value> * 100%), transparent)",
          fg: "color-mix(in srgb, var(--scrim-fg) calc(<alpha-value> * 100%), transparent)",
        },
        primary: {
          DEFAULT: "color-mix(in srgb, var(--primary) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--primary-fg) calc(<alpha-value> * 100%), transparent)",
          light: "color-mix(in srgb, var(--primary-light) calc(<alpha-value> * 100%), transparent)",
          dark: "color-mix(in srgb, var(--primary-dark) calc(<alpha-value> * 100%), transparent)",
        },
        secondary: {
          DEFAULT: "color-mix(in srgb, var(--secondary) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--secondary-fg) calc(<alpha-value> * 100%), transparent)",
        },
        destructive: {
          DEFAULT: "color-mix(in srgb, var(--danger) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--danger-fg) calc(<alpha-value> * 100%), transparent)",
        },
        /**
         * عائلة `danger` — إضافة على `destructive` لأن الكود يسمّي الحالة
         * الدلالية لا "الزر المدمّر": bg-danger / text-danger / border-danger.
         * بدون هذا المدخل تُولَّد الأصناف فارغة بلا أي تحذير من Tailwind.
         */
        danger: {
          DEFAULT: "color-mix(in srgb, var(--danger) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--danger-fg) calc(<alpha-value> * 100%), transparent)",
        },
        success: {
          DEFAULT: "color-mix(in srgb, var(--success) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--success-fg) calc(<alpha-value> * 100%), transparent)",
        },
        warning: {
          DEFAULT: "color-mix(in srgb, var(--warning) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--warning-fg) calc(<alpha-value> * 100%), transparent)",
        },
        info: {
          DEFAULT: "color-mix(in srgb, var(--info) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--info-fg) calc(<alpha-value> * 100%), transparent)",
        },
        muted: {
          DEFAULT: "color-mix(in srgb, var(--surface-sunken) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--fg-muted) calc(<alpha-value> * 100%), transparent)",
        },
        subtle: "color-mix(in srgb, var(--fg-subtle) calc(<alpha-value> * 100%), transparent)",
        accent: {
          DEFAULT: "color-mix(in srgb, var(--accent) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--accent-fg) calc(<alpha-value> * 100%), transparent)",
        },
        highlight: {
          DEFAULT: "color-mix(in srgb, var(--highlight) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--highlight-fg) calc(<alpha-value> * 100%), transparent)",
        },
        popover: {
          DEFAULT: "color-mix(in srgb, var(--surface) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--fg) calc(<alpha-value> * 100%), transparent)",
        },
        card: {
          DEFAULT: "color-mix(in srgb, var(--surface) calc(<alpha-value> * 100%), transparent)",
          foreground: "color-mix(in srgb, var(--fg) calc(<alpha-value> * 100%), transparent)",
        },
        surface: {
          DEFAULT: "color-mix(in srgb, var(--surface) calc(<alpha-value> * 100%), transparent)",
          raised: "color-mix(in srgb, var(--surface-raised) calc(<alpha-value> * 100%), transparent)",
          sunken: "color-mix(in srgb, var(--surface-sunken) calc(<alpha-value> * 100%), transparent)",
        },

        /* ===== ألوان المتجر (overrides يضبطها themeUtils لكل تاجر) ===== */
        store: {
          primary: "color-mix(in srgb, var(--store-primary) calc(<alpha-value> * 100%), transparent)",
          secondary: "color-mix(in srgb, var(--store-secondary) calc(<alpha-value> * 100%), transparent)",
          accent: "color-mix(in srgb, var(--store-accent) calc(<alpha-value> * 100%), transparent)",
          bg: "color-mix(in srgb, var(--store-body-bg) calc(<alpha-value> * 100%), transparent)",
          text: "color-mix(in srgb, var(--store-body-text) calc(<alpha-value> * 100%), transparent)",
          card: "color-mix(in srgb, var(--store-card-bg) calc(<alpha-value> * 100%), transparent)",
          border: "color-mix(in srgb, var(--store-border) calc(<alpha-value> * 100%), transparent)",
          header: {
            bg: "color-mix(in srgb, var(--store-header-bg) calc(<alpha-value> * 100%), transparent)",
            text: "color-mix(in srgb, var(--store-header-text) calc(<alpha-value> * 100%), transparent)",
          },
        },
      },

      /* Arabic type scale. Body never below 16px. */
      fontSize: {
        display: ['2.5rem', { lineHeight: '3.25rem', fontWeight: '700' }],
        h1: ['2rem', { lineHeight: '2.8rem', fontWeight: '700' }],
        h2: ['1.5rem', { lineHeight: '2.175rem', fontWeight: '600' }],
        h3: ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.75rem' }],
        label: ['0.8125rem', { lineHeight: '1.35rem', fontWeight: '500' }],
        data: ['0.875rem', { lineHeight: '1.35rem', fontVariantNumeric: 'tabular-nums' }],
      },

      /* مقاسات كانت مستخدمة في الكود وتُنتج صفر CSS */
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      borderWidth: {
        '3': '3px',
      },
      ringWidth: {
        '3': '3px',
      },
      maxWidth: {
        '8xl': '88rem',
      },

      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
        '3xl': '12px',
        DEFAULT: '4px',
      },

      /* Resting surfaces carry no shadow; only overlays do. */
      boxShadow: {
        'xs': '0 1px 0 0 rgb(25 23 16 / 0.04)',
        'sm': '0 1px 2px 0 rgb(25 23 16 / 0.06)',
        'md': '0 6px 18px -10px rgb(25 23 16 / 0.22)',
        'lg': '0 24px 60px -24px rgb(25 23 16 / 0.35), 0 2px 8px -2px rgb(25 23 16 / 0.12)',
        'overlay': '0 24px 60px -24px rgb(25 23 16 / 0.4), 0 2px 8px -2px rgb(25 23 16 / 0.16)',
      },

      /* أزمنة موحّدة توافق src/lib/motion.ts */
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-soft': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-out forwards",
        "slide-in": "slide-in 0.2s ease-out",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in": {
          from: { transform: "translateY(-6px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    /**
     * مُعدِّلا الاتجاه `rtl:` و`ltr:`.
     *
     * Tailwind 3.4 لا يوفّرهما افتراضياً، وكانت بعض الملفات تكتب الصنف `rtl`
     * كأنه مُعدِّل فيولّد صفر CSS. نضيفهما هنا ليكون الحل الوحيد الصحيح عند
     * التعامل مع مكتبات تحرّك بقيم فيزيائية (مثل Radix Switch).
     *
     * ملاحظة: القاعدة الأولى في المشروع هي استخدام الخصائص المنطقية
     * (start/end/ms/me/ps/pe) — هذان المُعدِّلان استثناء محدود.
     */
    function ({ addVariant }) {
      addVariant('rtl', '[dir="rtl"] &')
      addVariant('ltr', '[dir="ltr"] &')
    },
  ],
}