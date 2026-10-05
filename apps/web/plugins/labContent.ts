import { basename, isAbsolute, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import { tsImport } from 'tsx/esm/api';
import type { Lab, LabSummary } from '@codeadda/core';

// Vite's config loader can't import our TypeScript workspace packages, so load them through tsx.
type NodeLoader = typeof import('@codeadda/content-loader/node');
type Loader = typeof import('@codeadda/content-loader');
const load = async () => ({
  node: (await tsImport('@codeadda/content-loader/node', import.meta.url)) as NodeLoader,
  loader: (await tsImport('@codeadda/content-loader', import.meta.url)) as Loader,
});

export const DEFAULT_CONTENT_DIR = fileURLToPath(new URL('../../../content', import.meta.url));

/** Builds every lab at build time, so the browser receives plain data and never the parser. */
export async function generateModules(contentDir: string) {
  const { node, loader } = await load();
  const summaries: LabSummary[] = [];
  const labs: Record<string, Lab> = {};
  for (const full of node.listLabDirs(contentDir)) {
    const dir = basename(full);
    try {
      const built = loader.buildLab(node.readLabSource(full));
      summaries.push(loader.summarizeLab(built, dir));
      labs[dir] = built;
    } catch (e) {
      console.warn(`[lab-content] skipping content/${dir}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { summaries, labs };
}

const SUMMARIES = 'virtual:lab-summaries';
const LOADERS = 'virtual:lab-content';
const ONE = 'virtual:lab-content/';

export function labContent(contentDir = DEFAULT_CONTENT_DIR): Plugin {
  let cache: ReturnType<typeof generateModules> | undefined;
  const data = () =>
    (cache ??= generateModules(contentDir).catch((e: unknown) => {
      cache = undefined; // retry on the next request instead of keeping the failure
      throw e;
    }));
  return {
    name: 'codeadda:lab-content',
    resolveId(id) {
      if (id === SUMMARIES || id === LOADERS || id.startsWith(ONE)) return `\0${id}`;
    },
    async load(id) {
      if (!id.startsWith('\0virtual:lab-')) return;
      const { summaries, labs } = await data();
      const key = id.slice(1);
      if (key === SUMMARIES) return `export const labSummaries = ${JSON.stringify(summaries)};`;
      if (key === LOADERS) {
        const entries = summaries.map((s) => `${JSON.stringify(s.id)}: () => import(${JSON.stringify(ONE + s.dir)})`);
        return `export const labLoaders = {${entries.join(', ')}};`;
      }
      const dir = key.slice(ONE.length);
      if (!labs[dir]) this.error(`No lab content for "${dir}"`);
      return `export default ${JSON.stringify(labs[dir])};`;
    },
    configureServer(server: ViteDevServer) {
      const root = normalize(contentDir);
      server.watcher.add(root);
      const client = server.environments.client;
      const refresh = (file: string) => {
        const rel = relative(root, normalize(file));
        if (rel.startsWith('..') || isAbsolute(rel)) return;
        cache = undefined;
        for (const m of client.moduleGraph.idToModuleMap.values()) {
          if (m.id?.startsWith('\0virtual:lab-')) client.moduleGraph.invalidateModule(m);
        }
        client.hot.send({ type: 'full-reload' });
      };
      server.watcher.on('add', refresh).on('change', refresh).on('unlink', refresh);
    },
  };
}
