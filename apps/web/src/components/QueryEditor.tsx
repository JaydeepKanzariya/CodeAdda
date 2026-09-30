import { useEffect, useRef } from 'react';
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { cx } from '../lib/cx';
import type { Theme } from '../state/prefs';
import './monacoSetup';

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';

// Monaco needs hex colours; these mirror tokens.css.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('codeadda-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'ea580c', fontStyle: 'bold' },
      { token: 'comment', foreground: 'a8a29e', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1c1917',
      'editorLineNumber.foreground': '#ea580c',
      'editorLineNumber.activeForeground': '#9a3412',
      'editor.lineHighlightBackground': '#faf7f2',
      'editorCursor.foreground': '#f97316',
      'editor.selectionBackground': '#fed7aa',
    },
  });
  monaco.editor.defineTheme('codeadda-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'fb923c', fontStyle: 'bold' },
      { token: 'comment', foreground: '6b6560', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#181716',
      'editor.foreground': '#f5f2ed',
      'editorLineNumber.foreground': '#c2410c',
      'editorLineNumber.activeForeground': '#fb923c',
      'editor.lineHighlightBackground': '#1f1d1b',
      'editorCursor.foreground': '#fb923c',
      'editor.selectionBackground': '#7c2d12',
    },
  });
};

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled: boolean;
  running: boolean;
  fontScale: number;
  theme: Theme;
  statusText?: string;
  language?: string;
  title?: string;
  /** Editor height; pass '100%' to fill a sized parent. */
  height?: string;
}

export function QueryEditor({ value, onChange, onRun, disabled, running, fontScale, theme, statusText, language = 'sql', title = 'SQL editor', height = '220px' }: QueryEditorProps) {
  const runRef = useRef(onRun);
  useEffect(() => {
    runRef.current = disabled || running ? () => {} : onRun;
  });

  const fill = height === '100%';

  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());
  };

  return (
    <section aria-label={title} className={cx('overflow-hidden border border-line bg-surface', fill ? 'flex h-full flex-col rounded-xl' : 'rounded-lg')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-4 py-2">
        <span className="text-xs font-semibold tracking-wider text-faint uppercase">{title}</span>
        {statusText && <span className="text-xs text-faint">{statusText}</span>}
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || running}
          className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-md bg-brand px-3.5 py-1.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
          {running ? 'Running query…' : 'Run Query'}
          <kbd aria-hidden="true" className="hidden rounded bg-white/20 px-1.5 py-0.5 font-mono text-[0.625rem] lab:inline">{MOD}↵</kbd>
        </button>
      </div>
      <div data-testid="query-editor" className={cx(fill && 'min-h-0 flex-1')}>
        <Editor
          height={height}
          language={language}
          theme={theme === 'dark' ? 'codeadda-dark' : 'codeadda-light'}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          beforeMount={defineThemes}
          onMount={onMount}
          loading={<p className="p-4 text-sm text-muted">Loading editor…</p>}
          options={{
            minimap: { enabled: false },
            fontSize: Math.round(14 * fontScale),
            fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </section>
  );
}
