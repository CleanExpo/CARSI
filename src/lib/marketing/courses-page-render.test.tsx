// @vitest-environment jsdom
/**
 * Review of 29e2a6f7 (GP-639): source pins miss copy assembled at render time (an HTML entity
 * such as I&#73;CRC, split JSX text, string expressions). This renders the real /courses page,
 * hero included, and pins every rendered sentence that names the IICRC, and how many times the
 * rendered page names it. New IICRC copy on /courses fails here until it is reviewed and added.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WATER_COURSE } from '../../../e2e/catalogue-fixtures';

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/courses',
}));

// One registry-approved course, so the CEC hero link renders.
const CEC_COURSE = {
  id: 'cec-porous',
  slug: 'introduction-to-porous-materials-drying',
  title: 'Introduction to Porous Materials Drying',
  price_aud: 29,
  is_free: false,
  category: 'Water Damage',
  short_description: 'Drying porous materials.',
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T00:00:00Z'));
  vi.stubEnv('DATABASE_URL', '');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes('/api/lms/courses')
          ? { items: [WATER_COURSE, CEC_COURSE], total: 2 }
          : { items: [] },
    }))
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const BLOCK =
  /<\/?(?:p|div|li|ul|ol|h[1-6]|section|article|header|footer|nav|main|aside|a|button|label|option|select|summary|details|table|tr|td|th|figure|figcaption|script|br|svg|g|text|tspan|title)\b[^>]*>/gi;

const clean = (text: string) =>
  text.normalize('NFKC').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, '');

/** Visible copy as a reader gets it: blocks split, entities decoded, invisible marks dropped. */
function renderedText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html.replace(/<script\b[\s\S]*?<\/script>/gi, '\n').replace(BLOCK, '\n');
  return clean(div.textContent ?? '');
}

/** Every string value in the page's JSON-LD, one per line: crawlers read these as copy. */
function jsonLdText(html: string): string {
  const values: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string') values.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  for (const m of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
    walk(JSON.parse(m[1]));
  return clean(values.join('\n'));
}

function iicrcSentences(text: string): string[] {
  return [
    ...new Set(
      text
        .split('\n')
        .flatMap((line) => line.split(/(?<=[.!?])\s+/))
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter((s) => /iicrc/i.test(s))
    ),
  ];
}

async function renderCourses(): Promise<string> {
  const { default: CoursesPage } = await import('../../../app/(public)/courses/page');
  const html = renderToStaticMarkup(await CoursesPage({ searchParams: Promise.resolve({}) }));
  return `${renderedText(html)}\n${jsonLdText(html)}`;
}

// Reviewed: the permitted hero label, third-person IICRC facts and denials, and CEC wording
// that names CARSI's provider standing or a per-course approval.
const REVIEWED_IICRC_SENTENCES = [
  'IICRC CEC Accredited courses (1)',
  'These are CARSI-issued credentials, not IICRC certifications.',
  'IICRC certification is obtained through schools and examinations approved by the IICRC.',
  'Same cards as the homepage — price, duration, and CEC hours only when the IICRC has approved that course.',
  'IICRC CEC',
  'Approved IICRC CEC',
  'IICRC context',
  'How IICRC certification disciplines fit together',
  'A reference map of the IICRC’s own certification disciplines.',
  'These are certifications awarded by schools and examinations approved by the IICRC, not CARSI courses — CARSI courses carry CARSI Southern Hemisphere Restoration Designations.',
  'IICRC',
  '02Will a CARSI course make me IICRC certified?',
  'IICRC certification is obtained only through IICRC-approved schools and examinations.',
  'CARSI is an IICRC CEC Accredited provider and issues its own credentials, the CARSI Southern Hemisphere Restoration Designations.',
  '03Which CARSI courses have IICRC CEC hours?',
  'Only those with an IICRC CEC approval in force: 1 at present, listed with their hours and expiry dates on the IICRC CEC courses page.',
  'Study online with CARSI, an IICRC CEC Accredited provider.',
  'Will a CARSI course make me IICRC certified?',
  'Which CARSI courses have IICRC CEC hours?',
];
const REVIEWED_IICRC_COUNT = 27;

describe('rendered /courses: every IICRC sentence is a reviewed one (GP-639)', () => {
  it('rendered: the page names the IICRC only in reviewed sentences, a fixed number of times', async () => {
    const text = await renderCourses();
    expect(iicrcSentences(text)).toEqual(REVIEWED_IICRC_SENTENCES);
    expect((text.match(/iicrc/gi) ?? []).length).toBe(REVIEWED_IICRC_COUNT);
  });

  // Controls: encodings that a source scan reads differently from a browser
  it.each([
    ['an HTML entity', '<p>CARSI offers your I&#73;CRC certification online.</p>'],
    ['split inline markup', '<p>CARSI offers your I<span></span>ICRC certification online.</p>'],
    ['a zero-width space', '<p>CARSI offers your I\u200bICRC certification online.</p>'],
    ['a fullwidth letter', '<p>CARSI offers your \uff29ICRC certification online.</p>'],
  ])('rendered: %s still reads as IICRC (control)', (_name, html) => {
    expect(iicrcSentences(renderedText(html))).toEqual([
      'CARSI offers your IICRC certification online.',
    ]);
  });

  it('rendered: a JSON-LD string is read as copy (control)', () => {
    const html =
      '<script type="application/ld+json">{"name":"IICRC certification, online"}</script>';
    expect(iicrcSentences(jsonLdText(html))).toEqual(['IICRC certification, online']);
  });
});
