import { describe, expect, it } from 'vitest';
import { MongoSimEngine } from './MongoSimEngine';

const data = JSON.stringify({
  _meta: { descriptions: { movies: 'Films' } },
  movies: [
    { _id: 1, title: 'Ash Line', year: 2010, genres: ['Drama'], ratings: { critics: 80, audience: 7.5 } },
    { _id: 2, title: 'Blue Hour', year: 2000, genres: ['Drama', 'Mystery'], ratings: { audience: 6.1 } },
  ],
  reviews: [{ _id: 501, movie_id: 1, rating: 9 }],
});
const setup = async () => { const e = new MongoSimEngine(); await e.setup({ name: 'stream', source: data }); return e; };
const ok = (r: unknown) => { const x = r as { ok: boolean }; if (!x.ok) throw new Error(JSON.stringify(r)); return r as { columns: string[]; rows: unknown[][]; documents?: unknown[]; rowCount: number }; };

describe('MongoSimEngine', () => {
  it('finds with canonical columns (_id first, then A→Z) and returns documents', async () => {
    const r = ok(await (await setup()).run('db.movies.find({ year: { $gt: 2005 } }, { year: 1, title: 1 })'));
    expect(r.columns).toEqual(['_id', 'title', 'year']);
    expect(r.rows).toEqual([[1, 'Ash Line', 2010]]);
    expect(r.documents).toEqual([{ _id: 1, title: 'Ash Line', year: 2010 }]);
  });

  it('gives the same columns whatever order the projection or $group lists fields', async () => {
    const e = await setup();
    const a = ok(await e.run('db.movies.aggregate([{ $group: { _id: null, n: { $sum: 1 }, avg: { $avg: "$year" } } }])'));
    const b = ok(await e.run('db.movies.aggregate([{ $group: { _id: null, avg: { $avg: "$year" }, n: { $sum: 1 } } }])'));
    expect(a.columns).toEqual(['_id', 'avg', 'n']);
    expect(b).toMatchObject({ columns: a.columns, rows: a.rows });
  });

  it('applies sort → skip → limit whatever order they are written', async () => {
    const e = await setup();
    const a = ok(await e.run('db.movies.find().limit(1).sort({ year: 1 })'));
    expect(a.rows[0]![0]).toBe(2);
  });

  it('joins with $lookup across collections', async () => {
    const r = ok(await (await setup()).run('db.movies.aggregate([{ $lookup: { from: "reviews", localField: "_id", foreignField: "movie_id", as: "r" } }, { $project: { n: { $size: "$r" } } }])'));
    expect(r.rows).toEqual([[1, 1], [2, 0]]);
  });

  it('counts, and lists distinct values flattened and sorted', async () => {
    const e = await setup();
    expect(ok(await e.run('db.movies.countDocuments({ year: { $gte: 2000 } })'))).toMatchObject({ columns: ['count'], rows: [[2]] });
    expect(ok(await e.run('db.movies.distinct("genres")'))).toMatchObject({ columns: ['value'], rows: [['Drama'], ['Mystery']] });
  });

  it('inserts with deterministic ids, rejects duplicate ids, and resets', async () => {
    const e = await setup();
    expect(ok(await e.run('db.movies.insertOne({ title: "C" })')).rows[0]).toEqual([true, 3]);
    expect(ok(await e.run('db.movies.insertMany([{ title: "D" }, { _id: "x", title: "E" }])')).documents).toEqual([{ acknowledged: true, insertedCount: 2, insertedIds: [4, 'x'] }]);
    expect(await e.run('db.movies.insertOne({ _id: 1, title: "dup" })')).toMatchObject({ ok: false, error: { message: expect.stringMatching(/E11000 duplicate key/) } });
    await e.reset();
    expect(ok(await e.run('db.movies.countDocuments()')).rows).toEqual([[2]]);
    const fresh = await setup();
    expect(ok(await fresh.run('db.movies.insertOne({ title: "C" })')).rows[0]).toEqual([true, 3]);
  });

  it('updates (incl. positional $), replaces and deletes', async () => {
    const e = await setup();
    expect(ok(await e.run('db.movies.updateMany({}, { $inc: { year: 1 }, $push: { genres: "New" } })')).documents).toEqual([{ acknowledged: true, matchedCount: 2, modifiedCount: 2 }]);
    await e.run('db.movies.updateOne({ genres: "Mystery" }, { $set: { "genres.$": "Noir" } })');
    expect(ok(await e.run('db.movies.findOne({ _id: 2 })')).documents![0]).toMatchObject({ year: 2001, genres: ['Drama', 'Noir', 'New'] });
    await e.run('db.movies.replaceOne({ _id: 1 }, { title: "Only" })');
    expect(ok(await e.run('db.movies.findOne({ _id: 1 })')).documents![0]).toEqual({ _id: 1, title: 'Only' });
    expect(ok(await e.run('db.movies.deleteMany({ year: { $gt: 2000 } })')).documents).toEqual([{ acknowledged: true, deletedCount: 1 }]);
  });

  it('blocks code execution, pipeline writes, upserts and replacement-style updates with clear messages', async () => {
    const e = await setup();
    for (const q of [
      'db.movies.find({ $where: "1" })',
      'db.movies.aggregate([{ $out: "x" }])',
      'db.movies.aggregate([{ $merge: { into: "x" } }])',
      'db.movies.aggregate([{ $group: { _id: null, f: { $accumulator: {} } } }])',
      'db.movies.updateOne({}, { $set: { a: 1 } }, { upsert: true })',
      'db.movies.updateOne({}, [{ $set: { a: 1 } }])',
      'db.movies.updateOne({}, { title: "x" })',
    ]) {
      const r = await e.run(q);
      expect(r.ok, q).toBe(false);
    }
  });

  it('rejects reserved field paths so nothing can reach Object.prototype', async () => {
    const e = await setup();
    for (const q of [
      'db.movies.updateOne({ _id: 1 }, { $set: { "constructor.prototype.polluted": 1 } })',
      'db.movies.updateOne({ _id: 1 }, { $push: { "a.constructor.prototype.polluted": 1 } })',
      'db.movies.aggregate([{ $addFields: { "constructor.prototype.polluted": 1 } }])',
      'db.movies.aggregate([{ $project: { x: "$constructor.prototype" } }])',
      'db.movies.insertOne({ __proto__: { polluted: 1 } })',
      'db.movies.find({}, { constructor: 1 })',
    ]) {
      expect(await e.run(q), q).toMatchObject({ ok: false, error: { message: expect.stringMatching(/reserved/) } });
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(ok(await e.run('db.movies.find({}, { title: 1 })')).rowCount).toBe(2);
  });

  it('supports arrayFilters with the filtered positional operator', async () => {
    const e = await setup();
    await e.run('db.movies.updateOne({ _id: 2 }, { $set: { "genres.$[g]": "Noir" } }, { arrayFilters: [{ g: "Mystery" }] })');
    expect(ok(await e.run('db.movies.findOne({ _id: 2 })')).documents![0]).toMatchObject({ genres: ['Drama', 'Noir'] });
  });

  it('joins on localField/foreignField and a pipeline together (concise $lookup form)', async () => {
    const e = await setup();
    await e.run('db.reviews.insertMany([{ movie_id: 2, rating: 7 }, { movie_id: 2, rating: 2 }, { movie_id: 1, rating: 3 }])');
    const r = ok(await e.run('db.movies.aggregate([{ $lookup: { from: "reviews", localField: "_id", foreignField: "movie_id", pipeline: [{ $match: { rating: { $gte: 5 } } }], as: "r" } }, { $project: { n: { $size: "$r" } } }])'));
    expect(r.rows).toEqual([[1, 1], [2, 1]]);
  });

  it('rejects an empty update document, like MongoDB', async () => {
    expect(await (await setup()).run('db.movies.updateMany({}, {})')).toMatchObject({ ok: false });
  });

  it('reports parser errors with a position', async () => {
    expect(await (await setup()).run('db.movies.find({ t: new Date() })')).toMatchObject({ ok: false, error: { position: 21 } });
  });

  it('describes collections for the schema panel', async () => {
    const s = await (await setup()).describe();
    const movies = s.tables.find((t) => t.name === 'movies')!;
    expect(movies).toMatchObject({ rowCount: 2, description: 'Films', sampleQuery: 'db.movies.find().limit(3)' });
    expect(movies.columns.find((c) => c.name === '_id')).toMatchObject({ type: 'number', isPrimary: true });
    expect(movies.columns.find((c) => c.name === 'genres')).toMatchObject({ type: 'array', nullable: false });
    expect(s.tables.map((t) => t.name)).toEqual(['movies', 'reviews']);
    expect(s.relationships).toEqual([]);
  });

  it('snapshot reads like run; a missing collection reads as empty', async () => {
    const e = await setup();
    expect(ok(await e.snapshot('db.nothing.find()'))).toMatchObject({ rows: [], rowCount: 0 });
  });
});
