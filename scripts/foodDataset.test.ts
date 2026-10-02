import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PgliteEngine } from '@codeadda/engine-pglite';

const source = readFileSync(resolve(import.meta.dirname, '../content/postgres/datasets/food.sql'), 'utf8');

describe('food dataset', () => {
  const engine = new PgliteEngine();
  afterAll(() => engine.dispose());

  const rows = async (sql: string) => {
    const r = await engine.run(sql);
    if (!r.ok) throw new Error(r.error.message);
    return r.rows;
  };

  it('loads with the planned row counts and lesson-ready quirks', async () => {
    await engine.setup({ name: 'food', source });
    const counts = await rows(`SELECT
      (SELECT count(*) FROM customers), (SELECT count(*) FROM restaurants), (SELECT count(*) FROM menu_items),
      (SELECT count(*) FROM riders), (SELECT count(*) FROM orders), (SELECT count(*) FROM order_items), (SELECT count(*) FROM reviews)`);
    expect(counts[0]!.map(Number)).toEqual([15, 8, 30, 5, 40, 80, 20]);

    const gaps = await rows(`SELECT count(*) FROM generate_series('2026-03-02'::date, '2026-03-22'::date, '1 day') d
      WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.placed_at::date = d::date)`);
    expect(Number(gaps[0]![0])).toBeGreaterThanOrEqual(2);

    const range = await rows(`SELECT min(placed_at)::date::text, max(placed_at)::date::text FROM orders`);
    expect(range[0]).toEqual(['2026-03-02', '2026-03-22']);

    expect(Number((await rows(`SELECT count(*) FROM orders WHERE status = 'cancelled'`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM orders WHERE rider_id IS NULL`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM reviews WHERE to_tsvector('english', body) @@ to_tsquery('english', 'spicy')`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM menu_items WHERE tags @> '{veg,spicy}'`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM orders WHERE details->'payment'->>'method' = 'upi'`))[0]![0])).toBeGreaterThanOrEqual(1);
    expect(Number((await rows(`SELECT count(*) FROM restaurants WHERE opening_hours->'sun' IS NULL`))[0]![0])).toBeGreaterThanOrEqual(1);
  });

  it('keeps order contents consistent: 1 to 4 dishes, matching totals, same restaurant', async () => {
    await engine.setup({ name: 'food', source });
    const dishCounts = await rows(`SELECT DISTINCT n FROM (SELECT count(*) AS n FROM order_items GROUP BY order_id) x ORDER BY n`);
    expect(dishCounts.map((r) => Number(r[0]))).toEqual([1, 2, 3, 4]);

    const ordersWithoutItems = await rows(`SELECT count(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)`);
    expect(Number(ordersWithoutItems[0]![0])).toBe(0);

    const badTotals = await rows(`SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN menu_items m ON m.id = oi.menu_item_id
      GROUP BY o.id, o.total
      HAVING o.total <> sum(oi.quantity * m.price)`);
    expect(badTotals).toEqual([]);

    const crossRestaurant = await rows(`SELECT oi.order_id, oi.menu_item_id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN menu_items m ON m.id = oi.menu_item_id
      WHERE m.restaurant_id <> o.restaurant_id`);
    expect(crossRestaurant).toEqual([]);
  });
});

