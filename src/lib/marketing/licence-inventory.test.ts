/**
 * Licence inventory gate (reviews of fix/industry-faq-licence, 18–19/10/2026). Scope: every file
 * under app/, src/ and public/ — including the extracted TEXT of every public PDF — so a stale
 * download cannot keep a retracted claim. docs/ is reviewed on fix/marketing-docs-licence and stays
 * covered by check:iicrc-compliance. Every hit is classified on the SENTENCE that contains it; an
 * unclassified copy hit is an exposure and fails here. Exemptions are per line
 * (scripts/licence-inventory-reviewed.json). Table: docs/compliance/licence-inventory.md.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  classifyCopy,
  inventory,
  REVIEWED,
  sentenceAt,
} from '../../../scripts/licence-inventory.mjs';
import { pdfText } from '../../../scripts/pdf-text.mjs';

type Hit = { file: string; line: number; term: string; cls: string; reason: string; text: string };

const INDUSTRY = 'app/(public)/industries/x/page.tsx';
const PUBLIC = 'src/components/x.tsx';
const HERO = 'app/(public)/courses/page.tsx';
const COST_PAGE = 'app/(public)/restoration-training-cost-australia/page.tsx';
const GUIDE_PDF = 'public/downloads/carsi-government-contractor-guide.pdf';
const GUIDE_MD = 'docs/marketing/lead-magnets/government-contractor-guide.md';
const CODE = 'W' + 'RT'; // assembled so this file never spells the banned construction

/** A throwaway repo root holding the given files. */
function rootWith(files: Record<string, string | Uint8Array>): string {
  const root = mkdtempSync(join(tmpdir(), 'licence-inv-'));
  for (const [file, body] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), body);
  }
  return root;
}

async function pdfWith(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage();
  lines.forEach((text, i) => page.drawText(text, { x: 50, y: 760 - 20 * i, size: 11, font }));
  return doc.save();
}

/** A PDF of `pages` pages, each carrying the same footer line (page furniture or a claim). */
async function pdfWithFooter(pages: number, footer: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage();
    page.drawText(`Section ${i}. Panel requirements vary by agency.`, {
      x: 50,
      y: 760,
      size: 11,
      font,
    });
    page.drawText(footer, { x: 50, y: 30, size: 8, font });
  }
  return doc.save();
}

const exposuresIn = (hits: Hit[], file: string) =>
  hits.filter((h) => h.file === file && h.cls === 'exposure');

