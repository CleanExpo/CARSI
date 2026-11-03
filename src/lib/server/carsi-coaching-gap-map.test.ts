/**
 * GP-633 follow-up: the gap-to-course map is coach-editable.
 *
 * Stored in the existing `lms_learning_pathways` / `lms_learning_pathway_courses` tables as
 * UNPUBLISHED rows with a reserved slug, so no migration is needed and the public pathway pages
 * (which all filter `is_published = true`) never show them. No row for an area means the
 * built-in default applies; a row with no courses means the coach chose to prescribe nothing.
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_COACHING_CHAPTER_SLUG } from '@/lib/coaching-portal/coach-routing';
import {
  DEFAULT_GAP_COURSE_MAP,
  GAP_MAP_SLUG_PREFIX,
  gapMapPathwaySlug,
  learningGoalId,
  parseGapMapPathwaySlug,
  type LearningCatalogueCourse,
} from '@/lib/coaching-portal/learning-path';
import {
  GapMapValidationError,
  getGapMapView,
  loadGapCourseMap,
  resetGapMapEntry,
  saveGapMapEntry,
  type GapMapStore,
} from '@/lib/server/carsi-coaching-gap-map';
import { assignLearningPathFromAssessment } from '@/lib/server/carsi-coaching-learning-path';
import {
  C_ADMIN,
  C_ESTIMATING,
  C_SOCIAL,
  C_WD_MKT,
  CATALOGUE,
  MARKETING_GAP_ASSESSMENT,
  USER,
  fakeStore,
} from '@/lib/server/carsi-coaching-learning-path.fixtures';

const CH = DEFAULT_COACHING_CHAPTER_SLUG;
const C_DRAFT_COURSE = 'aaaaaaaa-0000-4000-8000-0000000000dd';

type Row = {
  slug: string;
  title: string;
  isPublished: boolean;
  iicrcDiscipline: string | null;
  courseIds: string[];
};

function fakeMapStore(catalogue: LearningCatalogueCourse[] = CATALOGUE) {
  const rows = new Map<string, Row>();
  const writes: string[] = [];
  const store: GapMapStore = {
    async listOverrides() {
      return [...rows.values()].map((r) => ({
        slug: r.slug,
        courses: r.courseIds
          .map((id) => catalogue.find((c) => c.id === id))
          .filter((c): c is LearningCatalogueCourse => Boolean(c)),
      }));
    },
    async publishedCoursesByIds(ids) {
      return catalogue.filter((c) => ids.includes(c.id));
    },
    async publishedCoursesBySlugs(slugs) {
      return catalogue.filter((c) => slugs.includes(c.slug));
    },
    async publishedCatalogue() {
      return [...catalogue];
    },
    async replaceOverride(input) {
      writes.push(`replace:${input.slug}:${input.courseIds.join(',')}`);
      rows.set(input.slug, {
        slug: input.slug,
        title: input.title,
        isPublished: false,
        iicrcDiscipline: null,
        courseIds: [...input.courseIds],
      });
    },
    async deleteOverride(slug) {
      writes.push(`delete:${slug}`);
      rows.delete(slug);
    },
  };
  return { store, rows, writes };
}

describe('gap map slugs', () => {
  it('round-trips chapter and area through the reserved slug', () => {
    const slug = gapMapPathwaySlug(CH, 'marketing');
    expect(slug.startsWith(GAP_MAP_SLUG_PREFIX)).toBe(true);
    expect(parseGapMapPathwaySlug(slug)).toEqual({ chapterSlug: CH, area: 'marketing' });
  });

  it('ignores ordinary pathway slugs and unknown areas', () => {
    expect(parseGapMapPathwaySlug('water-restoration-pathway')).toBeNull();
    expect(parseGapMapPathwaySlug(`${GAP_MAP_SLUG_PREFIX}${CH}--astrology`)).toBeNull();
  });
});

describe('loadGapCourseMap', () => {
  it('with no coach edits it is the built-in default', async () => {
    const { store } = fakeMapStore();
    expect(await loadGapCourseMap(store)).toEqual(DEFAULT_GAP_COURSE_MAP);
  });

  it('a coach edit replaces that one area and leaves the rest on the default', async () => {
    const { store } = fakeMapStore();
    await saveGapMapEntry({ chapterSlug: CH, area: 'marketing', courseIds: [C_ADMIN] }, store);
    const map = await loadGapCourseMap(store);
    expect(map[CH].marketing).toEqual(['admin-sole-trader']);
    expect(map[CH].sales).toEqual(DEFAULT_GAP_COURSE_MAP[CH].sales);
  });

  it('an emptied area prescribes nothing (not the default)', async () => {
    const { store } = fakeMapStore();
    await saveGapMapEntry({ chapterSlug: CH, area: 'marketing', courseIds: [] }, store);
    expect((await loadGapCourseMap(store))[CH].marketing).toEqual([]);
  });

  it('reset removes the coach edit and the default applies again', async () => {
    const { store, rows } = fakeMapStore();
    await saveGapMapEntry({ chapterSlug: CH, area: 'marketing', courseIds: [C_ADMIN] }, store);
    await resetGapMapEntry({ chapterSlug: CH, area: 'marketing' }, store);
    expect(rows.size).toBe(0);
    expect((await loadGapCourseMap(store))[CH].marketing).toEqual(
      DEFAULT_GAP_COURSE_MAP[CH].marketing
    );
  });

  it('does not mutate the built-in default', async () => {
    const before = JSON.stringify(DEFAULT_GAP_COURSE_MAP);
    const { store } = fakeMapStore();
    await saveGapMapEntry({ chapterSlug: CH, area: 'sales', courseIds: [C_ADMIN] }, store);
    await loadGapCourseMap(store);
    expect(JSON.stringify(DEFAULT_GAP_COURSE_MAP)).toBe(before);
  });
});

describe('saveGapMapEntry validation (fails closed, writes nothing)', () => {
  const cases: Array<[string, Parameters<typeof saveGapMapEntry>[0]]> = [
    ['an unknown area', { chapterSlug: CH, area: 'astrology' as never, courseIds: [C_ADMIN] }],
    ['an unknown chapter', { chapterSlug: 'no-such-chapter', area: 'sales', courseIds: [] }],
    [
      'a course that is not published',
      { chapterSlug: CH, area: 'sales', courseIds: [C_DRAFT_COURSE] },
    ],
    ['the same course twice', { chapterSlug: CH, area: 'sales', courseIds: [C_ADMIN, C_ADMIN] }],
    [
      'more than eight courses',
      { chapterSlug: CH, area: 'sales', courseIds: Array.from({ length: 9 }, () => C_ADMIN) },
    ],
  ];
  for (const [name, input] of cases) {
    it(`refuses ${name}`, async () => {
      const { store, writes } = fakeMapStore();
      await expect(saveGapMapEntry(input, store)).rejects.toBeInstanceOf(GapMapValidationError);
      expect(writes).toEqual([]);
    });
  }

  it('stores the edit as an unpublished pathway with no IICRC discipline, in coach order', async () => {
    const { store, rows } = fakeMapStore();
    await saveGapMapEntry(
      { chapterSlug: CH, area: 'sales', courseIds: [C_ESTIMATING, C_ADMIN] },
      store
    );
    const row = rows.get(gapMapPathwaySlug(CH, 'sales'));
    expect(row).toMatchObject({
      isPublished: false,
      iicrcDiscipline: null,
      courseIds: [C_ESTIMATING, C_ADMIN],
    });
  });
});

describe('getGapMapView', () => {
  it('shows every area with its courses and whether the coach has edited it', async () => {
    const { store } = fakeMapStore();
    await saveGapMapEntry({ chapterSlug: CH, area: 'money', courseIds: [C_SOCIAL] }, store);
    const view = await getGapMapView(store);
    const chapter = view.chapters.find((c) => c.chapterSlug === CH);
    expect(chapter?.areas.map((a) => a.area)).toEqual([
      'marketing',
      'sales',
      'money',
      'operations',
      'technology',
    ]);
    const money = chapter?.areas.find((a) => a.area === 'money');
    expect(money).toMatchObject({ edited: true, courses: [{ id: C_SOCIAL }] });
    const marketing = chapter?.areas.find((a) => a.area === 'marketing');
    expect(marketing?.edited).toBe(false);
    expect(marketing?.courses.map((c) => c.id)).toEqual([C_SOCIAL, C_WD_MKT]);
    expect(view.options.map((o) => o.id)).toContain(C_ADMIN);
  });
});

describe('assignment reads the coach-edited map', () => {
  it('a marketing-gap member gets the course the coach mapped, not the default', async () => {
    const map = fakeMapStore();
    await saveGapMapEntry(
      { chapterSlug: CH, area: 'marketing', courseIds: [C_ESTIMATING] },
      map.store
    );
    const { store, actions } = fakeStore({
      assessmentJson: MARKETING_GAP_ASSESSMENT,
      gapCourseMap: await loadGapCourseMap(map.store),
    });
    await assignLearningPathFromAssessment(USER, store);
    const goals = actions.map((a) => a.goalId);
    expect(goals).toContain(learningGoalId(C_ESTIMATING));
    expect(goals).not.toContain(learningGoalId(C_SOCIAL));
  });
});
