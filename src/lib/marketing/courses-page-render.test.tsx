// @vitest-environment jsdom
/**
 * Reviews of 29e2a6f7 and 0f6c4d8f (GP-639): source pins miss copy assembled at render time (an
 * HTML entity such as I&#73;CRC, split JSX text, string expressions), copy in attributes, copy
 * shown only for some catalogue data, and lookalike letters. This renders the real /courses page
 * for each catalogue state the hero depends on and pins every IICRC-naming sentence a reader,
 * assistive technology or crawler gets; page.tsx itself is pinned by hash. New IICRC copy on
 * /courses fails here until it is reviewed and added.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WATER_COURSE } from '../../../e2e/catalogue-fixtures';
import { CATALOGUE_TOPIC_TABS } from '../catalogue/discipline-param';

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/courses',
}));

// Registry-approved slugs (data/seed/cec-approvals.json, in force on the fixed date below).
const approved = (slug: string) => ({
  id: slug,
  slug,
  title: slug,
  price_aud: 29,
  is_free: false,
  category: 'Water Damage',
  short_description: 'An approved course.',
});
const STATES: Array<[string, unknown[]]> = [
  ['catalogue unavailable', []],
  ['no approval', [WATER_COURSE]],
  ['one approval', [WATER_COURSE, approved('introduction-to-porous-materials-drying')]],
  [
    'three approvals',
    [
      WATER_COURSE,
      approved('introduction-to-porous-materials-drying'),
      approved('introduction-to-odour-control-and-removal-techniques'),
      approved('introduction-to-structural-drying-concepts'),
    ],
  ],
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T00:00:00Z'));
  vi.stubEnv('DATABASE_URL', '');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const BLOCK =
  /<\/?(?:p|div|li|ul|ol|h[1-6]|section|article|header|footer|nav|main|aside|a|button|label|option|select|summary|details|table|tr|td|th|figure|figcaption|script|br|svg|g|text|tspan|title)\b[^>]*>/gi;
const ATTRS = [
  'title',
  'alt',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-valuetext',
  'aria-roledescription',
  'placeholder',
  'label',
  'content',
  'value',
];

// Letters that read as I or C in a brand name: Cyrillic, Greek and Latin lookalikes, a lower-case
// L and the digit one. Folded before matching, so "I\u0406CRC" or "IlCRC" still names the IICRC.
const LOOKALIKE: Record<string, string> = {
  '\u0406': 'I',
  '\u0456': 'i',
  '\u04c0': 'I',
  '\u04cf': 'i',
  '\u0399': 'I',
  '\u03b9': 'i',
  '\u0131': 'i',
  '\u0421': 'C',
  '\u0441': 'c',
  '\u03f9': 'C',
  '\u03f2': 'c',
  '\u0420': 'P',
};
const fold = (text: string) => text.replace(/[^\x00-\x7f]/g, (c) => LOOKALIKE[c] ?? c);
const NAMES_IICRC = /[il1|][il1|]\s?c\s?r\s?c/i;

const clean = (text: string) =>
  fold(text.normalize('NFKC').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g, ''));

/** Visible copy, then attribute copy: blocks split, entities decoded, invisible marks dropped. */
function renderedText(html: string): string {
  const doc = document.createElement('div');
  doc.innerHTML = html;
  const attrs = [...doc.querySelectorAll('*')].flatMap((el) =>
    ATTRS.map((a) => el.getAttribute(a)).filter((v): v is string => Boolean(v))
  );
  const div = document.createElement('div');
  div.innerHTML = html.replace(/<script\b[\s\S]*?<\/script>/gi, '\n').replace(BLOCK, '\n');
  return clean(`${div.textContent ?? ''}\n${attrs.join('\n')}`);
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

/** Sentences naming the IICRC, numbers masked so one list covers every catalogue size. */
function iicrcSentences(text: string): string[] {
  return [
    ...new Set(
      text
        .split('\n')
        .flatMap((line) => line.split(/(?<=[.!?])\s+/))
        .map((s) => s.replace(/\s+/g, ' ').trim().replace(/\d+/g, '#'))
        .filter((s) => NAMES_IICRC.test(s))
    ),
  ].sort();
}

async function renderHtml(items: unknown[], discipline?: string): Promise<string> {
  vi.resetModules();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        String(url).includes('/api/lms/courses') ? { items, total: items.length } : { items: [] },
    }))
  );
  const { default: CoursesPage } = await import('../../../app/(public)/courses/page');
  return renderToStaticMarkup(
    await CoursesPage({ searchParams: Promise.resolve(discipline ? { discipline } : {}) })
  );
}

