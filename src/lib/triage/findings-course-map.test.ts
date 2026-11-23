/**
 * BACKLOG #24 — the findings→course mapping pass for the weekly triage.
 *
 * Pins the four behaviours the row needs: a finding reaches the right course (and lesson), an
 * unrelated finding reaches none, a noAiRewrite course is flagged report-only and never edited,
 * and an empty findings input says "no findings", which is a different answer from "not run".
 */
import { describe, expect, it } from 'vitest';

import type { CatalogCourse } from '@/lib/seed/courses-catalog-types';

import {
  mapFindingsToCourses,
  parseFindingsMarkdown,
  runFindingsCourseTriage,
  type Finding,
} from './findings-course-map';

function lesson(id: string, title: string, contentBody: string) {
  return {
    id,
    title,
    contentType: 'text',
    contentBody,
    orderIndex: 0,
    isPreview: false,
    resources: null,
  };
}

function course(slug: string, title: string, extra: Partial<CatalogCourse> = {}): CatalogCourse {
  return {
    id: `id-${slug}`,
    slug,
    title,
    description: null,
    shortDescription: null,
    thumbnailUrl: null,
    instructorId: 'i1',
    status: 'published',
    priceAud: '0',
    isFree: false,
    durationHours: 1,
    level: null,
    category: null,
    tags: [],
    iicrcDiscipline: null,
    cecHours: 0,
    meta: {},
    isPublished: true,
    modules: [],
    ...extra,
  } as CatalogCourse;
}

const CATALOGUE: CatalogCourse[] = [
  course('mould-basics', 'Mould Basics', {
    tags: ['mould'],
    modules: [
      {
        id: 'm1',
        title: 'Module 1',
        orderIndex: 0,
        lessons: [
          lesson('l1', 'Spores and moisture', '<p>How spores grow on damp plasterboard.</p>'),
          lesson('l2', 'Containment set-up', '<p>Poly sheeting and zip doors.</p>'),
        ],
      },
    ],
  }),
  course('carpet-care', 'Carpet Cleaning Fundamentals', {
    modules: [
      {
        id: 'm2',
        title: 'Module 1',
        orderIndex: 0,
        lessons: [lesson('l3', 'Fibre types', '<p>Wool and nylon.</p>')],
      },
    ],
  }),
  course('ozone-evidence', 'Ozone and Hydroxyl Generators: What the Evidence Says', {
    meta: { noAiRewrite: true },
    modules: [
      {
        id: 'm3',
        title: 'Module 1',
        orderIndex: 0,
        lessons: [lesson('l4', 'What ozone does', '<p>Ozone reacts with odour molecules.</p>')],
      },
    ],
  }),
  // Present so the "unrelated finding" test can fail: a CI "smoke test" must not read as smoke damage.
  course('smoke-damage', 'Smoke Damage Restoration', {
    tags: ['smoke', 'soot'],
    modules: [
      {
        id: 'm4',
        title: 'Module 1',
        orderIndex: 0,
        lessons: [lesson('l5', 'Soot types', '<p>Dry and wet smoke residues.</p>')],
      },
    ],
  }),
];

function finding(id: string, title: string, body = ''): Finding {
  return { id, title, body, date: '2026-11-20', source: 'test' };
}

const NOW = new Date('2026-11-23T00:00:00Z');

describe('mapFindingsToCourses', () => {
  it('maps a mould finding to the mould course and the lesson it affects, with a reason', () => {
    const [result] = mapFindingsToCourses(
      [finding('f1', 'New guidance on spore sampling after a water loss')],
      CATALOGUE
    );
    const slugs = result.matches.map((m) => m.slug);
    expect(slugs).toEqual(['mould-basics']);
    const match = result.matches[0];
    expect(match.reasons.join(' ')).toMatch(/spore/);
    expect(match.lessons.map((l) => l.lessonId)).toEqual(['l1']);
    expect(match.lessons[0].reason).toMatch(/spore/);
  });

  it('maps a finding that names a course slug to that course', () => {
    const [result] = mapFindingsToCourses(
      [
        finding(
          'f2',
          'Quiz skew',
          '`carpet-care-quiz.json`: 8 of 10 at one position (carpet-care).'
        ),
      ],
      CATALOGUE
    );
    expect(result.matches.map((m) => m.slug)).toContain('carpet-care');
    expect(result.matches.find((m) => m.slug === 'carpet-care')?.reasons.join(' ')).toMatch(
      /names the course slug/
    );
  });

  it('maps an unrelated finding to no course', () => {
    const [result] = mapFindingsToCourses(
      [
        finding(
          'f3',
          'Stripe webhook probe noise',
          'The Playwright smoke test of the checkout route was flaky.'
        ),
      ],
      CATALOGUE
    );
    expect(result.matches).toEqual([]);
  });

  it('flags a noAiRewrite course as report-only and does not edit the catalogue', () => {
    const before = JSON.stringify(CATALOGUE);
    const [result] = mapFindingsToCourses(
      [finding('f4', 'Ozone generator exposure guidance updated')],
      CATALOGUE
    );
    const match = result.matches.find((m) => m.slug === 'ozone-evidence');
    expect(match).toBeDefined();
    expect(match?.noAiRewrite).toBe(true);
    expect(match?.action).toMatch(/report only/i);
    expect(JSON.stringify(CATALOGUE)).toBe(before);
  });
});

