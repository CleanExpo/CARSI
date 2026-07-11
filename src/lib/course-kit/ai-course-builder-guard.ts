/**
 * Pre-generation input guard for the AI course builder (GP-129).
 *
 * Licence-critical (CLAUDE.md § "IICRC standards IP + AI use"): IICRC standard text
 * must never be entered into any AI tool. This guard scans every free-text field of a
 * course-builder submission with the shared standards-excerpt heuristic and REJECTS the
 * request BEFORE any model call when a field looks like pasted IICRC standard body text.
 *
 * Nominative references ("aligned to ANSI/IICRC S500:2021") carry no cite-density and
 * pass — reproduced standard sections, clause-numbered procedures and repeated normative
 * "shall" language do not. This is fail-closed: a hit blocks generation, it does not warn.
 */

import { scanManyForStandardExcerpts, type StandardExcerptHit } from './standards-excerpt';

export class CourseBuilderInputError extends Error {
  readonly hits: StandardExcerptHit[];

  constructor(hits: StandardExcerptHit[]) {
    super(
      'Submission appears to contain IICRC standard text, which must never be entered into AI ' +
        'tooling (IICRC AI Use Policy). Describe the topic in your own words or paste a ' +
        'CARSI-authored outline instead — reference a standard nominatively (e.g. "aligned to ' +
        'ANSI/IICRC S500"), never its sections, tables or procedures.'
    );
    this.name = 'CourseBuilderInputError';
    this.hits = hits;
  }
}

export interface CourseBuilderTextField {
  text: string;
  where?: string;
}

/** Excerpt hits across all submitted free-text fields (empty array = clean). */
export function scanCourseBuilderInput(fields: CourseBuilderTextField[]): StandardExcerptHit[] {
  return scanManyForStandardExcerpts(
    fields.filter((f) => typeof f.text === 'string' && f.text.length > 0)
  );
}

/** Throws {@link CourseBuilderInputError} when any field looks like pasted IICRC standard text. */
export function assertNoStandardText(fields: CourseBuilderTextField[]): void {
  const hits = scanCourseBuilderInput(fields);
  if (hits.length > 0) throw new CourseBuilderInputError(hits);
}
