import { describe, expect, it } from 'vitest';

import {
  CourseBuilderInputError,
  assertNoStandardText,
  scanCourseBuilderInput,
} from './ai-course-builder-guard';

const PAD =
  'Water damage restoration work follows a structured assessment, drying and verification ' +
  'process across affected materials and assemblies in the built environment. ';

/** Planted fixture: pasted IICRC standard body text (clause density + normative "shall"). */
const PASTED_STANDARD_TEXT =
  PAD +
  'Per ANSI/IICRC S500 the restorer shall establish drying goals. See 12.3.4, 12.3.5 and ' +
  '10.6.2 for psychrometric requirements. The restorer shall document moisture readings daily ' +
  'and shall verify the drying goal per Section 13.4 before demobilisation. ' +
  PAD;

/** Legitimate CARSI-authored outline that references the standard nominatively only. */
const CLEAN_OUTLINE =
  'Module 1 introduces water damage categories and the CARSI drying workflow, aligned to ' +
  'ANSI/IICRC S500. Learners practise psychrometric readings using a 230 V hygrometer and ' +
  'document mould risk in litres of water removed. Module 2 covers site safety under Safe Work ' +
  'Australia model WHS and AS/NZS containment practice.';

describe('assertNoStandardText (GP-129 pre-generation input guard)', () => {
  it('REJECTS a submission containing pasted IICRC standard text before generation', () => {
    expect(() =>
      assertNoStandardText([{ text: PASTED_STANDARD_TEXT, where: 'course_outline' }])
    ).toThrow(CourseBuilderInputError);
  });

  it('surfaces the offending field on the thrown error', () => {
    try {
      assertNoStandardText([{ text: PASTED_STANDARD_TEXT, where: 'course_outline' }]);
      throw new Error('expected CourseBuilderInputError');
    } catch (err) {
      expect(err).toBeInstanceOf(CourseBuilderInputError);
      const hits = (err as CourseBuilderInputError).hits;
      expect(hits.length).toBeGreaterThan(0);
      expect(hits[0].where).toBe('course_outline');
    }
  });

  it('PASSES a CARSI-authored outline that only references a standard nominatively', () => {
    expect(() =>
      assertNoStandardText([
        { text: 'Restoration Fundamentals for AU Technicians', where: 'title' },
        { text: CLEAN_OUTLINE, where: 'course_outline' },
      ])
    ).not.toThrow();
    expect(scanCourseBuilderInput([{ text: CLEAN_OUTLINE }])).toHaveLength(0);
  });

  it('ignores empty / whitespace fields', () => {
    expect(() => assertNoStandardText([{ text: '' }, { text: '   ' }])).not.toThrow();
  });
});
