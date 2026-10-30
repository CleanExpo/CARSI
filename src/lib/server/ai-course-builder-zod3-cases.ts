// Differential input set for parseAiCourseBuilderInput (zod 3 -> 4 upgrade). Every case's
// expected outcome was recorded by running the pre-upgrade source (CARSI a6c07435, zod 3.25.76);
// see ai-course-builder-zod3-oracle.json and ai-course-builder-differential.test.ts.
// Includes values JSON can carry and values only a direct caller can pass (undefined,
// objects whose toString/valueOf throw on numeric coercion, null-prototype objects).
const BASE = {
  title: 'Valid original course',
  course_outline: 'An original Australian course outline with adequate detail.',
};

function rawValues(): unknown[] {
  return [
    null,
    true,
    false,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    -1,
    0.1,
    2.1,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
    Number.MAX_SAFE_INTEGER,
    -Number.MAX_SAFE_INTEGER,
    9007199254740992,
    -9007199254740992,
    '',
    ' ',
    '\t',
    '3',
    '2.0',
    '3e0',
    '0x3',
    '0b11',
    '0o3',
    'Infinity',
    '-Infinity',
    'NaN',
    '1e400',
    '1e-400',
    '9'.repeat(400),
    'a',
    'x'.repeat(161),
    [],
    [3],
    [null],
    [true],
    [1, 2],
    {},
    { toString: null },
    { toString: 3 },
    { toString: [] },
    { valueOf: null },
    { valueOf: 3 },
    { toString: null, valueOf: null },
    [{ toString: null }],
    Object.create(null),
    JSON.parse('{"__proto__":{"toString":null}}'),
    // Astral characters: zod 3 counts UTF-16 code units, zod 4 counts code points.
    '\u{1F600}',
    '\u{1F600}a',
    '\u{1F600}'.repeat(4),
    '\u{1F600}'.repeat(10),
    '\u{1F600}'.repeat(61),
    '\u{1F600}'.repeat(81),
    '\u{1F600}'.repeat(4001),
    'e\u0301',
  ];
}

export function buildDifferentialCases(): Array<[string, unknown]> {
  const raw = rawValues();
  const values = [undefined, ...raw];
  const cases: Array<[string, unknown]> = raw.map((input, i) => [`root-${i}`, input]);
  for (const field of ['title', 'course_outline', 'category', 'module_count']) {
    values.forEach((v, i) => cases.push([`${field}-${i}`, { ...BASE, [field]: v }]));
  }
  raw.forEach((t, i) =>
    raw.forEach((m, j) => cases.push([`paired-${i}-${j}`, { ...BASE, title: t, module_count: m }]))
  );
  return cases;
}
