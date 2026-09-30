import { describe, expect, it } from 'vitest';
import { parseSteps } from './steps';

const good = `
tables:
  users:
    columns: [id, name, age]
    rows:
      - [1, Ana, 28]
      - [2, Ben, null]
steps:
  - label: A table
    caption: This is \`users\`.
  - label: A row
    caption: One row.
    highlight:
      - { table: users, row: 1, tone: focus }
      - { table: users, column: age, tone: kept }
      - { table: users, cell: [2, name], tone: removed }
    dim: [{ table: users, rows: [2] }]
    labels: { users: "users -- after" }
    notes:
      - { title: "2 rows", text: "Small table." }
`;

describe('parseSteps', () => {
  it('parses a valid script and fills defaults', () => {
    const s = parseSteps(good);
    if (typeof s === 'string') throw new Error(s);
    expect(s.tables.users!.rows[1]).toEqual([2, 'Ben', null]);
    expect(s.steps[0]!.highlight).toEqual([]);
    expect(s.steps[0]!.notes).toEqual([]);
    expect(s.steps[1]!.notes[0]!.tone).toBe('info');
    expect(s.steps[1]!.highlight).toHaveLength(3);
  });

  it.each([
    ['bad yaml', 'tables: [', /invalid YAML/],
    ['one step', good.replace(/  - label: A row[\s\S]*$/, ''), /at least 2 steps/],
    ['nine steps', good + Array.from({ length: 7 }, (_, i) => `  - label: Extra ${i + 1}\n    caption: More.\n`).join(''), /at most 8 steps/],
    ['unknown table in show', good.replace('caption: One row.', 'caption: One row.\n    show: [missing]'), /step 2: unknown table "missing"/],
    ['unknown table', good.replace('{ table: users, row: 1', '{ table: orders, row: 1'), /step 2: unknown table "orders"/],
    ['unknown column', good.replace('column: age', 'column: email'), /step 2: table "users" has no column "email"/],
    ['row out of range', good.replace('row: 1,', 'row: 9,'), /step 2: table "users" has no row 9/],
    ['cell row out of range', good.replace('cell: [2, name]', 'cell: [3, name]'), /has no row 3/],
    ['dim row out of range', good.replace('rows: [2] }', 'rows: [5] }'), /has no row 5/],
    ['ragged row', good.replace('[2, Ben, null]', '[2, Ben]'), /table "users" row 2 has 2 values but 3 columns/],
    ['unknown label table', good.replace('labels: { users:', 'labels: { orders:'), /unknown table "orders"/],
    ['bad tone', good.replace('tone: focus', 'tone: loud'), /tone/],
    ['highlight with row and column', good.replace('{ table: users, row: 1,', '{ table: users, column: id, row: 1,'), /exactly one of row, column or cell/],
    ['highlight with no target', good.replace('{ table: users, row: 1, tone: focus }', '{ table: users, tone: focus }'), /exactly one of row, column or cell/],
    ['unknown key', good.replace('label: A table', 'label: A table\n    colour: red'), /colour|Unrecognized/],
  ])('rejects %s', (_name, text, message) => {
    const r = parseSteps(text);
    expect(typeof r).toBe('string');
    expect(r as string).toMatch(message);
  });
});
