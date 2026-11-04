/**
 * GP-633 follow-up — coach-editable gap-to-course map.
 *
 * No new table. Each coach edit is one row in the existing `lms_learning_pathways` table with
 * the reserved slug `coaching-gap-map--<chapter>--<area>`, always `is_published = false` and no
 * IICRC discipline, and its courses (in order) in `lms_learning_pathway_courses`. Every public
 * pathway read filters `is_published = true`, so these rows never reach a public page.
 *
 * No row for an area: the built-in `DEFAULT_GAP_COURSE_MAP` applies. A row with no courses: the
 * coach chose to prescribe nothing for that gap. Reset deletes the row.
 */
import { randomUUID } from 'node:crypto';

import {
  DEFAULT_GAP_COURSE_MAP,
  GAP_MAP_SLUG_PREFIX,
  LEARNING_GAP_AREAS,
  LEARNING_GAP_LABELS,
  gapMapPathwaySlug,
  parseGapMapPathwaySlug,
  type GapCourseMap,
  type LearningCatalogueCourse,
  type LearningGapArea,
} from '@/lib/coaching-portal/learning-path';
import { prisma } from '@/lib/prisma';
import { lmsPublishedCourseWhere } from '@/lib/server/public-courses-list';

/** Most courses one gap area may prescribe; a path is capped at 4 overall anyway. */
export const GAP_MAP_MAX_COURSES = 8;

export class GapMapValidationError extends Error {}

export type GapMapOverride = { slug: string; courses: LearningCatalogueCourse[] };

export type GapMapStore = {
  /** Every stored coach edit, courses in coach order (unpublished courses included). */
  listOverrides(): Promise<GapMapOverride[]>;
  publishedCoursesByIds(ids: string[]): Promise<LearningCatalogueCourse[]>;
  publishedCoursesBySlugs(slugs: string[]): Promise<LearningCatalogueCourse[]>;
  publishedCatalogue(): Promise<LearningCatalogueCourse[]>;
  /** Create or replace one area's edit atomically (pathway row plus its ordered courses). */
  replaceOverride(input: { slug: string; title: string; courseIds: string[] }): Promise<void>;
  deleteOverride(slug: string): Promise<void>;
};

const CHAPTERS = Object.keys(DEFAULT_GAP_COURSE_MAP);

function cloneDefault(): GapCourseMap {
  const out: GapCourseMap = {};
  for (const [chapter, areas] of Object.entries(DEFAULT_GAP_COURSE_MAP)) {
    out[chapter] = Object.fromEntries(
      LEARNING_GAP_AREAS.map((a) => [a, [...(areas[a] ?? [])]])
    ) as GapCourseMap[string];
  }
  return out;
}

/** The map assignment uses: the built-in default with every coach edit laid over it. */
export async function loadGapCourseMap(
  store: GapMapStore = prismaGapMapStore
): Promise<GapCourseMap> {
  const map = cloneDefault();
  for (const o of await store.listOverrides()) {
    const key = parseGapMapPathwaySlug(o.slug);
    if (!key || !map[key.chapterSlug]) continue;
    map[key.chapterSlug][key.area] = o.courses.map((c) => c.slug);
  }
  return map;
}

export type GapMapAreaView = {
  area: LearningGapArea;
  label: string;
  /** True when a coach edit replaces the built-in default for this area. */
  edited: boolean;
  /** Published courses this area prescribes, in order. */
  courses: LearningCatalogueCourse[];
};

export type GapMapView = {
  chapters: Array<{ chapterSlug: string; areas: GapMapAreaView[] }>;
  options: LearningCatalogueCourse[];
};

export async function getGapMapView(store: GapMapStore = prismaGapMapStore): Promise<GapMapView> {
  const overrides = new Map(
    (await store.listOverrides())
      .map((o) => [parseGapMapPathwaySlug(o.slug), o] as const)
      .filter((x): x is [NonNullable<(typeof x)[0]>, GapMapOverride] => x[0] !== null)
      .map(([k, o]) => [`${k.chapterSlug}--${k.area}`, o])
  );
  const options = await store.publishedCatalogue();
  const publishedIds = new Set(options.map((c) => c.id));
  const defaultSlugs = [
    ...new Set(Object.values(DEFAULT_GAP_COURSE_MAP).flatMap((ch) => Object.values(ch).flat())),
  ];
  const bySlug = new Map(
    (await store.publishedCoursesBySlugs(defaultSlugs)).map((c) => [c.slug, c])
  );

  return {
    chapters: CHAPTERS.map((chapterSlug) => ({
      chapterSlug,
      areas: LEARNING_GAP_AREAS.map((area) => {
        const o = overrides.get(`${chapterSlug}--${area}`);
        const courses = o
          ? o.courses.filter((c) => publishedIds.has(c.id))
          : (DEFAULT_GAP_COURSE_MAP[chapterSlug][area] ?? [])
              .map((s) => bySlug.get(s))
              .filter((c): c is LearningCatalogueCourse => Boolean(c));
        return { area, label: LEARNING_GAP_LABELS[area], edited: Boolean(o), courses };
      }),
    })),
    options,
  };
}

