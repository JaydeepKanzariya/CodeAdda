import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  use: { baseURL: 'http://localhost:5199', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -w @codeadda/web -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 120_000,
    // Tests block every request that leaves localhost, so they must never load Clerk. An empty value
    // beats any key in a developer's .env.local and keeps the browser tests on the key-less sign-in.
    env: { VITE_CLERK_PUBLISHABLE_KEY: '' },
  },
});