async function renderCourses(items: unknown[], discipline?: string): Promise<string> {
  const html = await renderHtml(items, discipline);
  return `${renderedText(html)}\n${jsonLdText(html)}`;
}

// Every catalogue tab a ?discipline= link or a tab click can open, the hero's destination
// ('iicrc-cec') included (review of fe12a477).
const DISCIPLINES: Array<string | undefined> = [
  undefined,
  ...CATALOGUE_TOPIC_TABS.filter((t) => t !== 'All'),
  'iicrc-cec',
];

// Reviewed: the permitted hero label, third-person IICRC facts and denials, and CEC wording that
// names CARSI's provider standing or a per-course approval. Numbers are masked as #.
const REVIEWED_IICRC_SENTENCES = [
  '#Which CARSI courses have IICRC CEC hours?',
  '#Will a CARSI course make me IICRC certified?',
  'A course shows CEC hours only while it has an IICRC CEC approval in force.',
  'A reference map of the IICRC’s own certification disciplines.',
  'Approved IICRC CEC',
  'CARSI is an IICRC CEC Accredited provider and issues its own credentials, the CARSI Southern Hemisphere Restoration Designations.',
  'How IICRC certification disciplines fit together',
  'IICRC',
  'IICRC CEC',
  'IICRC CEC Accredited courses (#)',
  'IICRC certification is obtained only through IICRC-approved schools and examinations.',
  'IICRC certification is obtained through schools and examinations approved by the IICRC.',
  'IICRC context',
  'Interactive map of seven IICRC certification disciplines around a central IICRC hub',
  'Only those with an IICRC CEC approval in force: # at present, listed with their hours and expiry dates on the IICRC CEC courses page.',
  'Same cards as the homepage — price, duration, and CEC hours only when the IICRC has approved that course.',
  'Study online with CARSI, an IICRC CEC Accredited provider.',
  'These are CARSI-issued credentials, not IICRC certifications.',
  'These are certifications awarded by schools and examinations approved by the IICRC, not CARSI courses — CARSI courses carry CARSI Southern Hemisphere Restoration Designations.',
  'Which CARSI courses have IICRC CEC hours?',
  'Will a CARSI course make me IICRC certified?',
];
// How many times the rendered page names the IICRC in each catalogue state (every tab alike).
const REVIEWED_IICRC_COUNTS: Record<string, number> = {
  'catalogue unavailable': 16,
  'no approval': 26,
  'one approval': 29,
  'three approvals': 29,
};
// The public-rendering source files of this diff, as reviewed for GP-639. Any edit to one fails
// here until it is reviewed and these pins and the lists above are updated together: a component
// can add copy under a state no render reaches, so its every branch is pinned as a file.
const REVIEWED_SOURCE_SHA256: Record<string, string> = {
  'app/(public)/courses/page.tsx':
    '85ba8041bd6b994d2f881073cd37664b807fffc93dc2154a4e04a695ba429d4a',
  'app/(public)/courses/[slug]/page.tsx':
    'fa11892a05908c82349ebf30c631ea09117938d66b2713dd6e10c73c69e28887',
  'app/(public)/pathways/[slug]/page.tsx':
    '66e4c37b9c7f7e37c7cb0f7bc7cd677db0a6f3c4814aacc6f78bcf8deab9a044',
  'src/components/lms/CourseGrid.tsx':
    'ae0da068a86cda6f544644546de0f125825170fb4cc0beb2e0b1b997dd2309f3',
  'src/components/lms/CourseSearchBar.tsx':
    'f6e00b2daabe277f1d7c887b1f5357b01ec994cf7d870f489a810b51e16f8e52',
  'src/lib/catalogue/discipline-param.ts':
    '1ec7861a70eaac64936bf93025a19a1ee38468c12d0545f8c317b5d33e26641e',
  'src/lib/cec-display.ts': '9b20d308d90bee310749664428d58fd21afc76d004e92108d3c68eba8a497ddc',
};

