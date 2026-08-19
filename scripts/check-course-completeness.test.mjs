#!/usr/bin/env node
/**
 * Non-vacuity self-test for the course completeness scorecard.
 *
 * The scorecard runs advisory-only and exits 0 even while reporting 0/37 finalised, so no
 * other CI signal can distinguish a working bar from one that always returns true. That is
 * how the introVideo shortcut survived: a third clause passed any course whose slug merely
 * CONTAINED ccw|carpet|floor|truckmount, on the strength of one unrelated manifest, and
 * reported 5 of 37 courses "finalised" while every one had introVideoUrl undefined.
 *
 * Each case below proves a bar FAILS when its element is absent and PASSES when present.
 * A bar that cannot fail is decorative.
 */
import { scoreCourse } from './check-course-completeness.mjs';

/** A course that clears every bar, so each case can knock out exactly one. */
function completeCourse(overrides = {}) {
  // Must clear MIN_BODY (2000 chars total) and MIN_PER_LESSON (500 avg) across two lessons.
  const body =
    'Learning objective: by the end you will be able to act. '.repeat(40) +
    'Key takeaway: remember this. '.repeat(40);
  return {
    slug: 'fixture-complete',
    title: 'Fixture',
    thumbnailUrl: 'https://example.test/t.png',
    introVideoUrl: 'https://example.test/v.mp4',
    durationHours: 2,
    level: 'Foundation',
    category: 'Water',
    shortDescription: 'A fixture.',
    tags: ['water'],
    modules: [
      {
        lessons: [
          { contentType: 'text', contentBody: body },
          { contentType: 'quiz', contentBody: 'Question one, with a real stem and options.' },
        ],
      },
    ],
    ...overrides,
  };
}

const CASES = [
  // [bar, label, course, expected value of that bar]
  ['introVideo', 'introVideoUrl present', completeCourse(), true],
  ['introVideo', 'no intro video and no manifest', completeCourse({ introVideoUrl: undefined }), false],
  [
    'introVideo',
    'a ccw/carpet/floor/truckmount slug must NOT pass on another course\'s footage',
    completeCourse({ slug: 'commercial-floor-care-onboarding', introVideoUrl: undefined }),
    false,
  ],
  ['thumbnail', 'thumbnailUrl present', completeCourse(), true],
  ['thumbnail', 'thumbnailUrl missing', completeCourse({ thumbnailUrl: undefined }), false],
  ['metadata', 'full metadata', completeCourse(), true],
  ['metadata', 'empty tags', completeCourse({ tags: [] }), false],
  ['metadata', 'missing level', completeCourse({ level: undefined }), false],
  ['assessment', 'quiz lesson with content', completeCourse(), true],
  [
    'assessment',
    'quiz lesson with no real content',
    completeCourse({ modules: [{ lessons: [{ contentType: 'quiz', contentBody: '' }] }] }),
    false,
  ],
  ['scaffolds', 'objectives and a take-away', completeCourse(), true],
  [
    'scaffolds',
    'body with neither objectives nor take-aways',
    completeCourse({ modules: [{ lessons: [{ contentType: 'text', contentBody: 'x'.repeat(3000) }] }] }),
    false,
  ],
  ['depth', 'body long enough', completeCourse(), true],
  [
    'depth',
    'stub body',
    completeCourse({ modules: [{ lessons: [{ contentType: 'text', contentBody: 'too short' }] }] }),
    false,
  ],
];

let failed = 0;
for (const [bar, label, course, expected] of CASES) {
  const got = scoreCourse(course).checks[bar];
  if (got !== expected) {
    console.error(`✖ ${bar}: expected ${expected} for "${label}" but got ${got}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n✖ course completeness self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ course completeness self-test passed (${CASES.length} cases across 6 bars).`);
process.exit(0);
