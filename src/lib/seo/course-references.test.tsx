// @vitest-environment node
/**
 * BACKLOG #22 — the public References block on course pages.
 *
 * It must show only what a course's lessons already cite in their "Sources for this lesson"
 * lists (evidence-layer template §5), show nothing for a course that cites nothing, and never
 * carry lesson prose onto the public page. The committed index must match the seed catalogue.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseReferences } from '@/components/lms/CourseReferences';

import { scanText as terminologyFindings } from '../../../scripts/check-iicrc-terminology.mjs';
import { evaluate as standardsFindings } from '../../../scripts/check-standards-claims.mjs';
import { serialiseIndex, INDEX_PATH } from '../../../scripts/build-course-references';

import {
  buildCourseReferencesIndex,
  collectCourseReferences,
  extractLessonSources,
  type CatalogueCourseForReferences,
} from './course-references';
import { courseReferenceCounts, getCourseReferences } from './course-references-index';

const BLOCK = (items: string) =>
  `<p>Lesson text.</p><h3>Sources for this lesson</h3><ul>${items}</ul>`;
const LINK = (href: string, label: string, tail = ' Read 02/11/2026.') =>
  `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>.${tail}</li>`;

function course(
  slug: string,
  bodies: (string | null)[],
  extra: Partial<CatalogueCourseForReferences> = {}
): CatalogueCourseForReferences {
  return {
    slug,
    status: 'published',
    isPublished: true,
    modules: [{ lessons: bodies.map((contentBody) => ({ contentBody })) }],
    ...extra,
  };
}

describe('extractLessonSources', () => {
  it('reads linked and named sources from the template block', () => {
    const refs = extractLessonSources(
      BLOCK(
        '<li>AS/NZS 3000:2018, Wiring Rules (cited by name only; no text reproduced).</li>' +
          LINK('https://www.safeworkaustralia.gov.au/x', 'Safe Work Australia, Model WHS laws')
      )
    );
    expect(refs).toEqual([
      {
        label: 'AS/NZS 3000:2018, Wiring Rules (cited by name only; no text reproduced).',
        url: null,
        readOn: null,
      },
      {
        label: 'Safe Work Australia, Model WHS laws',
        url: 'https://www.safeworkaustralia.gov.au/x',
        readOn: '02/11/2026',
      },
    ]);
  });

  it('holds IICRC-naming sources back from the public block until GP-639 review', () => {
    const refs = extractLessonSources(
      BLOCK(
        '<li>ANSI/IICRC S500:2025 (cited by name only; no text reproduced).</li>' +
          LINK('https://www.iicrc.org/s500', 'IICRC, ANSI/IICRC S500 page') +
          LINK('https://example.com/x', 'I1CRC look-alike page') +
          LINK('https://www.safeworkaustralia.gov.au/x', 'Safe Work Australia, Model WHS laws')
      )
    );
    expect(refs.map((r) => r.label)).toEqual(['Safe Work Australia, Model WHS laws']);
  });

  it('a lesson without the block, or with only the no-source placeholder, cites nothing', () => {
    expect(extractLessonSources('<p>No sources here.</p><ul><li>A bullet</li></ul>')).toEqual([]);
    expect(extractLessonSources(null)).toEqual([]);
    expect(
      extractLessonSources(
        BLOCK(
          '<li>No external source is cited for this lesson. Its figures are worked examples.</li>'
        )
      )
    ).toEqual([]);
  });

  it('ignores lists that are not the Sources block', () => {
    const html =
      '<h3>Takeaway</h3><ul><li><a href="https://example.com/not-a-source">Not a source</a></li></ul>' +
      BLOCK(LINK('https://www.accc.gov.au/x', 'ACCC, Consumer rights'));
    expect(extractLessonSources(html).map((r) => r.label)).toEqual(['ACCC, Consumer rights']);
  });

  it('keeps only the cited title: lesson prose after the anchor never leaves the lesson', () => {
    const [ref] = extractLessonSources(
      BLOCK(
        LINK(
          'https://a.example/x',
          'Wood Handbook ch. 13',
          ' The paid teaching point. Read 20/11/2026.'
        )
      )
    );
    expect(ref).toEqual({
      label: 'Wood Handbook ch. 13',
      url: 'https://a.example/x',
      readOn: '20/11/2026',
    });
    expect(JSON.stringify(ref)).not.toContain('paid teaching point');
  });

  it('drops a non-http link but keeps the label; decodes entities', () => {
    const [ref] = extractLessonSources(
      BLOCK(LINK('javascript:alert(1)', 'A contractor&rsquo;s guide &amp; notes'))
    );
    expect(ref).toEqual({ label: 'A contractor’s guide & notes', url: null, readOn: '02/11/2026' });
  });
});

describe('collectCourseReferences / buildCourseReferencesIndex', () => {
  it('de-duplicates by URL across lessons, first label wins, latest read date kept', () => {
    const entry = collectCourseReferences(
      course('c', [
        BLOCK(LINK('https://a.example/x', 'First label', ' Read 02/11/2026.')),
        '<p>No block in this lesson.</p>',
        BLOCK(
          LINK('https://a.example/x', 'Second label', ' Read 20/11/2026.') +
            LINK('https://b.example/y', 'Other source')
        ),
      ])
    );
    expect(entry).toEqual({
      lessonsWithSources: 2,
      references: [
        { label: 'First label', url: 'https://a.example/x', readOn: '20/11/2026' },
        { label: 'Other source', url: 'https://b.example/y', readOn: '02/11/2026' },
      ],
    });
  });

  it('a course that cites nothing has no entry; drafts are never indexed', () => {
    const cited = BLOCK(LINK('https://a.example/x', 'A'));
    const index = buildCourseReferencesIndex([
      course('none', ['<p>Plain lesson.</p>']),
      course('placeholder-only', [BLOCK('<li>No external source is cited for this lesson.</li>')]),
      course('draft', [cited], { status: 'draft', isPublished: false }),
      course('live', [cited]),
    ]);
    expect(Object.keys(index)).toEqual(['live']);
  });
});

describe('committed index', () => {
  it('matches the seed catalogue (run `npm run build:course-references` after a source change)', () => {
    expect(readFileSync(join(process.cwd(), INDEX_PATH), 'utf8')).toBe(serialiseIndex());
  });

  it('carries the pilot course and nothing for a course that cites nothing', () => {
    expect(getCourseReferences('water-damage-restoration-fundamentals').length).toBeGreaterThan(0);
    expect(getCourseReferences('no-such-course')).toEqual([]);
    expect(Object.values(courseReferenceCounts()).every((n) => n > 0)).toBe(true);
  });

  it('every indexed label passes the terminology and standards-claim scanners', () => {
    const labels = Object.values(
      JSON.parse(readFileSync(join(process.cwd(), INDEX_PATH), 'utf8')) as Record<
        string,
        { references: { label: string }[] }
      >
    ).flatMap((e) => e.references.map((r) => r.label));
    expect(
      labels.flatMap((l) => terminologyFindings('data/seo/course-references.index.json', l))
    ).toEqual([]);
    expect(labels.flatMap((l) => standardsFindings(l))).toEqual([]);
  });
});

describe('<CourseReferences>', () => {
  it('renders nothing when the course carries no references', () => {
    expect(renderToStaticMarkup(<CourseReferences references={[]} />)).toBe('');
  });

  it('renders each reference once: linked ones open in a new tab, named ones as text', () => {
    const html = renderToStaticMarkup(
      <CourseReferences
        references={[
          {
            label: 'Safe Work Australia, Model WHS laws',
            url: 'https://www.safeworkaustralia.gov.au/x',
            readOn: '02/11/2026',
          },
          { label: 'ANSI/IICRC S500:2025 (cited by name only)', url: null, readOn: null },
        ]}
      />
    );
    expect(html).toContain('id="references"');
    expect(html).toContain('href="https://www.safeworkaustralia.gov.au/x"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('Read 02/11/2026');
    expect(html).toContain('ANSI/IICRC S500:2025 (cited by name only)');
    expect(html.match(/<li/g)).toHaveLength(2);
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it('its own copy passes the terminology and standards-claim scanners', () => {
    const text = renderToStaticMarkup(
      <CourseReferences references={[{ label: 'X', url: null, readOn: null }]} />
    ).replace(/<[^>]*>/g, '\n');
    const lines = text.split('\n').filter((l) => l.trim());
    expect(
      lines.flatMap((l) => terminologyFindings('src/components/lms/CourseReferences.tsx', l))
    ).toEqual([]);
    expect(lines.flatMap((l) => standardsFindings(l))).toEqual([]);
  });
});