function assertKey(chapterSlug: string, area: string): asserts area is LearningGapArea {
  if (!CHAPTERS.includes(chapterSlug)) throw new GapMapValidationError('Unknown coaching chapter.');
  if (!LEARNING_GAP_AREAS.includes(area as LearningGapArea)) {
    throw new GapMapValidationError('Unknown gap area.');
  }
}

export async function saveGapMapEntry(
  input: { chapterSlug: string; area: LearningGapArea; courseIds: string[] },
  store: GapMapStore = prismaGapMapStore
): Promise<GapMapView> {
  assertKey(input.chapterSlug, input.area);
  const ids = input.courseIds;
  if (ids.length > GAP_MAP_MAX_COURSES) {
    throw new GapMapValidationError(`At most ${GAP_MAP_MAX_COURSES} courses per gap.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new GapMapValidationError('Each course can appear once per gap.');
  }
  const published = new Set((await store.publishedCoursesByIds(ids)).map((c) => c.id));
  if (ids.some((id) => !published.has(id))) {
    throw new GapMapValidationError('Only published courses can be mapped to a gap.');
  }
  await store.replaceOverride({
    slug: gapMapPathwaySlug(input.chapterSlug, input.area),
    title: `Coaching gap map (internal): ${LEARNING_GAP_LABELS[input.area]}`,
    courseIds: ids,
  });
  return getGapMapView(store);
}

export async function resetGapMapEntry(
  input: { chapterSlug: string; area: LearningGapArea },
  store: GapMapStore = prismaGapMapStore
): Promise<GapMapView> {
  assertKey(input.chapterSlug, input.area);
  await store.deleteOverride(gapMapPathwaySlug(input.chapterSlug, input.area));
  return getGapMapView(store);
}

// The site-wide publication rule: `status` is canonical; the legacy `isPublished` flag is not
// read (about 20 published courses still carry isPublished=false). Review r2 P1.
const PUBLISHED = lmsPublishedCourseWhere;
const COURSE_SELECT = { id: true, slug: true, title: true } as const;

type GapMapDb = Pick<typeof prisma, 'lmsLearningPathway' | 'lmsCourse'>;

/** Prisma store over any client or transaction, so assignment can read it on its locked tx. */
export function prismaGapMapStoreFor(db: GapMapDb): GapMapStore {
  return {
    async listOverrides() {
      const rows = await db.lmsLearningPathway.findMany({
        where: { slug: { startsWith: GAP_MAP_SLUG_PREFIX } },
        select: {
          slug: true,
          courses: {
            orderBy: { orderIndex: 'asc' },
            select: { course: { select: COURSE_SELECT } },
          },
        },
      });
      return rows.map((r) => ({ slug: r.slug, courses: r.courses.map((c) => c.course) }));
    },
    async publishedCoursesByIds(ids) {
      if (ids.length === 0) return [];
      return db.lmsCourse.findMany({
        where: { id: { in: ids }, ...PUBLISHED },
        select: COURSE_SELECT,
      });
    },
    async publishedCoursesBySlugs(slugs) {
      if (slugs.length === 0) return [];
      return db.lmsCourse.findMany({
        where: { slug: { in: slugs }, ...PUBLISHED },
        select: COURSE_SELECT,
      });
    },
    async publishedCatalogue() {
      return db.lmsCourse.findMany({
        where: PUBLISHED,
        orderBy: { title: 'asc' },
        select: COURSE_SELECT,
      });
    },
    async replaceOverride({ slug, title, courseIds }) {
      await prisma.$transaction(async (tx) => {
        const pathway = await tx.lmsLearningPathway.upsert({
          where: { slug },
          // Never published: this row is internal configuration, not a public pathway.
          create: { id: randomUUID(), slug, title, isPublished: false, iicrcDiscipline: null },
          update: { title, isPublished: false, iicrcDiscipline: null },
          select: { id: true },
        });
        await tx.lmsLearningPathwayCourse.deleteMany({ where: { pathwayId: pathway.id } });
        if (courseIds.length) {
          await tx.lmsLearningPathwayCourse.createMany({
            data: courseIds.map((courseId, orderIndex) => ({
              pathwayId: pathway.id,
              courseId,
              orderIndex,
            })),
          });
        }
      });
    },
    async deleteOverride(slug) {
      // Join rows cascade from the pathway (ON DELETE CASCADE).
      await db.lmsLearningPathway.deleteMany({ where: { slug } });
    },
  };
}

export const prismaGapMapStore: GapMapStore = prismaGapMapStoreFor(prisma);
