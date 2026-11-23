/**
 * Reference material for the employer proof-pack (BACKLOG #26).
 *
 * The source is the committed course References index (data/seo/course-references.index.json,
 * BACKLOG #22), built from each lesson's "Sources for this lesson" list. Only citations leave
 * this module: a label, an absolute http(s) link where the lesson gave one (often a public PDF),
 * and the read date. No lesson prose and no standard text is copied, and third-party PDFs are
 * linked, never embedded.
 *
 * Licence rules (fail-closed):
 *   - A course that is not listed as approved in data/seed/cec-approvals.json never names the
 *     IICRC (check:iicrc-scope). Any reference naming the IICRC, an iicrc.org link, or an IICRC
 *     S-standard number is dropped for such a course, even if the index ever carries one.
 *   - A CEC-approved course may keep a nominative standard citation ("ANSI/IICRC S500:2021").
 *   - References never touch CEC hours.
 */
import { isCecApprovedCourse } from '@/lib/seed/cec-approvals';
import type { CourseReference } from '@/lib/seo/course-references';
import { getCourseReferences } from '@/lib/seo/course-references-index';
import type { ProofPackReference } from '@/types/proof-pack';

/** Same loose match as course-references.ts (catches I1CRC / lICRC look-alikes). */
const NAMES_IICRC_RE = /[il1|][il1|]\s?c\s?r\s?c/i;
/** IICRC standard numbers, as check-iicrc-scope.mjs lists them (also "S 500" and "S-500"). */
const IICRC_STANDARD_RE = /(?<![A-Za-z0-9])S[\s-]?(?:100|210|220|300|400|500|520|540|600|700|800)(?![0-9])/i;

function namesIicrc(ref: CourseReference): boolean {
  const text = `${ref.label} ${ref.url ?? ''}`;
  return NAMES_IICRC_RE.test(text) || IICRC_STANDARD_RE.test(ref.label);
}

/**
 * The references a completed course contributes to the proof-pack; empty when it cites nothing.
 * `source` defaults to the committed index and exists so tests can inject a list.
 */
export function proofPackReferencesForCourse(
  slug: string,
  source: readonly CourseReference[] = getCourseReferences(slug)
): ProofPackReference[] {
  const approved = isCecApprovedCourse(slug);
  return source
    .filter((ref) => approved || !namesIicrc(ref))
    .map((ref) => ({ label: ref.label, url: ref.url, read_on: ref.readOn }));
}
