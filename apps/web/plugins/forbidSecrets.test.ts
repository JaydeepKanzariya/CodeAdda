import { describe, expect, it } from 'vitest';
import { findBrowserSecrets } from './forbidSecrets';

describe('findBrowserSecrets', () => {
  it('accepts the Clerk publishable key and ordinary variables', () => {
    expect(findBrowserSecrets({ VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123', MODE: 'production', BASE_URL: '/' })).toEqual([]);
  });

  it('rejects a Clerk secret key, even in the publishable-key variable', () => {
    const problems = findBrowserSecrets({ VITE_CLERK_PUBLISHABLE_KEY: 'sk_live_abc123' });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/VITE_CLERK_PUBLISHABLE_KEY.*secret key/);
  });

  it('rejects VITE_ variables whose names look like secrets', () => {
    expect(findBrowserSecrets({ VITE_DB_PASSWORD: 'x', VITE_API_SECRET: 'y', VITE_PRIVATE_KEY: 'z' })).toHaveLength(3);
  });

  it('ignores secret-looking names that are not shipped to the browser', () => {
    expect(findBrowserSecrets({ CLERK_SECRET_KEY: 'sk_test_server_only', DATABASE_URL: 'postgres://x' })).toEqual([]);
  });
});
