import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { describeSchema, displayType } from './describe';

describe('displayType', () => {
  it('maps Postgres types to the display form', () => {
    expect(displayType('integer', true)).toBe('SERIAL');
    expect(displayType('bigint', true)).toBe('BIGSERIAL');
    expect(displayType('integer', false)).toBe('INTEGER');
    expect(displayType('character varying(100)', false)).toBe('VARCHAR(100)');
    expect(displayType('character(2)', false)).toBe('CHAR(2)');
    expect(displayType('numeric(10,2)', false)).toBe('DECIMAL(10,2)');
    expect(displayType('timestamp without time zone', false)).toBe('TIMESTAMP');
    expect(displayType('text', false)).toBe('TEXT');
  });
});

describe('describeSchema', () => {
  const db = new PGlite();
  beforeAll(async () => {
    await db.exec(`
      CREATE TABLE a (id SERIAL PRIMARY KEY, price NUMERIC(10,2), label VARCHAR(20));
      COMMENT ON COLUMN a.price IS 'Price in dollars';
      CREATE TABLE b (
        id SERIAL PRIMARY KEY,
        a_id INTEGER CONSTRAINT b_a_fk REFERENCES a(id),
        parent_id INTEGER REFERENCES b(id)
      );
      COMMENT ON CONSTRAINT b_a_fk ON b IS 'Each b belongs to one a';
    `);
  });
  afterAll(() => db.close());

  it('returns column descriptions and display types', async () => {
    const s = await describeSchema(db);
    const a = s.tables.find((t) => t.name === 'a')!;
    expect(a.columns.map((c) => c.displayType)).toEqual(['SERIAL', 'DECIMAL(10,2)', 'VARCHAR(20)']);
    expect(a.columns[1]!.description).toBe('Price in dollars');
    expect(a.columns[2]!.description).toBeUndefined();
  });

  it('returns relationship kinds and descriptions', async () => {
    const s = await describeSchema(db);
    expect(s.relationships).toEqual(
      expect.arrayContaining([
        { from: 'b', column: 'a_id', to: 'a', toColumn: 'id', kind: 'many-to-one', description: 'Each b belongs to one a' },
        { from: 'b', column: 'parent_id', to: 'b', toColumn: 'id', kind: 'self-reference', description: undefined },
      ]),
    );
  });
});
