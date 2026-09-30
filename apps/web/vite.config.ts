import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Monaco is bundled locally (see src/components/monacoSetup.ts), so @monaco-editor/loader's
 * default CDN path is dead code. Blank it out so the build can never reach for the network.
 */
function stripMonacoCdnDefault(): Plugin {
  return {
    name: 'codeadda:strip-monaco-cdn-default',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replace(/\\/g, '/').includes('/@monaco-editor/loader/')) return null;
      if (!code.includes('cdn.jsdelivr.net')) return null;
      return { code: code.replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/monaco-editor@[^'"]*/g, ''), map: null };
    },
  };
}

export default defineConfig({
  plugins: [stripMonacoCdnDefault(), react(), tailwindcss()],
  // PGlite ships its own WASM; pre-bundling breaks its asset URLs.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  // content/ lives two levels above apps/web.
  server: { fs: { allow: ['../..'] } },
});
