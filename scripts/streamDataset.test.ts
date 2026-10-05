import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MongoSimEngine } from '@codeadda/engine-mongo-sim';

describe('stream dataset (Reelhouse)', () => {
  const path = resolve(import.meta.dirname, '../content/mongodb/datasets/stream.json');
  let data = '';
  try {
    data = readFileSync(path, 'utf8');
  } catch {
    data = '';
  }

  it('loads valid JSON with 4 collections and descriptions', async () => {
    expect(data, 'stream.json should exist and be non-empty').not.toBe('');
    const engine = new MongoSimEngine();
    await engine.setup({ name: 'stream', source: data });
    const schema = await engine.describe();
    expect(schema.tables.map((t) => t.name)).toEqual(['movies', 'reviews', 'users', 'watch_history']);
    for (const t of schema.tables) {
      expect(t.description, `Description for ${t.name}`).toBeTruthy();
    }
  });

  it('matches exact document counts and id ranges', () => {
    const parsed = JSON.parse(data);
    expect(parsed.movies).toHaveLength(20);
    expect(parsed.users).toHaveLength(12);
    expect(parsed.reviews).toHaveLength(25);
    expect(parsed.watch_history).toHaveLength(36);

    expect(parsed.movies.map((m: { _id: number }) => m._id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(parsed.users.map((u: { _id: number }) => u._id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 101));
    expect(parsed.reviews.map((r: { _id: number }) => r._id)).toEqual(Array.from({ length: 25 }, (_, i) => i + 501));
    expect(parsed.watch_history.map((w: { _id: number }) => w._id)).toEqual(Array.from({ length: 36 }, (_, i) => i + 901));
  });

  it('satisfies all spec facts', () => {
    const parsed = JSON.parse(data);
    const movies = parsed.movies;
    const users = parsed.users;
    const reviews = parsed.reviews;
    const watch = parsed.watch_history;

    // ratings.critics missing on exactly 2 films
    const missingCritics = movies.filter((m: { ratings?: { critics?: unknown } }) => m.ratings?.critics === undefined);
    expect(missingCritics).toHaveLength(2);

    // films in exactly 2000 and 2010 exist
    expect(movies.some((m: { year: number }) => m.year === 2000)).toBe(true);
    expect(movies.some((m: { year: number }) => m.year === 2010)).toBe(true);

    // >= 3 films under 100 min
    const under100 = movies.filter((m: { runtime: number }) => m.runtime < 100);
    expect(under100.length).toBeGreaterThanOrEqual(3);

    // >= 2 films with both Action and Adventure
    const actionAdv = movies.filter((m: { genres: string[] }) => m.genres.includes('Action') && m.genres.includes('Adventure'));
    expect(actionAdv.length).toBeGreaterThanOrEqual(2);

    // an actor in exactly 3 films
    const actorCounts = new Map<string, number>();
    for (const m of movies) {
      for (const c of (m.cast ?? []) as { actor: string }[]) {
        actorCounts.set(c.actor, (actorCounts.get(c.actor) ?? 0) + 1);
      }
    }
    expect([...actorCounts.values()]).toContain(3);

    // a director with exactly 3 films
    const directorCounts = new Map<string, number>();
    for (const m of movies) {
      const d = (m.details as { director?: string } | undefined)?.director;
      if (d) directorCounts.set(d, (directorCounts.get(d) ?? 0) + 1);
    }
    expect([...directorCounts.values()]).toContain(3);

    // >= 3 films with no reviews
    const reviewedMovieIds = new Set(reviews.map((r: { movie_id: number }) => r.movie_id));
    const unreviewed = movies.filter((m: { _id: number }) => !reviewedMovieIds.has(m._id));
    expect(unreviewed.length).toBeGreaterThanOrEqual(3);

    // review comments containing "twist" and "slow" in mixed case: a case-sensitive lowercase match
    // and a non-lowercase match must both exist, so the case-insensitive $regex option matters
    const comments = reviews.map((r: { comment: string }) => r.comment);
    for (const word of ['twist', 'slow']) {
      expect(comments.some((c: string) => c.includes(word)), `lowercase "${word}"`).toBe(true);
      expect(
        comments.some((c: string) => new RegExp(word, 'i').test(c) && !c.includes(word)),
        `non-lowercase "${word}"`,
      ).toBe(true);
    }

    // some films are tagged and some are not
    const tagged = movies.filter((m: { tags?: unknown[] }) => Array.isArray(m.tags) && m.tags.length > 0);
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.length).toBeLessThan(20);

    // value ranges
    const years = movies.map((m: { year: number }) => m.year);
    expect(Math.min(...years)).toBe(1994);
    expect(Math.max(...years)).toBe(2024);
    const critics = movies
      .map((m: { ratings: { critics?: number } }) => m.ratings.critics)
      .filter((c: number | undefined): c is number => c !== undefined);
    for (const c of critics) expect(c >= 0 && c <= 100, `critics ${c}`).toBe(true);
    expect(new Set(critics).size, 'no ties in critics scores').toBe(critics.length);
    for (const m of movies as { _id: number; ratings: { audience: number } }[]) {
      expect(m.ratings.audience >= 0 && m.ratings.audience <= 10, `movie ${m._id} audience`).toBe(true);
    }
    for (const r of reviews as { _id: number; rating: number }[]) {
      expect(r.rating >= 1 && r.rating <= 10, `review ${r._id} rating`).toBe(true);
    }
    for (const u of users as { _id: number; plan: string }[]) {
      expect(['free', 'basic', 'premium'], `user ${u._id} plan`).toContain(u.plan);
    }

    // retired director name is gone
    expect(data).not.toContain('Maya Lin');

    // user 101 has incomplete views over 120 min
    const u101LongIncomplete = watch.filter((w: { user_id: number; completed: boolean; duration_mins: number }) => w.user_id === 101 && !w.completed && w.duration_mins > 120);
    expect(u101LongIncomplete.length).toBeGreaterThanOrEqual(1);

    // one user without preferences
    const noPrefs = users.filter((u: { preferences?: unknown }) => u.preferences === undefined);
    expect(noPrefs).toHaveLength(1);

    // foreign key references validity
    const movieIds = new Set(movies.map((m: { _id: number }) => m._id));
    const userIds = new Set(users.map((u: { _id: number }) => u._id));
    for (const r of reviews as { _id: number; movie_id: number; user_id: number }[]) {
      expect(movieIds.has(r.movie_id), `review ${r._id} movie_id`).toBe(true);
      expect(userIds.has(r.user_id), `review ${r._id} user_id`).toBe(true);
    }
    for (const w of watch as { _id: number; movie_id: number; user_id: number }[]) {
      expect(movieIds.has(w.movie_id), `watch ${w._id} movie_id`).toBe(true);
      expect(userIds.has(w.user_id), `watch ${w._id} user_id`).toBe(true);
    }

    // no real film titles
    const blocked = ['Inception', 'Titanic', 'Avatar', 'The Matrix', 'Interstellar'];
    for (const m of movies as { title: string }[]) {
      expect(blocked).not.toContain(m.title);
    }

    // no ties in top sorted audience ratings
    const sortedAudience = [...movies].sort((a: any, b: any) => b.ratings.audience - a.ratings.audience);
    expect(sortedAudience[0].ratings.audience).toBeGreaterThan(sortedAudience[1].ratings.audience);
    expect(sortedAudience[1].ratings.audience).toBeGreaterThan(sortedAudience[2].ratings.audience);
  });
});
