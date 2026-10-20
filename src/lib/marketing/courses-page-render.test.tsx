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

vi.mock('@/components/ThemeProvider', () => ({ useTheme: () => ({ theme: 'light' }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/courses',
}));

const HERO = 'app/(public)/courses/page.tsx';

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

async function renderCourses(items: unknown[]): Promise<string> {
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
  const html = renderToStaticMarkup(await CoursesPage({ searchParams: Promise.resolve({}) }));
  return `${renderedText(html)}\n${jsonLdText(html)}`;
}

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
// How many times each state's rendered page names the IICRC.
const REVIEWED_IICRC_COUNTS = [16, 26, 29, 29];
// page.tsx as reviewed for GP-639. Any edit to it fails here until it is reviewed and this pin
// and the lists above are updated together: it is the one file whose every branch this diff owns.
const REVIEWED_PAGE_SHA256 = '85ba8041bd6b994d2f881073cd37664b807fffc93dc2154a4e04a695ba429d4a';

const mentions = (text: string) => (text.match(new RegExp(NAMES_IICRC, 'gi')) ?? []).length;

describe('rendered /courses: every IICRC sentence is a reviewed one (GP-639)', () => {
  it('source: page.tsx is the reviewed version', () => {
    expect(createHash('sha256').update(readFileSync(HERO)).digest('hex')).toBe(
      REVIEWED_PAGE_SHA256
    );
  });

  it('rendered: every catalogue state names the IICRC only in reviewed sentences', async () => {
    const seen = new Set<string>();
    const counts: number[] = [];
    for (const [, items] of STATES) {
      const text = await renderCourses(items);
      for (const s of iicrcSentences(text)) seen.add(s);
      counts.push(mentions(text));
    }
    expect([...seen].sort()).toEqual(REVIEWED_IICRC_SENTENCES);
    expect(counts).toEqual(REVIEWED_IICRC_COUNTS);
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
