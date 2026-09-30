// Bundle Monaco with the app instead of letting @monaco-editor/react fetch it from a CDN,
// so the lab works fully offline.
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
// monaco-editor's "exports" map serves `monaco-editor/<path>` from esm/vs/<path>.js.
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';

self.MonacoEnvironment = {
  // The SQL editor only needs the base editor worker (no JSON/CSS/HTML/TS language services).
  getWorker: () => new EditorWorker(),
};

loader.config({ monaco });
