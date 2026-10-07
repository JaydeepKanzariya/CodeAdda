import type { Plugin } from 'vite';

/**
 * Every `VITE_` variable is copied into the JavaScript that all visitors download. Returns a message for
 * each one that looks like a secret, so a mistake is caught at build time instead of after publishing.
 */
export function findBrowserSecrets(env: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_')) continue;
    if (/SECRET|PRIVATE|PASSWORD/i.test(name)) problems.push(`${name} has a secret-looking name`);
    else if (value && /^sk_(live|test)_/.test(value.trim())) problems.push(`${name} holds a Clerk secret key (sk_...)`);
  }
  return problems;
}

export function forbidBrowserSecrets(): Plugin {
  return {
    name: 'codeadda:forbid-browser-secrets',
    configResolved(config) {
      const problems = findBrowserSecrets(config.env);
      if (problems.length) {
        throw new Error(
          `Refusing to build: ${problems.join('; ')}. VITE_ variables are public. Keep secrets in server-only settings, never in a VITE_ variable.`,
        );
      }
    },
  };
}
