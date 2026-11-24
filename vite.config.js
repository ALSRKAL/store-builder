import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { build as esbuild } from 'esbuild';
import { resolve } from 'path';

/**
 * يولّد /firebase-config.js من متغيرات البيئة وقت البناء والتطوير.
 * Service Workers لا تستطيع قراءة import.meta.env، ولا نريد تثبيت مفاتيح
 * Firebase في المستودع؛ فتُولَّد من .env (غير المتعقّب في git) هنا.
 */
function firebaseSwConfigPlugin(env) {
  const source = () => {
    const config = {
      apiKey: env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: env.VITE_FIREBASE_APP_ID ?? '',
    };
    return `/* generated from environment at build time */\nself.__FIREBASE_CONFIG__ = ${JSON.stringify(config)};\n`;
  };

  return {
    name: 'firebase-sw-config',
    configureServer(server) {
      server.middlewares.use('/firebase-config.js', (_req, res) => {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(source());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'firebase-config.js', source: source() });
    },
  };
}


/**
 * Emits the Pages advanced-mode worker next to index.html. The worker supplies
 * per-store OG/Twitter metadata and same-origin robots/sitemap; the API URL is
 * injected at build time so staging never points at production.
 */
function pagesWorkerPlugin(env) {
  const apiUrl = env.VITE_API_URL ?? '';
  const siteUrl = env.VITE_SITE_URL ?? 'http://localhost:5173';
  const robots = `# StoreBuilder
User-agent: *
Allow: /
Allow: /store/
Disallow: /admin/
Disallow: /api/

Sitemap: ${siteUrl}/sitemap.xml
`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${siteUrl}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
</urlset>`;
  const devRoutes = server => {
    server.middlewares.use('/robots.txt', (_request, response) => {
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.end(robots);
    });
    server.middlewares.use('/sitemap.xml', (_request, response) => {
      response.setHeader('Content-Type', 'application/xml; charset=utf-8');
      response.end(sitemap);
    });
  };
  return {
    name: 'pages-og-worker',
    async generateBundle() {
      const result = await esbuild({
        entryPoints: [resolve(__dirname, 'src/pages/og-worker.ts')],
        bundle: true,
        write: false,
        format: 'esm',
        platform: 'neutral',
        target: 'es2022',
        minify: true,
        define: { __STORE_API_URL__: JSON.stringify(apiUrl) },
      });
      const source = result.outputFiles?.[0]?.text;
      if (!source) this.error('Pages worker build produced no output');
      this.emitFile({ type: 'asset', fileName: '_worker.js', source });
    },
    configureServer: devRoutes,
    configurePreviewServer: devRoutes,
  };
}

export default defineConfig(({ mode }) => {
  const isolatedBuild = process.env.STORE_ISOLATED_BUILD === 'true';
  const env = isolatedBuild
    ? Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_')))
    : loadEnv(mode, __dirname, '');

  return {
    root: __dirname,
    ...(isolatedBuild ? { envDir: false } : {}),
    plugins: [react(), firebaseSwConfigPlugin(env), pagesWorkerPlugin(env)],
    resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/schemas': resolve(__dirname, './src/schemas'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/services': resolve(__dirname, './src/services'),
      '@/contexts': resolve(__dirname, './src/contexts'),
      '@/config': resolve(__dirname, './src/config'),
      '@/data': resolve(__dirname, './src/data'),
    },
  },
  build: {
    // تقسيم الكود لتحميل أسرع
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // Framer Motion
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) {
            return 'vendor-motion';
          }
          // Lucide Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Firebase
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase';
          }
          // Zod
          if (id.includes('node_modules/zod')) {
            return 'vendor-zod';
          }
          // HEIC converter (lazy loaded)
          if (id.includes('node_modules/heic2any')) {
            return 'vendor-heic';
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: env.VITE_API_URL || 'http://localhost:8787',
        changeOrigin: true,
        secure: false
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  };
});