describe('parseFindingsMarkdown', () => {
  it('reads dated bullets under the Discoveries headings and ignores the queue above', () => {
    const md = [
      '# BACKLOG',
      '| 24 | mould row in the queue | A | 1 | ready |',
      '## Discoveries (append here, triage weekly)',
      '- 2026-11-20 · **Mould spore finding.** Body line',
      '  continued.',
      '## Discoveries — 2026-11-02 backlog run',
      '- **Finding — carpet thing.** No leading date.',
    ].join('\n');
    const parsed = parseFindingsMarkdown(md, 'BACKLOG.md');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.findings.map((f) => [f.title, f.date])).toEqual([
      ['Mould spore finding.', '2026-11-20'],
      ['Finding — carpet thing.', '2026-11-02'],
    ]);
    expect(parsed.findings[0].body).toMatch(/continued/);
  });

  it('refuses a document with no Discoveries heading', () => {
    expect(parseFindingsMarkdown('# Nothing here', 'x.md')).toMatchObject({ ok: false });
  });
});

describe('runFindingsCourseTriage', () => {
  const catalogueJson = JSON.stringify({ version: 1, courses: CATALOGUE });

  function run(files: Record<string, string>, args: string[] = []) {
    const lines: string[] = [];
    const writes: string[] = [];
    const code = runFindingsCourseTriage({
      args,
      now: NOW,
      readText: (path) => {
        if (!(path in files)) throw new Error(`ENOENT ${path}`);
        return files[path];
      },
      out: (line) => lines.push(line),
    });
    return { code, text: lines.join('\n'), writes };
  }

  it('reports "no findings" and exits 0 for an empty findings input', () => {
    const { code, text } = run({ 'f.json': '[]', 'cat.json': catalogueJson }, [
      '--findings',
      'f.json',
      '--catalogue',
      'cat.json',
      '--all',
    ]);
    expect(code).toBe(0);
    expect(text).toMatch(/no findings/i);
    expect(text).not.toMatch(/not run/i);
  });

  it('reports "not run (reason)" and exits non-zero when the findings source cannot be read', () => {
    const { code, text } = run({ 'cat.json': catalogueJson }, [
      '--findings',
      'missing.md',
      '--catalogue',
      'cat.json',
    ]);
    expect(code).not.toBe(0);
    expect(text).toMatch(/not run \(.+\)/i);
    expect(text).not.toMatch(/no findings/i);
  });

  it('reports "not run" when the catalogue cannot be read, rather than mapping to nothing', () => {
    const { code, text } = run({ 'f.json': JSON.stringify([finding('f1', 'Mould spores')]) }, [
      '--findings',
      'f.json',
      '--catalogue',
      'nope.json',
      '--all',
    ]);
    expect(code).not.toBe(0);
    expect(text).toMatch(/not run \(.+catalogue.+\)/i);
  });

  it('reports "no findings" for the window when every finding is older than --since', () => {
    const old = { ...finding('f1', 'Mould spores'), date: '2026-01-01' };
    const { code, text } = run({ 'f.json': JSON.stringify([old]), 'cat.json': catalogueJson }, [
      '--findings',
      'f.json',
      '--catalogue',
      'cat.json',
      '--since',
      '2026-11-16',
    ]);
    expect(code).toBe(0);
    expect(text).toMatch(/no findings/i);
  });

  it('prints a report naming the course, the lesson, the reason and that nothing was edited', () => {
    const { code, text } = run(
      {
        'f.json': JSON.stringify([
          finding('f1', 'Ozone guidance changed'),
          finding('f2', 'Stripe noise'),
        ]),
        'cat.json': catalogueJson,
      },
      ['--findings', 'f.json', '--catalogue', 'cat.json', '--all']
    );
    expect(code).toBe(0);
    expect(text).toMatch(/ozone-evidence/);
    expect(text).toMatch(/What ozone does/);
    expect(text).toMatch(/noAiRewrite/);
    expect(text).toMatch(/Stripe noise[\s\S]*no course/i);
    expect(text).toMatch(/nothing was edited/i);
  });
});
