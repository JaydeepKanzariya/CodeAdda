import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    testTimeout: 30_000,
    // PGlite boots in beforeAll hooks; on a loaded machine that can exceed the 10s default.
    hookTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts'],
    poolOptions: {
      forks: { maxForks: 3 },
    },
  },
});
