import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { grade, type LessonItem, type QueryResult, type QuerySuccess } from '@codeadda/core';
import { PgliteEngine } from './PgliteEngine';

const dataset = {
  name: 'teams',
  source: `
    CREATE TABLE teams (id SERIAL PRIMARY KEY, name TEXT NOT NULL);
    COMMENT ON TABLE teams IS 'Teams in the league';
    CREATE TABLE players (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id),
      name TEXT,
      joined DATE,
      salary NUMERIC(10,2)
    );
    INSERT INTO teams (name) VALUES ('Red'), ('Blue');
    INSERT INTO players (team_id, name, joined, salary) VALUES
      (1, 'Ana', '2024-01-05', 95000.00),
      (2, 'Ben', '2023-12-31', 70000.50),
      (NULL, 'Cy', NULL, NULL);
  `,
};

function success(r: QueryResult): QuerySuccess {
  if (!r.ok) throw new Error(`expected success, got: ${r.error.message}`);
  return r;
}

describe('PgliteEngine', () => {
  const engine = new PgliteEngine();
  beforeAll(async () => { await engine.setup(dataset); });
  beforeEach(async () => { await engine.reset(); });
  afterAll(async () => { await engine.dispose(); });

  it('returns columns and array rows', async () => {
    const r = success(await engine.run('SELECT id, name FROM teams ORDER BY id'));
    expect(r.columns).toEqual(['id', 'name']);
    expect(r.rows).toEqual([[1, 'Red'], [2, 'Blue']]);
    expect(r.rowCount).toBe(2);
  });

  it('keeps duplicate column names', async () => {
    const r = success(await engine.run('SELECT p.id, t.id FROM players p JOIN teams t ON t.id = p.team_id ORDER BY p.id'));
    expect(r.columns).toEqual(['id', 'id']);
    expect(r.rows).toEqual([[1, 1], [2, 2]]);
  });

  it('returns DATE and NUMERIC as Postgres text and COUNT as a number', async () => {
    const r = success(await engine.run("SELECT joined, salary FROM players WHERE name = 'Ana'"));
    expect(r.rows).toEqual([['2024-01-05', '95000.00']]);
    const c = success(await engine.run('SELECT count(*) AS n FROM players'));
    expect(c.rows).toEqual([[3]]);
  });

  it('returns the last result of a multi-statement query', async () => {
    const r = success(await engine.run("INSERT INTO teams (name) VALUES ('Green'); SELECT name FROM teams ORDER BY id;"));
    expect(r.rows).toEqual([['Red'], ['Blue'], ['Green']]);
  });

  it('reports affected rows for statements without results', async () => {
    const r = success(await engine.run('UPDATE players SET salary = 1 WHERE team_id = 1'));
    expect(r.columns).toEqual([]);
    expect(r.notice).toBe('Query OK. 1 row(s) affected.');
  });

  it('returns errors with message and position', async () => {
    const r = await engine.run('SELECT * FORM teams');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).toMatch(/syntax error/);
    expect(r.error.position).toBeGreaterThan(0);
  });

  it('rejects empty and comment-only queries', async () => {
    for (const q of ['', '   ', '-- just a comment\n', '/* note */']) {
      expect(await engine.run(q)).toEqual({ ok: false, error: { message: 'Please enter a SQL query.' } });
    }
  });

  it('reset restores the dataset after DROP TABLE', async () => {
    success(await engine.run('DROP TABLE players'));
    await engine.reset();
    expect(success(await engine.run('SELECT count(*) FROM players')).rows).toEqual([[3]]);
  });

  it('recovers from an open, aborted transaction on reset', async () => {
    await engine.run('BEGIN');
    await engine.run('SELECT 1/0');
    await engine.reset();
    expect(success(await engine.run('SELECT count(*) FROM teams')).rows).toEqual([[2]]);
  });

  it('reset recovers after the learner changes search_path', async () => {
    success(await engine.run('SET search_path TO nowhere'));
    await engine.reset();
    expect(success(await engine.run('SELECT count(*) FROM teams')).rows).toEqual([[2]]);
  });

  it('reset drops temp tables that shadow lesson tables', async () => {
    success(await engine.run('CREATE TEMP TABLE teams AS SELECT 1 AS x'));
    await engine.reset();
    expect(success(await engine.run('SELECT count(*) FROM teams')).rows).toEqual([[2]]);
  });

  it('reset restores session settings such as DateStyle', async () => {
    success(await engine.run("SET datestyle = 'SQL, DMY'"));
    await engine.reset();
    expect(success(await engine.run("SELECT joined::text FROM players WHERE name = 'Ana'")).rows).toEqual([['2024-01-05']]);
  });

  it('reset drops schemas the learner created', async () => {
    success(await engine.run('CREATE SCHEMA scratch; CREATE TABLE scratch.t (n int)'));
    await engine.reset();
    expect(success(await engine.run("SELECT count(*) FROM information_schema.schemata WHERE schema_name = 'scratch'")).rows).toEqual([[0]]);
  });

  it('describes tables, keys, comments, row counts and relationships', async () => {
    const s = await engine.describe();
    expect(s.tables.map((t) => t.name)).toEqual(['teams', 'players']);
    const teams = s.tables[0]!;
    expect(teams).toMatchObject({ description: 'Teams in the league', rowCount: 2, sampleQuery: 'SELECT * FROM teams LIMIT 5;' });
    const players = s.tables[1]!;
    expect(players.columns.find((c) => c.name === 'id')).toMatchObject({ isPrimary: true, nullable: false });
    expect(players.columns.find((c) => c.name === 'team_id')).toMatchObject({ isForeign: true, references: 'teams(id)' });
    expect(players.columns.find((c) => c.name === 'salary')?.type).toBe('numeric(10,2)');
    expect(s.relationships).toEqual([{ from: 'players', column: 'team_id', to: 'teams', toColumn: 'id', kind: 'many-to-one' }]);
  });
});