describe('licence inventory', () => {
  let hits: Hit[] = [];
  beforeAll(async () => {
    hits = (await inventory()) as Hit[];
  }, 120_000);

  it('inventory: covers every public surface, PDF text included (the pass is not vacuous)', () => {
    for (const s of ['app/', 'src/', 'public/'])
      expect(
        hits.some((h) => h.file.startsWith(s)),
        s
      ).toBe(true);
    expect(hits.some((h) => h.file.startsWith('docs/'))).toBe(false);
    expect(hits.length).toBeGreaterThan(3000);
    // the extractor reads both public PDFs: an extractor that returns nothing fails here
    expect(hits.filter((h) => h.file === GUIDE_PDF).length).toBeGreaterThan(30);
    expect(hits.some((h) => h.file.startsWith('public/courses/') && h.file.endsWith('.pdf'))).toBe(
      true
    );
  });

  it('inventory: no copy hit is an unclassified exposure', () => {
    const exposures = hits
      .filter((h) => h.cls === 'exposure')
      .map((h) => `${h.file}:${h.line} [${h.term}] ${h.reason}: ${h.text}`);
    expect(exposures).toEqual([]);
  });

  it('PDF text: a retracted claim inside a public PDF is an exposure (control)', async () => {
    const file = 'public/downloads/x.pdf';
    const root = rootWith({
      [file]: await pdfWith([
        'CARSI courses are IICRC ' + 'Accredited.', // assembled: the guards read literals as copy
        '537 councils across Australia trust CARSI.',
      ]),
    });
    const terms = exposuresIn((await inventory(root)) as Hit[], file).map((h) => h.term);
    expect(terms).toEqual(expect.arrayContaining(['accredit', 'count-claim']));
  });

  it('PDF text: a claim repeated on all nine pages is scanned on every page (review of 1f81b12a)', async () => {
    const file = 'public/downloads/x.pdf';
    const claim = 'CARSI courses are IICRC ' + 'Accredited.'; // assembled: the guards read literals
    const bytes = await pdfWithFooter(9, claim);
    const root = rootWith({ [file]: bytes });
    expect((await pdfText(join(root, file))).split(claim).length - 1).toBe(9);
    const found = exposuresIn((await inventory(root)) as Hit[], file).filter(
      (h) => h.term === 'accredit'
    );
    expect(found).toHaveLength(9);
  });

  it('PDF text: running page furniture is kept too (nothing is dropped)', async () => {
    const file = 'public/downloads/x.pdf';
    const root = rootWith({ [file]: await pdfWithFooter(9, '© CARSI · carsi.com.au') });
    expect((await pdfText(join(root, file))).split('© CARSI · carsi.com.au').length - 1).toBe(9);
  });

  it('count claims: a bare count on page copy is an exposure (P1-BARE-COUNT-BLINDSPOT control)', async () => {
    const file = 'src/lib/marketing/industry-page-data.ts';
    const root = rootWith({
      [file]: "export const stat = { value: '537 councils across Australia' };\n",
    });
    const found = exposuresIn((await inventory(root)) as Hit[], file);
    expect(found.map((h) => h.term)).toEqual(['count-claim']);
  });

  it('exemptions: every reviewed entry names a reason, a file and the exact line it covers', async () => {
    for (const e of REVIEWED as Array<{
      file: string;
      line: number;
      contains: string;
      reason: string;
      class: string;
    }>) {
      expect(e.reason.length, `${e.file}:${e.line}`).toBeGreaterThan(20);
      expect(['legitimate', 'owned-elsewhere']).toContain(e.class);
      expect(existsSync(e.file), e.file).toBe(true);
      // a PDF entry pins a line of its extracted text, the same text the inventory scans
      const text = e.file.endsWith('.pdf') ? await pdfText(e.file) : readFileSync(e.file, 'utf8');
      expect(text.split('\n')[e.line - 1], `${e.file}:${e.line}`).toContain(e.contains);
    }
  });

  it.each([
    // review of 6fc2bba2 (public surfaces)
    ['iicrc-code', INDUSTRY, `CARSI offers IICRC ${CODE} certification courses online.`],
    ['repair', INDUSTRY, 'CARSI offers carpet repair training for building repair teams.'],
    ['repair', INDUSTRY, 'Learn carpet repair alongside building repair skills.'],
    ['count-claim', INDUSTRY, '537 councils across Australia'],
    ['count-claim', PUBLIC, 'Trusted by 500+ Australian technicians'],
    ['iicrc-code', INDUSTRY, 'Odor Control Technician OCT Specialist skill for fire damage.'],
    // review of ea205ee5 — the reviewer's strings
    [
      'iicrc-offer',
      INDUSTRY,
      'IICRC water damage and mould management training for Australian construction sites.',
    ],
    [
      'CEC',
      'app/(public)/subscribe/success/page.tsx',
      'Start a lesson and earn IICRC CECs toward renewal as you complete training.',
    ],
    ['certif', PUBLIC, 'Earn verifiable IICRC credentials your HSE team can audit.'],
    ['iicrc-code', 'src/components/tools/CECCalculator.tsx', `Browse CARSI ${CODE} online course`],
    [
      'CEC',
      'src/components/tools/CECCalculator.tsx',
      'Every CARSI module grants IICRC CECs on completion',
    ],
    ['repair', PUBLIC, 'CARSI offers carpet repair and reinstallation training.'],
    ['iicrc-code', PUBLIC, `- ${CODE} Water Damage Restoration Fundamentals`],
    // earlier rounds
    ['CEC', PUBLIC, '40+ IICRC CEC courses. Zero classroom time.'],
    [
      'board-approved',
      PUBLIC,
      "CARSI's courses are IICRC board-approved — the same credential standard.",
    ],
    ['certif', PUBLIC, 'The 3 IICRC certs that unlock restoration revenue'],
    ['CEC', INDUSTRY, "title: 'Childcare IICRC CEC Training',"],
    [
      'CEC',
      PUBLIC,
      'CARSI offers IICRC CEC Accredited courses in mould assessment, remediation and indoor air quality.',
    ],
    ['certif', PUBLIC, 'The 3 water categories every restorer must know. Get certified.'],
    // review of 82c76152 (GP-639): the /courses hero label with "certification" swapped in passed
    // as a third-person certification-course comparison. Assembled: never spell it in source.
    ['certif', HERO, 'IICRC ' + 'certification courses (27)'],
    ['certif', HERO, 'IICRC' + '\u00a0certification training'],
    // review of c9bbbf18: a modifier between "IICRC" and "certification" still passed
    ['certif', HERO, 'IICRC ' + 'online certification courses (27)'],
    ['certif', HERO, 'Accredited ' + 'certification training for Australian technicians'],
    // review of 4f4eaaa4: other third-person exemptions accepted these, so one block rule now
    // refuses any IICRC certification offer however it is worded
    ['certif', HERO, 'Your IICRC ' + 'online certification courses'],
    ['certif', HERO, 'IICRC ' + 'certifications for Australian technicians'],
    ['certif', HERO, 'IICRC ' + 'online certification courses — bought once'],
    ['certif', HERO, 'Certification ' + 'training from the IICRC, online'],
    // review of b4af1171: an unrelated "No" earlier in the sentence negated the offer
    ['certif', HERO, 'No waiting for your IICRC ' + 'online certification courses (27)'],
    ['certif', HERO, 'Not sure? Browse IICRC ' + 'certification courses (27)'],
    // review of 6a1046e8: long modifiers in sibling copy on /courses
    [
      'certif',
      HERO,
      'IICRC fully flexible online self paced ' + 'certification courses — bought once (27)',
    ],
  ])('controls: %s fires in %s: %s', (term, file, text) => {
    expect(classifyCopy(file, term, text)[0]).toBe('exposure');
  });

  it('sentence scope: a legitimate phrase elsewhere on the line cannot excuse the claim', () => {
    const line =
      '| Description 2 | Earn verifiable IICRC credentials your HSE team can audit. Digital certificates with public verification URL. |';
    const at = line.indexOf('IICRC credentials');
    const sentence = sentenceAt(line, at, at + 'IICRC credentials'.length);
    expect(sentence).not.toContain('Digital certificates');
    expect(classifyCopy(PUBLIC, 'certif', sentence)[0]).toBe('exposure');
  });

  it.each([
    [
      'CEC',
      INDUSTRY,
      'CARSI is an IICRC CEC Accredited provider. Where the IICRC has approved a course, its CEC hours are shown on the course page.',
    ],
    [
      'certif',
      INDUSTRY,
      'IICRC certification is obtained only through IICRC-approved schools and examinations.',
    ],
    ['iicrc-code', PUBLIC, 'Oct-Nov'],
    ['certif', PUBLIC, 'This is to certify that'],
    [
      'CEC',
      'app/layout.tsx',
      'IICRC CEC Accredited courses for cleaning and restoration professionals in Australia.',
    ],
    ['repair', PUBLIC, 'Burst pipe repair costs are covered by the insurer.'],
    ['iicrc-code', GUIDE_PDF, 'Odor Control Technician OCT Specialist skill for fire damage.'],
    ['count-claim', GUIDE_PDF, 'Staff: 14 (8 technicians, 3 project managers, 3 admin)'],
    ['CEC', HERO, 'IICRC CEC Accredited courses (27)'],
    ['certif', HERO, 'CARSI does not sell IICRC ' + 'certification courses.'],
    [
      'certif',
      COST_PAGE,
      'A certification course and a continuing education course are not competing products.',
    ],
    ['certif', COST_PAGE, 'Why is a CARSI course priced differently from a certification course?'],
    [
      'certif',
      COST_PAGE,
      'One published Australian certification-course fee, checked at source, and what a CARSI course costs.',
    ],
  ])('negative controls: %s stays legitimate in %s: %s', (term, file, text) => {
    expect(classifyCopy(file, term, text)[0]).toBe('legitimate');
  });
});

