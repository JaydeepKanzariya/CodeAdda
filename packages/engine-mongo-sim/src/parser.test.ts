import { describe, expect, it } from 'vitest';
import { MongoParseError, parseMongosh } from './parser';

describe('parseMongosh', () => {
  it('parses a find with filter, projection and a cursor chain', () => {
    expect(parseMongosh(`db.movies.find({ year: { $gte: 2000 }, 'details.country': "Norway" }, { title: 1, _id: 0 }).sort({ year: -1 }).skip(2).limit(5);`)).toEqual({
      collection: 'movies', method: 'find',
      args: [{ year: { $gte: 2000 }, 'details.country': 'Norway' }, { title: 1, _id: 0 }],
      chain: [{ name: 'sort', args: [{ year: -1 }] }, { name: 'skip', args: [2] }, { name: 'limit', args: [5] }],
    });
  });

  it('accepts comments, trailing commas, negative/decimal numbers, escapes, null and booleans', () => {
    const c = parseMongosh(`// my query\ndb.users.insertOne({ name: 'O\\'Neil', score: -1.5e1, ok: true, gone: null, tags: ['a', 'b',], /* note */ })`);
    expect(c.args[0]).toEqual({ name: "O'Neil", score: -15, ok: true, gone: null, tags: ['a', 'b'] });
  });

  it('turns /regex/flags into a RegExp', () => {
    const f = parseMongosh('db.reviews.find({ comment: /twist/i })').args[0] as { comment: RegExp };
    expect(f.comment).toBeInstanceOf(RegExp);
    expect(f.comment.source).toBe('twist');
    expect(f.comment.flags).toBe('i');
  });

  it('parses every supported method', () => {
    for (const m of ['find', 'findOne', 'aggregate', 'countDocuments', 'distinct', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany']) {
      expect(parseMongosh(`db.c.${m}()`).method).toBe(m);
    }
  });

  it('rejects code, unknown methods and extra statements with a position', () => {
    for (const bad of ['db.c.find({ t: new Date() })', 'db.c.find({ f: function () {} })', 'db.c.find(x => x)', 'db.c.drop()', 'db.c.find(); db.c.find()', 'movies.find()', 'db.c.aggregate([]).sort({a:1})', 'db.c.find({ a: `x` })']) {
      expect(() => parseMongosh(bad), bad).toThrow(MongoParseError);
    }
    try { parseMongosh('db.c.find({ t: ISODate("2020") })'); } catch (e) {
      expect(e).toBeInstanceOf(MongoParseError);
      expect((e as MongoParseError).position).toBe(16);
      expect((e as Error).message).toMatch(/ISODate/);
    }
  });

  it('never lets a key reach the object prototype', () => {
    const o = parseMongosh('db.c.insertOne({ "__proto__": { polluted: 1 } })').args[0] as Record<string, unknown>;
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.keys(o)).toEqual(['__proto__']);
  });
});
