import { resolve } from 'node:path';
import { listLabDirs, loadLabFromDir } from '@codeadda/content-loader/node';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { checkLab } from './checkLab';

const contentRoot = resolve(import.meta.dirname, '../content');
let failed = 0;

for (const dir of listLabDirs(contentRoot)) {
  let lab;
  try {
    lab = loadLabFromDir(dir);
  } catch (e) {
    console.error(`✗ ${dir}/lab.json is invalid: ${e instanceof Error ? e.message : e}`);
    failed++;
    continue;
  }
  if (lab.language !== 'sql') {
    console.log(`- ${lab.id}: skipped (no ${lab.language} engine yet)`);
    continue;
  }
  const engine = new PgliteEngine();
  const { checked, failures } = await checkLab(lab, engine);
  await engine.dispose();
  for (const f of failures) console.error(`✗ content/${lab.id}/${f.path} — ${f.message}`);
  console.log(`${failures.length ? '✗' : '✓'} ${lab.id}: ${checked} item(s) checked, ${failures.length} problem(s)`);
  failed += failures.length;
}

process.exitCode = failed ? 1 : 0;
