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
  'Approved for IICRC CECs (#)',
  'CARSI is an IICRC Approved CEC Provider and issues its own credentials, the CARSI Southern Hemisphere Restoration Designations.',
  'How IICRC certification disciplines fit together',
  'IICRC',
  'IICRC CEC',
  'IICRC certification is obtained only through IICRC-approved schools and examinations.',
  'IICRC certification is obtained through schools and examinations approved by the IICRC.',
  'IICRC context',
  'Interactive map of seven IICRC certification disciplines around a central IICRC hub',
  'Only those with an IICRC CEC approval in force: # at present, listed with their hours and expiry dates on the IICRC CEC courses page.',
  'Same cards as the homepage — price, duration, and CEC hours only when the IICRC has approved that course.',
  'Study online with CARSI, an IICRC Approved CEC Provider.',
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
  // GP-704 re-pin: the retired provider phrase is replaced by the approved-wording module
  // ("Approved for IICRC CECs" link label, provider sentence). No other sentence changed.
  'app/(public)/courses/page.tsx':
    '8d6281ac9f1506c1cb99c7be8129cefff9fee1dbacd12920bd568319d489b945',
  // BACKLOG #22 re-pin: adds the <CourseReferences> block only (import + one element). It adds no
  // IICRC, CEC, certification, accreditation or approval sentence: IICRC-naming sources are held
  // back from that block (src/lib/seo/course-references.ts NAMES_IICRC_RE) pending GP-639 review.
  // Row 19 (NZ) re-pin: `locale: 'en_AU'` → `...OG_LOCALE_FIELDS` (en_AU + alternate en_NZ) and its
  // import. Metadata only; no IICRC, CEC, certification, accreditation or approval sentence changed.
  // GP-748 re-pin: the learning-outcome sentences moved to src/lib/courses/course-credential-copy.ts
  // and now name the IICRC only for a CEC-approved course; the page passes `cecApproved` to the
  // schema and detail components. No IICRC sentence was added; a non-approved course page names
  // none (pinned by src/lib/courses/course-credential-copy.test.tsx). Re-pinned again after the
  // #1205 review: the audience list now takes the same `cecApproved` flag (one argument added).
  'app/(public)/courses/[slug]/page.tsx':
    'f72265818e4ea739166a6376e000b1d2d91d45a88ca6e4041ba249cd8139e437',
  // Row 19 (NZ) re-pin: `locale: 'en_AU'` → `...OG_LOCALE_FIELDS` (en_AU + alternate en_NZ) and its
  // import. Metadata only; no IICRC, CEC, certification, accreditation or approval sentence changed.
  'app/(public)/pathways/[slug]/page.tsx':
    'e254162212a4d11a365c5900c1e93019c71260af33852ca730b8790412acd35c',
  // GP-696 re-pin after GP-661 b3613864 (embedded preset: layout only; every IICRC, CEC,
  // certification, accreditation and approval line is byte-identical to the GP-639 review).
  'src/components/lms/CourseGrid.tsx':
    '5e2ce9b348771667120c6ce2f6376bca3f48253b7676d1e7270c4f12500d77cc',
  'src/components/lms/CourseSearchBar.tsx':
    'f6e00b2daabe277f1d7c887b1f5357b01ec994cf7d870f489a810b51e16f8e52',
  'src/lib/catalogue/discipline-param.ts':
    '1ec7861a70eaac64936bf93025a19a1ee38468c12d0545f8c317b5d33e26641e',
  'src/lib/cec-display.ts': '9b20d308d90bee310749664428d58fd21afc76d004e92108d3c68eba8a497ddc',
};

const mentions = (text: string) => (text.match(new RegExp(NAMES_IICRC, 'gi')) ?? []).length;

// Hash LF-normalised text: a Windows checkout with core.autocrlf=true holds the same source
// with CRLF bytes and must not read as an unreviewed edit (GP-653).
const sourceHash = (text: string) =>
  createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex');

describe('rendered /courses: every IICRC sentence is a reviewed one (GP-639)', () => {
  it('source: every public-rendering file of this diff is the reviewed version', () => {
    const now = Object.fromEntries(
      Object.keys(REVIEWED_SOURCE_SHA256).map((f) => [f, sourceHash(readFileSync(f, 'utf8'))])
    );
    expect(now).toEqual(REVIEWED_SOURCE_SHA256);
  });

  it('source: a CRLF checkout of a pinned file matches its pin; an edited one does not', () => {
    for (const f of Object.keys(REVIEWED_SOURCE_SHA256)) {
      // Build both checkouts from the file as it is on disk, whichever line endings it has.
      const lf = readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
      const crlf = lf.replace(/\n/g, '\r\n');
      expect(sourceHash(lf), f).toBe(REVIEWED_SOURCE_SHA256[f]);
      expect(sourceHash(crlf), f).toBe(REVIEWED_SOURCE_SHA256[f]);
      expect(sourceHash(`${lf}\n// edit`), f).not.toBe(REVIEWED_SOURCE_SHA256[f]);
      // A lone carriage return is a real edit, not a line ending.
      expect(sourceHash(`${lf}\r`), f).not.toBe(REVIEWED_SOURCE_SHA256[f]);
    }
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
    expect(await renderCourses(STATES[2][1])).toContain('Approved for IICRC CECs (1)');
    expect(await renderCourses(STATES[0][1])).not.toContain('Approved for IICRC CECs');
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
