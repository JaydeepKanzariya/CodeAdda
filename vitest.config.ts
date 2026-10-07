import { defineConfig } from 'vitest/config';
import { labContent } from './apps/web/plugins/labContent';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  plugins: [labContent()],
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.{ts,tsx}', 'apps/*/plugins/**/*.test.ts', 'scripts/**/*.test.ts'],
    // Unit tests must not load Clerk or reach the network, whatever key a developer has locally.
    env: { VITE_CLERK_PUBLISHABLE_KEY: '' },
    testTimeout: 30_000,
    // PGlite boots in beforeAll hooks; on a loaded machine that can exceed the 10s default.
    hookTimeout: 30_000,
    setupFiles: ['./vitest.setup.ts'],
    poolOptions: {
      forks: { maxForks: 3 },
    },
  },
});
