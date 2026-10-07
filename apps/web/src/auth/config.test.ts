import { describe, expect, it } from 'vitest';
import { isValidClerkKey } from './config';

describe('isValidClerkKey', () => {
  it('accepts publishable keys, test and live', () => {
    expect(isValidClerkKey('pk_test_abc123')).toBe(true);
    expect(isValidClerkKey('pk_live_abc123')).toBe(true);
  });

  it('rejects a secret key, an empty value and a missing one', () => {
    expect(isValidClerkKey('sk_live_abc123')).toBe(false);
    expect(isValidClerkKey('sk_test_abc123')).toBe(false);
    expect(isValidClerkKey('')).toBe(false);
    expect(isValidClerkKey(undefined)).toBe(false);
  });
});
