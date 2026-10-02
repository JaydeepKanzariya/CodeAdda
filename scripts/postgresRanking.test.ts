import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { grade, resolveDataset } from '@codeadda/core';
import { loadLabFromDir } from '@codeadda/content-loader/node';
import { PgliteEngine } from '@codeadda/engine-pglite';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/postgres'));
const lesson = lab.lessons.flatMap((c) => c.items).find((x) => x.id === 'row-number-rank');
if (!lesson) throw new Error('no lesson row-number-rank');

const rankQuery = `SELECT restaurant_id, name, price,
  rank() OVER (PARTITION BY restaurant_id ORDER BY price DESC) AS price_rank
FROM menu_items;`;

describe('row-number-rank lesson tells the ranking functions apart', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());
  const check = (query: string) => grade(engine, lesson, resolveDataset(lab, lesson), query);

  it('accepts the lesson solution and the rank() query', async () => {
    expect((await check(lesson.solution)).pass).toBe(true);
    expect((await check(rankQuery)).pass).toBe(true);
  });

  it('rejects row_number(), which never repeats a number on the price tie', async () => {
    expect((await check(rankQuery.replace('rank()', 'row_number()'))).pass).toBe(false);
  });

  it('rejects dense_rank(), which does not skip a number after the tie', async () => {
    expect((await check(rankQuery.replace('rank()', 'dense_rank()'))).pass).toBe(false);
  });
});
