/**
 * Catalogue-internal id conflict detection for the course catalogue.
 *
 * Pure: it reads the catalogue structure and nothing else — no database, no filesystem — so it
 * cannot be wrong about a database and needs none to test.
 *
 * WHY THIS EXISTS, measured rather than theorised. The safe importer's `foreignIds` check
 * compares incoming curriculum ids against the DATABASE, catching an id that already belongs to
 * another course. It cannot catch an id the catalogue hands to two courses at once, because on an
 * empty database neither course's plan sees a conflict. With one module id duplicated across two
 * catalogue courses, on a fresh database:
 *
 *   npm run db:seed-courses -- --all --apply
 *     ...79 of 80 courses written, 295 modules, then:
 *     aborted: 1 incoming id(s) belong to a different course
 *
 * The importer's in-transaction ownership check did its job and nothing was corrupted, but the
 * batch refusal fired on the LAST course instead of before the first — precisely the
 * half-applied catalogue that `--all`'s whole-run refusal exists to prevent.
 */

/**
 * The minimum shape this needs. Deliberately structural rather than the importer's own `Course`
 * type, so the check does not drag the importer's CLI types into a unit test.
 */
export type CatalogueCourseShape = {
  id: string;
  slug: string;
  modules?: { id: string; lessons?: { id: string }[] }[];
};

/**
 * Every curriculum id the catalogue assigns to more than one place, as human-readable lines.
 * Empty means no conflict.
 *
 * A lesson MOVING between modules of the same course is NOT reported: that is a difference
 * between the catalogue and the database, not a duplicate inside the catalogue. The same lesson
 * id listed under two modules at once IS reported — the catalogue is claiming it twice, and the
 * second upsert would silently win.
 */
export function catalogueIdConflicts(courses: CatalogueCourseShape[]): string[] {
  const out: string[] = [];
  const claim = (kind: string, seen: Map<string, string>, id: string, where: string) => {
    const prior = seen.get(id);
    if (prior === undefined) seen.set(id, where);
    else out.push(`${kind} id ${id} is claimed by both ${prior} and ${where}`);
  };

  const courseIds = new Map<string, string>();
  const slugSeen = new Set<string>();
  const moduleIds = new Map<string, string>();
  const lessonIds = new Map<string, string>();

  for (const c of courses) {
    claim('course', courseIds, c.id, c.slug);
    // A repeated slug is its own defect: the course upsert selects BY slug, so the second entry
    // silently overwrites the first and one catalogue entry never lands at all.
    if (slugSeen.has(c.slug)) out.push(`course slug "${c.slug}" appears more than once`);
    slugSeen.add(c.slug);
    for (const m of c.modules ?? []) {
      claim('module', moduleIds, m.id, c.slug);
      for (const l of m.lessons ?? []) {
        claim('lesson', lessonIds, l.id, `${c.slug} (module ${m.id})`);
      }
    }
  }
  return out;
}
