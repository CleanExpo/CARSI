/**
 * Every course, module and lesson id in the seed catalogue and in the v1-draft staging
 * catalogues must be a UUID: lms_courses / lms_modules / lms_lessons.id are Postgres uuid
 * columns, so one non-UUID id (e.g. "<quizId>-lesson") makes `db:seed-courses` fail for the
 * whole course. Caught in CI's E2E seed on PR #1000; this test fails the build before that.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const root = process.cwd();

type Lesson = { id?: string };
type Module = { id?: string; lessons?: Lesson[] };
type Course = { slug: string; id?: string; modules?: Module[] };

export function nonUuidIds(courses: Course[]): string[] {
  const bad: string[] = [];
  for (const c of courses) {
    if (c.id && !UUID.test(c.id)) bad.push(`${c.slug} course ${c.id}`);
    for (const m of c.modules ?? []) {
      if (m.id && !UUID.test(m.id)) bad.push(`${c.slug} module ${m.id}`);
      for (const l of m.lessons ?? []) {
        if (l.id && !UUID.test(l.id)) bad.push(`${c.slug} lesson ${l.id}`);
      }
    }
  }
  return bad;
}

function catalogueFiles(): string[] {
  const files = [path.join(root, 'data/seed/courses-catalog.json')];
  const drafts = path.join(root, 'data/courses');
  for (const slug of readdirSync(drafts)) {
    const f = path.join(drafts, slug, 'v1-draft/courses-catalog.json');
    if (existsSync(f)) files.push(f);
  }
  return files;
}

describe('catalogue ids are UUIDs (Postgres uuid columns)', () => {
  it('flags a non-UUID lesson id (control)', () => {
    expect(
      nonUuidIds([
        {
          slug: 'x',
          id: '8874f437-a8ad-4c2c-bcdb-6dbf36c108a0',
          modules: [{ lessons: [{ id: '8874f437-a8ad-4c2c-bcdb-6dbf36c108a0-lesson' }] }],
        },
      ])
    ).toEqual(['x lesson 8874f437-a8ad-4c2c-bcdb-6dbf36c108a0-lesson']);
  });

  for (const file of catalogueFiles()) {
    it(path.relative(root, file), () => {
      const { courses } = JSON.parse(readFileSync(file, 'utf8')) as { courses: Course[] };
      expect(courses.length).toBeGreaterThan(0);
      expect(nonUuidIds(courses)).toEqual([]);
    });
  }
});
