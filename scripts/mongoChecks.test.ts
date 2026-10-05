import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { grade, resolveDataset } from '@codeadda/core';
import { loadLabFromDir } from '@codeadda/content-loader/node';
import { MongoSimEngine } from '@codeadda/engine-mongo-sim';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/mongodb'));
const lessons = lab.lessons.flatMap((c) => c.items);
const problems = lab.problems.flatMap((c) => c.items);
const items = [...lessons, ...problems];
const byId = (id: string) => {
  const l = items.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson or problem ${id}`);
  return l;
};

describe('MongoDB lab answer checks', () => {
  const engine = new MongoSimEngine();
  afterAll(() => engine.dispose());
  const check = (id: string, query: string) => grade(engine, byId(id), resolveDataset(lab, byId(id)), query);

  it('never passes a no-op for any state or custom lesson or problem', async () => {
    const graded = items.filter((l) => l.check === 'state' || l.check === 'custom');
    // 9 state lessons (insert-one, insert-many, custom-id, set-unset, delete, update-nested, push-addtoset, pull, positional) + mark-long-views.
    expect(graded).toHaveLength(10);
    expect(graded.map((l) => l.id)).toContain('mark-long-views');
    const passedLimit: string[] = [];
    const passedCount: string[] = [];
    for (const l of graded) {
      if ((await grade(engine, l, resolveDataset(lab, l), 'db.movies.find({}).limit(0)')).pass) passedLimit.push(l.id);
      if ((await grade(engine, l, resolveDataset(lab, l), 'db.users.countDocuments()')).pass) passedCount.push(l.id);
    }
    expect(passedLimit).toEqual([]);
    expect(passedCount).toEqual([]);
  });

  it('accepts reordered projection answers', async () => {
    const res = await check('projection', 'db.movies.find({}, { year: 1, title: 1, _id: 0 })');
    expect(res.pass).toBe(true);
  });

  it('accepts group answers regardless of field order', async () => {
    const res = await check('group', 'db.users.aggregate([{ $group: { count: { $sum: 1 }, _id: "$plan" } }])');
    expect(res.pass).toBe(true);
  });

  it('accepts set-unset answers with $unset before $set', async () => {
    const res = await check('set-unset', 'db.users.updateOne({ _id: 102 }, { $unset: { "preferences.max_rating": "" }, $set: { plan: "premium" } })');
    expect(res.pass).toBe(true);
  });

  it('accepts insertOne with the solution field order and with a different order', async () => {
    const same = await check('insert-one', 'db.users.insertOne({ name: "Fatima Zahra", email: "fatima@example.com", plan: "basic", joined_on: "2026-01-15" })');
    expect(same.pass).toBe(true);
    const reordered = await check('insert-one', 'db.users.insertOne({ email: "fatima@example.com", name: "Fatima Zahra", joined_on: "2026-01-15", plan: "basic" })');
    expect(reordered.pass).toBe(true);
  });

  it('films-per-decade accepts a computed decade and a $bucket answer, oldest first only', async () => {
    const computed = await check('films-per-decade', "db.movies.aggregate([{ $group: { _id: { $subtract: ['$year', { $mod: ['$year', 10] }] }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }])");
    expect(computed.pass).toBe(true);
    const bucket = await check('films-per-decade', "db.movies.aggregate([{ $bucket: { groupBy: '$year', boundaries: [1990, 2000, 2010, 2020, 2030], output: { count: { $sum: 1 } } } }])");
    expect(bucket.pass).toBe(true);
    const descending = await check('films-per-decade', "db.movies.aggregate([{ $group: { _id: { $subtract: ['$year', { $mod: ['$year', 10] }] }, count: { $sum: 1 } } }, { $sort: { _id: -1 } }])");
    expect(descending.pass).toBe(false);
    const offByOne = await check('films-per-decade', "db.movies.aggregate([{ $bucket: { groupBy: '$year', boundaries: [1991, 2001, 2011, 2021, 2031], output: { count: { $sum: 1 } } } }])");
    expect(offByOne.pass).toBe(false);
  });

  it('genre-scorecard accepts swapped accumulators but needs rounding and the name tie-break', async () => {
    const swapped = await check('genre-scorecard', "db.movies.aggregate([{ $unwind: '$genres' }, { $group: { _id: '$genres', avg_runtime: { $avg: '$runtime' }, film_count: { $sum: 1 } } }, { $project: { film_count: 1, avg_runtime: { $round: ['$avg_runtime', 1] } } }, { $sort: { film_count: -1, _id: 1 } }])");
    expect(swapped.pass).toBe(true);
    const unrounded = await check('genre-scorecard', "db.movies.aggregate([{ $unwind: '$genres' }, { $group: { _id: '$genres', film_count: { $sum: 1 }, avg_runtime: { $avg: '$runtime' } } }, { $sort: { film_count: -1, _id: 1 } }])");
    expect(unrounded.pass).toBe(false);
    const noTieBreak = await check('genre-scorecard', "db.movies.aggregate([{ $unwind: '$genres' }, { $group: { _id: '$genres', film_count: { $sum: 1 }, avg_runtime: { $avg: '$runtime' } } }, { $set: { avg_runtime: { $round: ['$avg_runtime', 1] } } }, { $sort: { film_count: -1 } }])");
    expect(noTieBreak.pass).toBe(false);
  });

  it('find-cast-member rejects matching actor and role in different cast entries', async () => {
    const loose = await check('find-cast-member', "db.movies.find({ 'cast.actor': 'Lucas Bernard', 'cast.role': 'Lead Pilot' }, { _id: 0, title: 1, cast: 1 })");
    expect(loose.pass).toBe(false);
  });

  it('binge-leaderboard counts completed views only and accepts a lookup-first answer', async () => {
    const allViews = await check('binge-leaderboard', "db.watch_history.aggregate([{ $group: { _id: '$user_id', total_mins: { $sum: '$duration_mins' } } }, { $sort: { total_mins: -1 } }, { $limit: 3 }, { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } }, { $project: { _id: 0, name: { $arrayElemAt: ['$u.name', 0] }, total_mins: 1 } }])");
    expect(allViews.pass).toBe(false);
    const lookupFirst = await check('binge-leaderboard', "db.watch_history.aggregate([{ $match: { completed: true } }, { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'u' } }, { $unwind: '$u' }, { $group: { _id: '$u.name', total_mins: { $sum: '$duration_mins' } } }, { $project: { _id: 0, total_mins: 1, name: '$_id' } }, { $sort: { total_mins: -1 } }, { $limit: 3 }])");
    expect(lookupFirst.pass).toBe(true);
  });

  it('reviewer-summary needs the name tie-break', async () => {
    const noTieBreak = await check('reviewer-summary', "db.users.aggregate([{ $lookup: { from: 'reviews', localField: '_id', foreignField: 'user_id', as: 'r' } }, { $project: { _id: 0, name: 1, review_count: { $size: '$r' }, avg_rating: { $round: [{ $avg: '$r.rating' }, 1] } } }, { $sort: { review_count: -1 } }])");
    expect(noTieBreak.pass).toBe(false);
  });
});
