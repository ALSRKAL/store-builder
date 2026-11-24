import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'workers/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    testTimeout: 40000,
    hookTimeout: 40000,
    maxWorkers: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}', 'workers/api/**/*.ts'],
      exclude: ['**/*.test.*', 'src/test/**', '**/*.d.ts'],
      thresholds: { lines: 15, statements: 14.5, functions: 11.5, branches: 13.5 },
    },
  },
});