/**
 * Review of 7a2d510c (finding 2): the public guide PDF still carried retracted claims after its
 * markdown source was corrected. The PDF is generated by scripts/generate-lead-magnet-pdf.mjs; these
 * checks fail when the source changes and the committed PDF is not regenerated.
 */
describe('public guide PDF matches its corrected source', () => {
  /** Text with markup, list markers, checkboxes and whitespace removed, for containment. */
  const squash = (s: string) =>
    s
      .normalize('NFKC')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/^\s*(?:#+\s+)?(?:[-–]\s+)?(?:\[[ xX]\]\s+)?(?:\d+\.\s+)?/, '')
      .replace(/[*_`|#>]/g, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  const INTERNAL = /^\*\*GP-\d+ \| Lead Magnet/; // dropped by the generator
  const LICENCE_LINE = /CEC|certif|accredit|IICRC|\b[A-Z]{2,5}\b/;

  let pdf = '';
  beforeAll(async () => {
    pdf = squash(
      (await pdfText(GUIDE_PDF))
        .split('\n')
        .map((l) => l.replace(/^\s*\d+\.\s+/, ''))
        .join('')
    );
  });

  const missing = (source: string) =>
    source
      .split('\n')
      .filter((l) => LICENCE_LINE.test(l) && !INTERNAL.test(l) && !/^\s*\|?\s*:?-{3}/.test(l))
      .filter((l) => !pdf.includes(squash(l)));

  it('freshness: every licence-relevant line of the markdown source is in the PDF text', () => {
    const source = readFileSync(GUIDE_MD, 'utf8');
    expect(source.split('\n').filter((l) => LICENCE_LINE.test(l)).length).toBeGreaterThan(60);
    expect(missing(source)).toEqual([]);
  });

  it('freshness: a corrected source line the PDF lacks is caught (control)', () => {
    expect(missing('- **14 CECs every three years** for a certification')).toHaveLength(1);
  });

  it('content: the PDF carries the corrected facts and none of the retracted ones', () => {
    for (const s of [
      'RRT',
      'CCMT',
      '14 CECs every four years',
      'Master and Inspector certifications need 14 CECs every two years',
      'courses the IICRC has approved',
      'Set by each panel',
    ])
      expect(pdf, s).toContain(squash(s));
    for (const s of [
      '$20M',
      '14 CECs per certification',
      'self-paced IICRC CEC Accredited courses',
      'Keep existing credentials current with CARSI IICRC CEC Accredited courses',
    ])
      expect(pdf, s).not.toContain(squash(s));
  });
});

/**
 * Review of ea205ee5 (P1-LIVE-CONSTRUCTION-METADATA): /industries/construction
 * metadata said "IICRC water damage and mould management training". Industry page metadata
 * (title, description, keywords, Open Graph) may name the IICRC only as CARSI's provider
 * standing, a conditional CEC rule, or a negation.
 */
describe('industry metadata never brands CARSI training with the IICRC name', () => {
  const dir = join(process.cwd(), 'app', '(public)', 'industries');
  const pages = readdirSync(dir)
    .filter((s) => existsSync(join(dir, s, 'page.tsx')))
    .map((s) => [s, readFileSync(join(dir, s, 'page.tsx'), 'utf8')] as const);

  function metadataBlock(src: string): string {
    const start = src.search(/export const metadata\b/);
    if (start < 0) return '';
    const ends = ['\n};', '\n});', '\n);'].map((t) => src.indexOf(t, start)).filter((i) => i > 0);
    return src.slice(start, ends.length ? Math.min(...ends) : undefined);
  }
  const ALLOWED =
    /IICRC CEC Accredited provider|the IICRC has approved|not IICRC certification|no CARSI course is IICRC certification|IICRC certification itself/g;
  const iicrcMentions = (block: string) =>
    block.replace(ALLOWED, '').match(/[^'"`]*\bIICRC\b[^'"`]*/g) ?? [];

  it('metadata: the check fires on the live construction description (control)', () => {
    expect(
      iicrcMentions(
        "export const metadata = {\n  description:\n    'IICRC water damage and mould management training for Australian construction sites.',\n};"
      )
    ).not.toEqual([]);
  });

  it.each(pages)('metadata: %s', (_slug, src) => {
    expect(iicrcMentions(metadataBlock(src))).toEqual([]);
  });
});

/**
 * Review of b4af1171 (GP-639): a word-limited regex cannot refuse every wording, and an
 * unlimited one flags 24 third-person lines across the site. The /courses hero link is the one
 * new public line, so its whole element is pinned: any other label, attribute or second link to
 * the CEC catalogue fails here, however it is worded.
 */
describe('the /courses hero CEC link is pinned to the permitted label', () => {
  const HERO_CLASS =
    'inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#146fc2]/30 bg-white px-7 text-sm font-semibold text-[#146fc2] transition hover:border-[#146fc2]/60 focus-visible:ring-2 focus-visible:ring-[#2490ed]/35 focus-visible:outline-none';
  const PINNED =
    '{catalogueAvailable && cecApprovedCount > 0 ? ( <Link href="/courses?discipline=iicrc-cec#catalogue" className="' +
    HERO_CLASS +
    '" > IICRC CEC Accredited courses ({cecApprovedCount}) </Link> ) : null}';
  // className is pinned too: a Tailwind content utility renders text (review of 6a1046e8)

  function heroCecLinks(src: string): string[] {
    return [
      ...src.matchAll(
        /\{[^{}]*\?\s*\(\s*<Link\b[\s\S]*?<\/Link>\s*\)\s*:\s*null\}|<Link\b[\s\S]*?<\/Link>/g
      ),
    ]
      .map((m) => m[0])
      .filter((el) => el.includes('discipline=iicrc-cec'))
      .map((el) => el.replace(/\s+/g, ' ').trim());
  }

  it('hero: the live page carries exactly the pinned element, once', () => {
    const src = readFileSync(HERO, 'utf8');
    expect(src.split('discipline=iicrc-cec').length - 1).toBe(1);
    expect(heroCecLinks(src)).toEqual([PINNED]);
  });

  // CSS can render text the copy scan never sees; /courses uses none (review of 6a1046e8)
  const CSS_TEXT = /\bcontent-\[|\bcontent\s*:/;
  it('hero: the /courses page renders no CSS-generated text', () => {
    expect(readFileSync(HERO, 'utf8')).not.toMatch(CSS_TEXT);
  });

  it.each([
    [
      'a reworded label',
      'IICRC CEC Accredited courses ({cecApprovedCount})',
      'No waiting for your IICRC ' + 'online certification courses ({cecApprovedCount})',
    ],
    [
      'an added attribute',
      'href="/courses?discipline=iicrc-cec#catalogue"',
      'title="IICRC ' + 'certification courses" href="/courses?discipline=iicrc-cec#catalogue"',
    ],
    [
      'CSS-generated text in className',
      'className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#146fc2]/30',
      'className="before:content-[\'IICRC_' +
        "certification_courses'] inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#146fc2]/30",
    ],
    [
      'a dropped gate',
      '{catalogueAvailable && cecApprovedCount > 0 ? (',
      '{cecApprovedCount > 0 ? (',
    ],
  ])('hero: %s fails the pin (control)', (_name, from, to) => {
    const src = readFileSync(HERO, 'utf8');
    const planted = src.replace(from, to);
    expect(planted).not.toBe(src);
    expect(heroCecLinks(planted)).not.toEqual([PINNED]);
  });

  it('hero: CSS-generated text anywhere on /courses fails (control)', () => {
    const planted = readFileSync(HERO, 'utf8').replace(
      'className="',
      'className="after:content-[\'IICRC_' + "certification_courses'] "
    );
    expect(planted).toMatch(CSS_TEXT);
  });
});
