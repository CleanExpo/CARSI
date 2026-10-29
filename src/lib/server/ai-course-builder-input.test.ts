import { describe, expect, it } from 'vitest';

import { AiCourseBuilderError, parseAiCourseBuilderInput } from './ai-course-builder';

// Parity table: every expected value below was produced by running the same input through the
// pre-upgrade schema under zod 3.25.76 (scratch install outside the repo). The API and the
// instructor AI-builder page show the first issue message, so it must not drift with zod
// upgrades. error = text of issues[0]; ok = accepted (parsed) value.
type Expected = { ok: unknown } | { error: string };

const TABLE: Array<[string, unknown, Expected]> = [
  [
    'valid',
    {
      title: 'Water damage basics',
      course_outline: 'An outline in my own words that is long enough.',
      category: 'Restoration',
      module_count: 3,
    },
    {
      ok: {
        title: 'Water damage basics',
        course_outline: 'An outline in my own words that is long enough.',
        category: 'Restoration',
        module_count: 3,
      },
    },
  ],
  [
    'valid defaults',
    {
      title: 'Water damage basics',
      course_outline: 'An outline in my own words that is long enough.',
    },
    {
      ok: {
        title: 'Water damage basics',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 3,
      },
    },
  ],
  [
    'valid module_count string',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: '4',
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 4,
      },
    },
  ],
  [
    'trim title',
    {
      title: '  Abc  ',
      course_outline: '  An outline in my own words that is long enough.  ',
      category: '  x  ',
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: 'x',
        module_count: 3,
      },
    },
  ],
  [
    'missing title',
    { course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Required' },
  ],
  ['missing outline', { title: 'Abc' }, { error: 'Required' }],
  ['empty object', {}, { error: 'Required' }],
  ['raw undefined', undefined, { error: 'Required' }],
  ['raw null', null, { error: 'Expected object, received null' }],
  ['raw string', 'hello', { error: 'Expected object, received string' }],
  ['raw array', [], { error: 'Expected object, received array' }],
  ['raw number', 5, { error: 'Expected object, received number' }],
  [
    'title null',
    { title: null, course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Expected string, received null' },
  ],
  [
    'title number',
    { title: 5, course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Expected string, received number' },
  ],
  [
    'title bool',
    { title: true, course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Expected string, received boolean' },
  ],
  [
    'title array',
    { title: ['a'], course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Expected string, received array' },
  ],
  [
    'title object',
    { title: {}, course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Expected string, received object' },
  ],
  [
    'title whitespace',
    { title: '   ', course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Course title is too short' },
  ],
  [
    'title 2 chars',
    { title: 'ab', course_outline: 'An outline in my own words that is long enough.' },
    { error: 'Course title is too short' },
  ],
  [
    'title 160',
    { title: 'x'.repeat(160), course_outline: 'An outline in my own words that is long enough.' },
    {
      ok: {
        title: 'x'.repeat(160),
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 3,
      },
    },
  ],
  [
    'title 161',
    { title: 'x'.repeat(161), course_outline: 'An outline in my own words that is long enough.' },
    { error: 'String must contain at most 160 character(s)' },
  ],
  [
    'outline number',
    { title: 'Abc', course_outline: 12 },
    { error: 'Expected string, received number' },
  ],
  [
    'outline null',
    { title: 'Abc', course_outline: null },
    { error: 'Expected string, received null' },
  ],
  [
    'outline short',
    { title: 'Abc', course_outline: 'too short' },
    { error: 'Provide a fuller outline (your own words, at least 20 characters)' },
  ],
  [
    'outline 8000',
    { title: 'Abc', course_outline: 'x'.repeat(8000) },
    { ok: { title: 'Abc', course_outline: 'x'.repeat(8000), category: '', module_count: 3 } },
  ],
  [
    'outline 8001',
    { title: 'Abc', course_outline: 'x'.repeat(8001) },
    { error: 'String must contain at most 8000 character(s)' },
  ],
  [
    'category 120',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      category: 'x'.repeat(120),
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: 'x'.repeat(120),
        module_count: 3,
      },
    },
  ],
  [
    'category 121',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      category: 'x'.repeat(121),
    },
    { error: 'String must contain at most 120 character(s)' },
  ],
  [
    'category number',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      category: 7,
    },
    { error: 'Expected string, received number' },
  ],
  [
    'category null',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      category: null,
    },
    { error: 'Expected string, received null' },
  ],
  [
    'category undefined explicit',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      category: undefined,
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 3,
      },
    },
  ],
  [
    'mc 1',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 1,
    },
    { error: 'Number must be greater than or equal to 2' },
  ],
  [
    'mc 2',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 2,
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 2,
      },
    },
  ],
  [
    'mc 5',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 5,
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 5,
      },
    },
  ],
  [
    'mc 6',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 6,
    },
    { error: 'Number must be less than or equal to 5' },
  ],
  [
    'mc 3.5',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 3.5,
    },
    { error: 'Expected integer, received float' },
  ],
  [
    'mc 1.5',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 1.5,
    },
    { error: 'Expected integer, received float' },
  ],
  [
    'mc 5.5',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 5.5,
    },
    { error: 'Expected integer, received float' },
  ],
  [
    'mc abc',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 'abc',
    },
    { error: 'Expected number, received nan' },
  ],
  [
    'mc empty string',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: '',
    },
    { error: 'Number must be greater than or equal to 2' },
  ],
  [
    'mc null',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: null,
    },
    { error: 'Number must be greater than or equal to 2' },
  ],
  [
    'mc true',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: true,
    },
    { error: 'Number must be greater than or equal to 2' },
  ],
  [
    'mc array',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: [],
    },
    { error: 'Number must be greater than or equal to 2' },
  ],
  [
    'mc object',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: {},
    },
    { error: 'Expected number, received nan' },
  ],
  [
    'mc Infinity str',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: 'Infinity',
    },
    { error: 'Expected integer, received float' },
  ],
  [
    'mc 1e999 str',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: '1e999',
    },
    { error: 'Expected integer, received float' },
  ],
  [
    'mc 3.0 str',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: '3.0',
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 3,
      },
    },
  ],
  [
    "mc ' 4 '",
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: ' 4 ',
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 4,
      },
    },
  ],
  [
    'mc 0x4',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: '0x4',
    },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 4,
      },
    },
  ],
  [
    'mc 3.5 str',
    {
      title: 'Abc',
      course_outline: 'An outline in my own words that is long enough.',
      module_count: '3.5',
    },
    { error: 'Expected integer, received float' },
  ],
  [
    'multi invalid',
    { title: 5, course_outline: 5, module_count: 'abc' },
    { error: 'Expected string, received number' },
  ],
  [
    'extra key',
    { title: 'Abc', course_outline: 'An outline in my own words that is long enough.', zzz: 1 },
    {
      ok: {
        title: 'Abc',
        course_outline: 'An outline in my own words that is long enough.',
        category: '',
        module_count: 3,
      },
    },
  ],
];

describe('parseAiCourseBuilderInput zod 3 parity', () => {
  it.each(TABLE)('%s', (_name, input, expected) => {
    if ('ok' in expected) {
      expect(parseAiCourseBuilderInput(input)).toEqual(expected.ok);
      return;
    }
    let caught: unknown;
    try {
      parseAiCourseBuilderInput(input);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AiCourseBuilderError);
    expect((caught as AiCourseBuilderError).message).toBe(expected.error);
    expect((caught as AiCourseBuilderError).status).toBe(400);
  });
});
