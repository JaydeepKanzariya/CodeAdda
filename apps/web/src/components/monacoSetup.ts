// Bundle Monaco with the app instead of letting @monaco-editor/react fetch it from a CDN,
// so the lab works fully offline.
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
// monaco-editor's "exports" map serves `monaco-editor/<path>` from esm/vs/<path>.js.
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  // SQL uses only the base editor worker; MongoDB's javascript mode needs the TypeScript worker (loaded only when used).
  getWorker: (_id: string, label: string) => (label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker()),
};

// Learners type mongosh, not a JS program: no squiggles under `db`.
// monaco.languages.typescript is typed with { deprecated: true } in 0.57.0; cast to configure diagnostics.
(monaco.languages as unknown as { typescript?: { javascriptDefaults?: { setDiagnosticsOptions: (opts: unknown) => void } } })
  .typescript?.javascriptDefaults?.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: true });

loader.config({ monaco });
