import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

import { catalogueIdConflicts, type CatalogueCourseShape } from './catalogue-ids';

const course = (
  slug: string,
  mods: Array<[string, string[]]> = [],
  id = `id-${slug}`
): CatalogueCourseShape => ({
  id,
  slug,
  modules: mods.map(([mid, lessons]) => ({ id: mid, lessons: lessons.map((l) => ({ id: l })) })),
});

describe('catalogueIdConflicts', () => {
  it('passes a well-formed catalogue', () => {
    expect(
      catalogueIdConflicts([
        course('a', [['m1', ['l1', 'l2']]]),
        course('b', [['m2', ['l3']]]),
        course('c'),
      ])
    ).toEqual([]);
  });

  it('catches a module id shared by two courses — the half-applied-catalogue case', () => {
    // This is the measured failure: on a fresh database both plans pass, the first course
    // commits, and the second aborts on the in-transaction ownership check, leaving 79 of 80
    // courses written.
    const found = catalogueIdConflicts([
      course('a', [['shared', ['l1']]]),
      course('b', [['shared', ['l2']]]),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('module id shared');
    expect(found[0]).toContain('a');
    expect(found[0]).toContain('b');
  });

  it('catches a lesson id shared by two courses', () => {
    const found = catalogueIdConflicts([
      course('a', [['m1', ['shared']]]),
      course('b', [['m2', ['shared']]]),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('lesson id shared');
  });

  it('catches the same lesson listed under two modules of ONE course', () => {
    // Not a move: the catalogue is claiming the lesson twice at once, so the second upsert wins
    // silently and one of the two placements never lands.
    const found = catalogueIdConflicts([
      course('a', [
        ['m1', ['dup']],
        ['m2', ['dup']],
      ]),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('lesson id dup');
    expect(found[0]).toContain('module m1');
    expect(found[0]).toContain('module m2');
  });

  it('catches a duplicate course id and a duplicate slug separately', () => {
    expect(catalogueIdConflicts([course('a', [], 'same'), course('b', [], 'same')])).toEqual([
      'course id same is claimed by both a and b',
    ]);
    const dupSlug = catalogueIdConflicts([course('a', [], 'x1'), course('a', [], 'x2')]);
    expect(dupSlug).toEqual(['course slug "a" appears more than once']);
  });

  it('does not confuse a module id with a lesson id', () => {
    // Separate namespaces in the schema (lms_modules.id vs lms_lessons.id), so the same string
    // in both places is legal and must not be reported.
    expect(catalogueIdConflicts([course('a', [['x', ['x']]])])).toEqual([]);
  });

  it('tolerates courses with no modules and modules with no lessons', () => {
    expect(catalogueIdConflicts([{ id: 'i', slug: 'stub' }, course('b', [['m', []]])])).toEqual([]);
  });

  it('CONTROL: the real catalogue is conflict-free', () => {
    // A guard that only ever fires is useless. This also means a future catalogue edit that
    // introduces a duplicate id fails here, in the fast unit job, rather than part-way through a
    // seed run.
    const catalog = JSON.parse(readFileSync('data/seed/courses-catalog.json', 'utf8')) as {
      courses: CatalogueCourseShape[];
    };
    expect(catalogueIdConflicts(catalog.courses)).toEqual([]);
  });
});
