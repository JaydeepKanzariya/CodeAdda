import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(import.meta.dirname, '..');

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) yield path;
  }
}

const rel = (file: string) => relative(SRC, file).replaceAll('\\', '/');

// The Clerk SDK is large. If the main bundle imports it, every page pays for it, even for visitors who
// never sign in (the home page was brought down to ~290 kB on purpose).
describe('the Clerk SDK stays out of the main bundle', () => {
  it('is imported by exactly one file, the one loaded on demand', () => {
    const importers = [...sourceFiles(SRC)].filter((f) => /from ['"]@clerk\//.test(readFileSync(f, 'utf8'))).map(rel);
    expect(importers).toEqual(['auth/ClerkNavAuth.tsx']);
  });

  it('is never imported statically by the app, only through lazy()', () => {
    const staticImport = /^import[^;]*from ['"][^'"]*ClerkNavAuth['"]/m;
    const offenders = [...sourceFiles(SRC)].filter((f) => staticImport.test(readFileSync(f, 'utf8'))).map(rel);
    expect(offenders).toEqual([]);

    const navbar = readFileSync(join(SRC, 'components/Navbar.tsx'), 'utf8');
    expect(navbar).toMatch(/lazy\(\(\) => import\(['"]\.\.\/auth\/ClerkNavAuth['"]\)\)/);
  });
});

// The fake development sign-in screens are only for development. If the main bundle imports them
// statically, every production visitor downloads them for nothing (about 29 kB).
describe('the development sign-in screens stay out of production builds', () => {
  const DEV_SCREENS = /^import[^;]*(AuthModal|AccountModal|UserMenu|DevAuthControl)[^;]*from ['"][^'"]*['"]/m;

  it('are not imported statically by any file outside the auth folder', () => {
    const offenders = [...sourceFiles(SRC)]
      .filter((f) => !rel(f).startsWith('auth/'))
      .filter((f) => DEV_SCREENS.test(readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });

  it('are loaded through lazy() behind import.meta.env.DEV, which Vite removes in production', () => {
    const navbar = readFileSync(join(SRC, 'components/Navbar.tsx'), 'utf8');
    const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
    expect(navbar).toContain("import.meta.env.DEV ? lazy(() => import('../auth/DevAuthControl'))");
    expect(app).toContain("import.meta.env.DEV ? lazy(() => import('./auth/AuthModal')");
  });

  it('keeps the fake sign-in provider behind import.meta.env.DEV, so its made-up user is not shipped', () => {
    const provider = readFileSync(join(SRC, 'auth/AuthProvider.tsx'), 'utf8');
    expect(provider).toContain('if (import.meta.env.DEV) return <LocalAuthProvider>');
  });

  it('are not re-exported by the auth index', () => {
    const index = readFileSync(join(SRC, 'auth/index.ts'), 'utf8');
    expect(index).not.toMatch(/AuthModal|AccountModal|UserMenu|DevAuthControl/);
  });
});