const mentions = (text: string) => (text.match(new RegExp(NAMES_IICRC, 'gi')) ?? []).length;

describe('rendered /courses: every IICRC sentence is a reviewed one (GP-639)', () => {
  it('source: every public-rendering file of this diff is the reviewed version', () => {
    const now = Object.fromEntries(
      Object.keys(REVIEWED_SOURCE_SHA256).map((f) => [
        f,
        createHash('sha256').update(readFileSync(f)).digest('hex'),
      ])
    );
    expect(now).toEqual(REVIEWED_SOURCE_SHA256);
  });

  it('rendered: every catalogue state and tab names the IICRC only in reviewed sentences', async () => {
    const seen = new Set<string>();
    for (const [state, items] of STATES)
      for (const discipline of DISCIPLINES) {
        const text = await renderCourses(items, discipline);
        for (const s of iicrcSentences(text)) seen.add(s);
        expect(mentions(text), `${state} | ${discipline ?? 'no tab'}`).toBe(
          REVIEWED_IICRC_COUNTS[state]
        );
      }
    expect([...seen].sort()).toEqual(REVIEWED_IICRC_SENTENCES);
  }, 60_000);

  it('rendered: the hero destination opens the IICRC CEC tab (the tab states are not vacuous)', async () => {
    const selected = (html: string) => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
    };
    expect(selected(await renderHtml(STATES[2][1], 'iicrc-cec'))).toBe('IICRC CEC');
    expect(selected(await renderHtml(STATES[2][1], 'Water Damage'))).toBe('Water Damage');
    expect(selected(await renderHtml(STATES[2][1]))).toBe('All');
  });

  it('rendered: the hero link renders when an approval is in force (the states are not vacuous)', async () => {
    expect(await renderCourses(STATES[2][1])).toContain('IICRC CEC Accredited courses (1)');
    expect(await renderCourses(STATES[0][1])).not.toContain('IICRC CEC Accredited courses');
  });

  // Controls: encodings and placements a source scan reads differently from a browser
  it.each([
    ['an HTML entity', '<p>CARSI offers your I&#73;CRC certification online.</p>'],
    ['split inline markup', '<p>CARSI offers your I<span></span>ICRC certification online.</p>'],
    ['a zero-width space', '<p>CARSI offers your I\u200bICRC certification online.</p>'],
    ['a fullwidth letter', '<p>CARSI offers your \uff29ICRC certification online.</p>'],
    ['a Cyrillic I', '<p>CARSI offers your I\u0406CRC certification online.</p>'],
    ['a Cyrillic C', '<p>CARSI offers your II\u0421R\u0421 certification online.</p>'],
    ['a lower-case L', '<p>CARSI offers your IlCRC certification online.</p>'],
    ['a title attribute', '<p title="CARSI offers your I&#73;CRC certification online.">x</p>'],
    ['an aria-label', '<a aria-label="CARSI offers your IICRC certification online.">x</a>'],
    ['an image alt', '<img alt="CARSI offers your IICRC certification online." />'],
  ])('rendered: %s still reads as naming the IICRC (control)', (_name, html) => {
    const found = iicrcSentences(renderedText(html));
    expect(found.length).toBe(1);
    expect(found[0].replace(/[^a-z ]/gi, '').toLowerCase()).toContain('certification online');
  });

  it('rendered: a JSON-LD string is read as copy (control)', () => {
    const html =
      '<script type="application/ld+json">{"name":"IICRC certification, online"}</script>';
    expect(iicrcSentences(jsonLdText(html))).toEqual(['IICRC certification, online']);
  });
});
