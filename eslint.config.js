import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * إعداد ESLint
 *
 * كان الإعداد يقصر الفحص على ملفات JavaScript فقط، أي أن كل ملفات
 * TypeScript (وهي أغلب المشروع) لم تكن تُفحص إطلاقاً.
 *
 * تحذير عند تعديل هذا الملف: لا تكتب تسلسل نجمة ثم سلاش داخل تعليق (أي نمط
 * glob مثل النمط الافتراضي لملفات JS) لأن هذا التسلسل يُنهي التعليق مبكراً
 * ويُفسد الملف نحوياً.
 *
 * ملاحظة مهمة: قواعد TypeScript هنا مضبوطة على `warn` لا `error`. الملفات التي
 * لم تُلمس بعد (المراحل 3 و4) فيها ديون كثيرة، ولو جعلناها أخطاءً لتوقّف أي عمل
 * جديد عند أول تحذير قديم. `npm run lint` يفشل على الأخطاء فقط.
 *
 * الجانب الخاص بـ TypeScript مكتوب كإعداد flat صريح (بدون `extends`) لأن نثر
 * `...tseslint.configs.recommended` داخل extends يفشل في تحميل الإعداد مع
 * ESLint 9.39. الصيغة الصريحة أوضح وأقل عرضة للانكسار.
 *
 * لإلزام صارم لاحقاً: `npm run lint -- --max-warnings=0`.
 */

/** يدمج قواعد عدة إعدادات في كائن واحد. */
function mergeRules(...configs) {
  return configs.reduce((acc, config) => ({ ...acc, ...(config?.rules ?? {}) }), {})
}

const baseLanguageOptions = {
  ecmaVersion: 2020,
  globals: {
    ...globals.browser,
    ...globals.node,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    ecmaFeatures: { jsx: true },
    sourceType: 'module',
  },
}

export default defineConfig([
  // ملفات Service Worker تعمل في سياق Worker لا المتصفح/Node، فمتغيّراتها
  // (importScripts, clients, firebase) غير معرّفة في globals. تجاهلها اتساقاً
  // مع الإدخال الحالي public/sw.js.
  globalIgnores(['dist', 'dist-ci', 'coverage', '**/artifacts/**', 'test-results', 'playwright-report', '**/.wrangler/**', '**/.vite-cache/**', 'scripts/local-gui/*.bundle.mjs']),

  /* ===== ملفات JavaScript ===== */
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: baseLanguageOptions,
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]|^motion$|^AnimatePresence$',
        argsIgnorePattern: '^_',
      }],
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },

  /* ===== ملفات TypeScript ===== */
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ...baseLanguageOptions,
      parser: tseslint.parser,
    },
    rules: {
      ...mergeRules(js.configs.recommended, tseslint.configs.recommended),
      // TypeScript يتحقّق من المعرّفات بنفسه؛ no-undef يعطي نتائج خاطئة مع الأنواع.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // مخفَّضة مؤقتاً حتى تُنظّف المراحل 3 و4 ملفاتها.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      ...mergeRules(reactHooks.configs.flat.recommended, reactRefresh.configs.vite),
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { ...baseLanguageOptions, globals: globals.node },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
  {
    files: ['workers/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['public/**/*sw.js', 'public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, firebase: 'readonly' } },
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])