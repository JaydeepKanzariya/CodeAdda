import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadLabFromDir } from '@codeadda/content-loader/node';
import { PgliteEngine } from '@codeadda/engine-pglite';
import { HERO_DEMO, demoSql } from '../apps/web/src/home/homeContent';

// The home page shows this query and these rows as a real, checked result. If the shop dataset changes, this must fail.
describe('home page hero demo', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());

  it('is the real answer on the shop dataset, in the shown order', async () => {
    const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/sql'));
    const source = lab.datasets['shop'];
    expect(source, 'content/sql/datasets/shop.sql').toBeDefined();
    await engine.setup({ name: 'shop', source: source! });

    const result = await engine.run(demoSql(HERO_DEMO));
    expect(result.ok, result.ok ? '' : result.error.message).toBe(true);
    if (!result.ok) return;
    expect(result.columns).toEqual([...HERO_DEMO.columns]);
    expect(result.rows.map(([country, n]) => [country, Number(n)])).toEqual(HERO_DEMO.rows.map((r) => [...r]));
  });
});
