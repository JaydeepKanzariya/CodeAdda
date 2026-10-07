import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { forbidBrowserSecrets } from './plugins/forbidSecrets';
import { labContent } from './plugins/labContent';

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
  plugins: [forbidBrowserSecrets(), stripMonacoCdnDefault(), labContent(), react(), tailwindcss()],
  // PGlite ships its own WASM; pre-bundling breaks its asset URLs.
  // mingo is only imported by the MongoDB worker, which the dep scanner doesn't crawl; without this, the first
  // visit to a lab discovers it late and Vite re-optimizes and reloads the page.
  optimizeDeps: { exclude: ['@electric-sql/pglite'], include: ['mingo', 'mingo/updater'] },
  worker: { format: 'es' },
  server: {
    // content/ lives two levels above apps/web.
    fs: { allow: ['../..'] },
    // Compile the lazy lab screen and the engine workers at startup, so the first lab visit on a fresh server is fast.
    warmup: { clientFiles: ['./src/lab/LabRoute.tsx', './src/engine/*.worker.ts'] },
  },
});