describe('PgliteEngine start-up failure', () => {
  it('does not cache a failed start, so a later setup can recover', async () => {
    const spy = vi.spyOn(PGlite, 'create').mockRejectedValueOnce(new Error('boom'));
    const engine = new PgliteEngine();
    try {
      await expect(engine.setup(dataset)).rejects.toThrow('boom');
      await engine.setup(dataset);
      expect(success(await engine.run('SELECT count(*) FROM teams')).rows).toEqual([[2]]);
    } finally {
      spy.mockRestore();
      await engine.dispose();
    }
  });
});

describe('PgliteEngine overlapping setup', () => {
  it('serialises overlapping setup() calls and ends on the last dataset', async () => {
    const engine = new PgliteEngine();
    const second = {
      name: 'shop',
      source: `CREATE TABLE products (id SERIAL PRIMARY KEY, name TEXT);
               INSERT INTO products (name) VALUES ('Pen'), ('Ink'), ('Pad');`,
    };
    try {
      // The second call starts while the first is still booting PGlite (e.g. switching problem).
      const results = await Promise.allSettled([engine.setup(dataset), engine.setup(second)]);
      expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
      expect(success(await engine.run('SELECT count(*) FROM products')).rows).toEqual([[3]]);
      const teams = await engine.run('SELECT 1 FROM teams');
      expect(teams.ok).toBe(false);
      // A later reset() keeps the latest dataset.
      await engine.reset();
      expect(success(await engine.run('SELECT count(*) FROM products')).rows).toEqual([[3]]);
    } finally {
      await engine.dispose();
    }
  });
});

describe('grade() on a PgliteEngine', () => {
  it('keeps working after a learner query changes search_path', async () => {
    const grader = new PgliteEngine();
    const lesson: LessonItem = {
      kind: 'lesson', id: 'demo', title: 'Demo', chapter: 'Basics', order: 1, dataset: 'teams',
      check: 'rows-unordered', body: '', task: 'List teams', hints: [], path: 'x.md',
      solution: 'SELECT name FROM teams',
    };
    try {
      const first = await grade(grader, lesson, dataset, 'SET search_path TO nowhere; SELECT 1');
      expect(first.pass).toBe(false);
      const second = await grade(grader, lesson, dataset, 'SELECT name FROM teams');
      expect(second.pass).toBe(true);
    } finally {
      await grader.dispose();
    }
  });
});
