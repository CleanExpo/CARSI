// @vitest-environment jsdom
/**
 * GP-704 guard: CARSI is described only as an "IICRC Approved CEC Provider". The retired provider
 * phrase (CEC or IICRC directly followed by an "accredit" word, or "accredited IICRC" /
 * "accredited provider") must not appear in what the site renders, nor anywhere in tracked source
 * outside two exact allow-lists:
 *   - HISTORICAL: dated records that describe the past (audits, handoffs, session notes);
 *   - PENDING: files another open change owns. Each entry names its owner, and the test fails
 *     once the file is clean so the entry is removed and the list only shrinks.
 *
 * Only adjacency is matched, so "nationally accredited VET qualification" and similar true
 * statements about other bodies stay legal.
 *
 * GP-771 closed two gaps. Source files are also read the way a visitor reads them (reading-view.ts),
 * so a phrase split across JSX tags, `{' '}`, literals, entities, line breaks or markdown emphasis
 * is caught. And CARSI_ACCREDITED_CLAIM catches an unqualified "accredited" claim about CARSI that
 * names no IICRC or CEC.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  APPROVED_FOR_IICRC_CECS,
  CARSI_PROVIDER_STATUS,
  FROM_IICRC_APPROVED_CEC_PROVIDER,
  IICRC_APPROVED_CEC_PROVIDER,
} from './approved-wording';
import { readingViews, sourceLine } from './reading-view';

vi.mock('@/lib/brand/fonts', () => ({
  fontDisplay: { variable: '--font-display' },
  fontSans: { variable: '--font-sans' },
  fontMono: { variable: '--font-mono' },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));
// The sign-in forms need the app's providers; this test reads only the page's own copy.
vi.mock('@/components/auth/login-form', () => ({ LoginForm: () => null }));
vi.mock('@/components/auth/register-form', () => ({ RegisterForm: () => null }));
vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-toast')>()),
  useToast: () => ({ toast: () => {} }),
}));

const ROOT = process.cwd();

/**
 * The retired wording: an "accredit" word directly beside IICRC or CEC, "accredited provider", or
 * "accredited" followed within four words by IICRC or CEC ("accredited as an IICRC CEC provider",
 * "accredited by the IICRC"). A negation in the two words before "accredited" ("not accredited by
 * the IICRC", "not nationally accredited and awards no IICRC CECs") is a true statement and passes.
 * Reverse forms are caught too: IICRC or CEC followed within three words by an "accredit" word ("the
 * IICRC has accredited", "IICRC CEC provider accreditation"), and "accreditation from/by the IICRC".
 * "nationally accredited" (VET qualifications) is a different claim and passes.
 */
export const RETIRED_PROVIDER_WORDING =
  /\b(?:IICRC|CECs?)[\s-]+accredit\w*|\baccredit\w*[\s-]+(?:IICRC|CECs?)\b|\baccredited[\s-]+provider\b|(?<!\b(?:not|never)(?:[\s-]+\w+)?[\s-]+)\baccredited(?:[\s-]+[\w'’]+){0,4}?[\s-]+(?:IICRC|CECs?)\b|\b(?:IICRC|CECs?)(?:[\s-]+[\w'’]+){0,3}?[\s-]+(?<!nationally[\s-]+)accredit\w*|\baccreditation[\s-]+(?:from|by|with)[\s-]+(?:the[\s-]+)?(?:IICRC|CECs?)\b/gi;

/**
 * GP-771: an unqualified "accredited" claim about CARSI, with no IICRC or CEC named ("CARSI is fully
 * accredited."). CARSI is not accredited by anyone; it is an IICRC Approved CEC Provider and issues
 * its own designations. The proximity rule is grammatical, not a word window: the "accredit" word
 * must be said OF CARSI (or "we" / "our courses") in one of four shapes, with nothing between them
 * except words from the closed lists below:
 *   1. attached: "CARSI accreditation", "CARSI's accreditation", "CARSI-accredited";
 *   2. a linking verb: "CARSI (courses) is/are/'s (an/fully/nationally/...) accredited",
 *      "we are / we're (an) accredited", "our courses are accredited";
 *   3. possession: "CARSI holds/has/earned (full/national) accreditation", "our accreditation";
 *   4. agent: "accredited by/through/with CARSI".
 * So a negation ("CARSI is not accredited", "does not award nationally accredited VET
 * qualifications"), a question ("Is CARSI accredited?": shape 1 does not match after an auxiliary
 * that opens a question, and the others need CARSI before the verb) and "accredited" about another body
 * ("CARSI recommends a NATA-accredited laboratory") do not match. "nationally accredited" is not
 * exempt here: "CARSI courses are nationally accredited" is false (CARSI is not an RTO).
 */
const SEP = '[\\s-]+';
const CARSI_THING =
  '(?:own[\\s-]+)?(?:courses?|training|programs?|programmes?|classes|designations?|credentials?|certificates?|qualifications?)';
const SUBJECT = `(?:CARSI(?:['’]s)?(?:${SEP}${CARSI_THING})?|we|our${SEP}${CARSI_THING})`;
const LINK = `(?:${SEP}(?:is|are|was|were|has${SEP}been|have${SEP}been|remains?|becomes?|became)|['’](?:s|re))`;
const MODIFIER =
  '(?:an?|the|now|also|fully|officially|nationally|internationally|formally|properly|independently|government|industry|and)';
export const CARSI_ACCREDITED_CLAIM = new RegExp(
  [
    // Not after an auxiliary that opens a question ("Is CARSI accredited?").
    `(?<!\\b(?:is|are|was|were|isn['’]t|aren['’]t|wasn['’]t)${SEP})\\bCARSI(?:['’]s)?${SEP}accredit\\w*`,
    `\\b${SUBJECT}${LINK}(?:${SEP}${MODIFIER})*${SEP}accredit\\w*`,
    `\\b(?:CARSI|we)${SEP}(?:holds?|has|have|gained|earned|received|achieved|obtained)${SEP}(?:(?:full|national|formal|official|government)${SEP})?accreditations?\\b`,
    `\\bour${SEP}accreditations?\\b`,
    `\\baccredit\\w*${SEP}(?:by|through|with)${SEP}CARSI\\b`,
  ].join('|'),
  'gi'
);

/**
 * Dated records of the past: audits, handoffs, session notes, specs, decision logs and applied
 * database migrations. They describe what was true or what was found then; rewriting them would
 * falsify the record. A path ending in "/" matches by prefix; any other path matches exactly.
 */
const HISTORICAL = [
  'docs/audit/',
  'docs/session-handoffs/',
  'docs/sessions/',
  'docs/plans/archive/',
  'docs/specs/',
  'docs/ai-demonstration/source-of-truth/history/',
  'docs/superpowers/specs/',
  'docs/agent-framework/GAP-BACKLOG-2026-08-07.md',
  'docs/agent-framework/PIPELINE.md',
  'docs/governance/BACKLOG.md',
  'docs/governance/DECISIONS.md',
  'docs/governance/GOAL.md',
  'docs/CONTENT_PARITY_AUDIT.md',
  'docs/runbooks/course-go-live.md',
  'docs/compliance/licence-inventory.csv',
  'prisma/migrations/',
  'db/ops/',
  'scripts/audit/',
];

/**
 * Detectors: guard scripts and tests that must spell the retired wording to catch it. None of them
 * is served. Exact paths only.
 */
const DETECTORS = [
  // Dated record that quotes the retired wording as its "before" text.
  'docs/governance/reports/gp-525-carpet-cec-reconciliation.md',
  // Header comment quotes the founder rule, which uses the retired phrase.
  'scripts/check-iicrc-scope.mjs',
  'scripts/check-iicrc-compliance.mjs',
  'scripts/check-iicrc-compliance.test.mjs',
  'scripts/check-iicrc-terminology.mjs',
  'scripts/check-iicrc-terminology.test.mjs',
  'scripts/check-live-catalogue.mjs',
  'scripts/check-live-catalogue.test.mjs',
  'scripts/check-live-courses-money-path.test.mjs',
  'scripts/check-live-guards.fixture-test.mjs',
  'scripts/licence-inventory.mjs',
  'scripts/probe-iicrc-guard-allows.mjs',
  'src/components/pricing/PricingTiers.test.tsx',
  'src/lib/course-kit/iicrc-phrases.test.ts',
  'src/lib/marketing/industry-faq-licence.test.ts',
  'src/lib/marketing/licence-copy-sweep.test.ts',
  'src/lib/marketing/licence-inventory.test.ts',
  'src/lib/marketing/public-claims-guard.test.ts',
  'src/lib/seo/neosan-claims.test.ts',
  'src/lib/server/public-catalogue-facts.branding.test.ts',
  // This guard: its pattern controls spell the retired wording on purpose.
  'src/lib/iicrc/approved-provider-wording.test.tsx',
];

/**
 * Files owned by another open change. The owner removes the wording; this test then fails until
 * the entry is deleted, so the list only shrinks. A prefix entry stays only while at least one
 * file under it still matches.
 */
const PENDING: Record<string, string> = {
  'data/seed/': 'GP-748 (PR #1205): seed copy; the founder runs the seed',
  'data/courses/': 'GP-748 (PR #1205): course research and drafts',
  'data/course-content/': 'GP-749: lesson content',
  'data/CARSI_Specialty_Courses_Collection.txt': 'GP-749: legacy course text',
  'docs/course-content/': 'GP-749: workshop course content',
};

/** Served PDFs whose text still carries the wording, with the owner who regenerates them. */
const PENDING_PDFS: Record<string, string> = {};

const BINARY =
  /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|mp4|mov|webm|mp3|wav|woff2?|ttf|otf|zip|gz|lock)$/i;

// Untracked, non-ignored files are scanned too, so a local run sees a new file before it is
// committed (a committed-only scan let this guard pass on its own uncommitted file).
// Listed once per run: every test below shares this listing and the read cache further down.
let listing: string[] | null = null;
function repoFiles(): string[] {
  listing ??= execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }
  )
    .split('\0')
    .filter(Boolean);
  return listing;
}

function trackedTextFiles(): string[] {
  return repoFiles().filter((f) => !BINARY.test(f));
}

/** Served PDFs, listed from the unfiltered file list (the text list drops binaries). */
function servedPdfs(): string[] {
  return repoFiles().filter((f) => /^public\/.*\.pdf$/i.test(f));
}

/** Every match of both rules in already-visible text (rendered markup, JSON, PDF text). */
function matchesIn(text: string): string[] {
  return [...text.matchAll(RETIRED_PROVIDER_WORDING), ...text.matchAll(CARSI_ACCREDITED_CLAIM)].map(
    (m) => m[0]
  );
}

/**
 * Matches in a source file, with the 1-based line each starts on (GP-771). The raw text is read,
 * then both reading views, so a phrase split across JSX tags, `{' '}`, literals, entities or line
 * breaks is seen the way a visitor sees it. A match found twice on one line is reported once.
 */
function sourceHits(src: string, file = ''): { line: number; match: string }[] {
  const hits: { line: number; match: string }[] = [];
  const seen = new Set<string>();
  const add = (line: number, match: string) => {
    const key = `${line}\u0000${match.replace(/\s+/g, ' ').toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ line, match });
  };
  for (const re of [RETIRED_PROVIDER_WORDING, CARSI_ACCREDITED_CLAIM]) {
    for (const m of src.matchAll(re)) add(src.slice(0, m.index).split('\n').length, m[0]);
    for (const view of readingViews(src, { markdown: /\.mdx?$/i.test(file) }))
      for (const m of view.text.matchAll(re)) add(sourceLine(src, view, m.index), m[0]);
  }
  return hits;
}

function covered(file: string, list: Record<string, string> | string[]): string | null {
  const keys = Array.isArray(list) ? list : Object.keys(list);
  return keys.find((k) => (k.endsWith('/') ? file.startsWith(k) : file === k)) ?? null;
}

/**
 * Cheap pre-check before the reading views are built. The views walk every character of every
 * file twice, which timed the whole-tree scan out on a busy machine.
 *
 * Every match of both rules contains "accredit", so a file can be flagged only if one of its
 * reading views spells that word. Unless the file holds a character reference (`&#...;`), a `\x`
 * or `\u` escape, or an HTML comment (these can make a letter out of non-letters, or hide `<` and
 * `>`), every letter in a view is the same letter of the source, in source order. Between two
 * letters that sit side by side in a view, the source can hold only what the view drops or turns
 * into nothing: non-letters, markup tags, `&shy;`, and the `\b` `\f` `\v` escapes. PRE_CHECK allows
 * exactly those gaps between the eight letters, so it is true for every file the full scan can
 * flag. Each gap can be read only one way, which keeps the search linear.
 */
const GAP = String.raw`(?:[^A-Za-z<&\\]|<[^<>A-Za-z]*[A-Za-z][^<>]*>|<|&shy;|&|\\[bfv]|\\)*`;
export const PRE_CHECK = new RegExp([...'accredit'].join(GAP), 'i');
const VIEW_MAKES_LETTERS = /&#|\\[xu]|<!--/;

export function couldBeFlagged(src: string): boolean {
  return VIEW_MAKES_LETTERS.test(src) || PRE_CHECK.test(src);
}

/**
 * The text of every regular tracked file whose working copy matches the index, read in ONE stream
 * from git's object store. Opening thousands of files one by one on a busy disk is what timed this
 * guard out; one `git cat-file --batch` stream reads the same bytes in a few large reads. Files that
 * differ from the index (`git diff`), untracked files, symlinks, submodules and unmerged entries are
 * left out, so readText() reads them from disk and the scan still sees uncommitted work.
 */
function cleanTrackedTexts(): Map<string, string> {
  const git = (args: string[], input?: string) =>
    execFileSync('git', args, { cwd: ROOT, input, maxBuffer: 512 * 1024 * 1024 });
  const changed = new Set(git(['diff', '--name-only', '-z']).toString('utf8').split('\0'));
  const wanted: { path: string; oid: string }[] = [];
  for (const entry of git(['ls-files', '-s', '-z']).toString('utf8').split('\0')) {
    const tab = entry.indexOf('\t');
    if (tab < 0) continue;
    const [mode, oid, stage] = entry.slice(0, tab).split(' ');
    const path = entry.slice(tab + 1);
    const regular = mode === '100644' || mode === '100755';
    if (regular && stage === '0' && !changed.has(path) && !BINARY.test(path))
      wanted.push({ path, oid });
  }
  const out = git(['cat-file', '--batch'], wanted.map((w) => w.oid).join('\n') + '\n');
  const result = new Map<string, string>();
  let pos = 0;
  for (const { path, oid } of wanted) {
    const eol = out.indexOf(10, pos);
    const [gotOid, type, size] = out.toString('latin1', pos, eol).split(' ');
    if (gotOid !== oid || type !== 'blob')
      throw new Error(`git cat-file: unexpected ${gotOid} ${type}`);
    const start = eol + 1;
    const end = start + Number(size);
    result.set(join(ROOT, path), out.toString('utf8', start, end));
    pos = end + 1;
  }
  return result;
}

/** Each file is read once per run, by whichever test reaches it first. */
const texts = new Map<string, string | null>();
let primed = false;
function readText(path: string): string | null {
  if (!primed && path.startsWith(ROOT)) {
    primed = true;
    for (const [p, text] of cleanTrackedTexts()) texts.set(p, text);
  }
  if (!texts.has(path)) {
    let text: string | null;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      text = null;
    }
    texts.set(path, text);
  }
  return texts.get(path) ?? null;
}

type Hit = { line: number; match: string };

/** Hits in one file under `root`: read once, pre-checked, then scanned. Null when unreadable. */
const hitCache = new Map<string, Hit[] | null>();
function fileHits(root: string, file: string): Hit[] | null {
  const path = join(root, file);
  if (!hitCache.has(path)) {
    const text = readText(path);
    hitCache.set(path, text === null ? null : couldBeFlagged(text) ? sourceHits(text, file) : []);
  }
  return hitCache.get(path) ?? null;
}

/** Offender lines for `files` under `root`, outside the allow-lists. The one owner of the scan. */
function offendersIn(root: string, files: string[]): string[] {
  const offenders: string[] = [];
  for (const file of files) {
    if (covered(file, HISTORICAL) || covered(file, DETECTORS) || covered(file, PENDING)) continue;
    const hits = fileHits(root, file);
    if (hits?.length)
      offenders.push(
        `${file}: ${[...new Set(hits.map((h) => `L${h.line} ${h.match.replace(/\s+/g, ' ')}`))].join(' | ')}`
      );
  }
  return offenders;
}

/** Visible text of server-rendered markup: tags dropped, common entities decoded, spaces folded. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

describe('the retired-wording pattern (positive and negative controls)', () => {
  const retired = [
    'IICRC CEC ' + 'Accredited',
    'CEC-' + 'accredited',
    'IICRC ' + 'accredited',
    'an accredited ' + 'IICRC CEC provider',
    'CEC ' + 'accreditation',
    // GP-704 review round 1: a few words between "accredited" and the IICRC.
    'CARSI is accredited as an ' + 'IICRC CEC provider',
    'CARSI courses are accredited by the ' + 'IICRC',
    // Reverse forms (GP-704, before review round 3).
    'the IICRC has ' + 'accredited CARSI',
    'IICRC CEC provider ' + 'accreditation',
    'accreditation from the ' + 'IICRC',
  ];
  for (const s of retired) {
    it(`flags "${s}"`, () => {
      expect(matchesIn(s)).not.toHaveLength(0);
    });
  }
  const allowed = [
    CARSI_PROVIDER_STATUS,
    APPROVED_FOR_IICRC_CECS,
    'not a nationally accredited VET qualification',
    'accredited by the RTO',
    'CARSI courses are not accredited by the IICRC',
    'it is not nationally accredited and awards no IICRC CECs',
    'confusing CECs with nationally accredited VET qualifications',
    'IICRC (iicrc.org) is a non-profit, ANSI-accredited standards body',
  ];
  for (const s of allowed) {
    it(`leaves "${s}" alone`, () => {
      expect(matchesIn(s)).toHaveLength(0);
    });
  }
});

/**
 * GP-771 controls. Each `catch` case is source text a visitor reads as the retired or unqualified
 * wording; each `clean` twin is the approved phrasing in the same markup and must pass.
 * Words are split with '' + '' so this file's own source does not spell the cases.
 */
describe('GP-771: wording split across JSX tags and expressions', () => {
  const A = 'Accre' + 'dited';
  const a = 'accre' + 'dited';
  const catches = [
    `<p>CARSI is an IICRC <strong>${A}</strong> provider.</p>`,
    `<p>IICRC{' '}${A} courses</p>`,
    `<p>IICRC{" "}CEC{' '}${A}</p>`,
    `<span>IICRC</span> <b>${a}</b>`,
    `<p>IICRC&nbsp;${A}</p>`,
    `<p>courses ${a} by the{' '}\n  <a href="/about">IICRC</a></p>`,
    `<p>{'IICRC'} {"${a}"}</p>`,
    `<p>IICRC {\`CEC\`} ${A}</p>`,
    `<p>IICRC accre<span>dited</span></p>`,
    `<p>IICRC<!-- --> ${A}</p>`,
  ];
  for (const src of catches) {
    it(`flags ${JSON.stringify(src)}`, () => {
      expect(sourceHits(src)).not.toHaveLength(0);
    });
  }
  const clean = [
    `<p>CARSI is an IICRC <strong>Approved CEC Provider</strong>.</p>`,
    `<p>${CARSI_PROVIDER_STATUS}</p>`,
    `<p>IICRC{' '}Continuing Education Credit (CEC) hours</p>`,
    `<p>{'IICRC'} {"Approved CEC Provider"}</p>`,
    `<p>${APPROVED_FOR_IICRC_CECS}</p>{' '}<p>Not a nationally ${a} VET qualification.</p>`,
    `<p>Courses are not ${a} by the{' '}<a href="/about">IICRC</a>.</p>`,
    `const isAccredited = flag; <p>{isAccredited ? 'IICRC' : null}</p>`,
  ];
  for (const src of clean) {
    it(`leaves ${JSON.stringify(src)} alone`, () => {
      expect(sourceHits(src)).toEqual([]);
    });
  }
  it('reads markdown emphasis the way the rendered page shows it', () => {
    // docs/iicrc-compliance.md carried this shape; the old guard missed it.
    expect(sourceHits(`courses ${a} by the **IICRC**.`, 'x.md')).not.toHaveLength(0);
    expect(sourceHits(`an __IICRC__ ${A} provider`, 'x.md')).not.toHaveLength(0);
    expect(sourceHits(`CARSI is an **${IICRC_APPROVED_CEC_PROVIDER}**.`, 'x.md')).toEqual([]);
  });
  it('reports a split match on the source line it starts on', () => {
    const src = `line one\nline two\n<p>IICRC{' '}\n  <strong>${A}</strong></p>\n`;
    expect(sourceHits(src).map((h) => h.line)).toEqual([3]);
  });
});

describe('GP-771: unqualified "accredited" claims about CARSI', () => {
  const a = 'accre' + 'dited';
  const catches = [
    `CARSI is fully ${a}.`,
    `CARSI courses are nationally ${a}.`,
    `CARSI's accre` + `ditation means employers trust the course.`,
    `CARSI is an ${a} training organisation.`,
    `CARSI-${a} training`,
    `CARSI holds full accre` + `ditation.`,
    `We are fully ${a}.`,
    `We're an ${a} training school.`,
    `Our courses are ${a}.`,
    `Training ${a} by CARSI`,
    `<p>CARSI is fully <strong>${a}</strong>.</p>`,
  ];
  for (const src of catches) {
    it(`flags ${JSON.stringify(src)}`, () => {
      expect(sourceHits(src)).not.toHaveLength(0);
    });
  }
  const clean = [
    CARSI_PROVIDER_STATUS,
    `CARSI is an ${IICRC_APPROVED_CEC_PROVIDER}.`,
    'CARSI is an IICRC Approved CEC Provider (Continuing Education Credit).',
    // True VET negations (GP-771 acceptance).
    `CARSI does not award nationally ${a} VET qualifications.`,
    `CARSI is not an RTO and its courses are not nationally ${a}.`,
    `CARSI isn't ${a} by any VET regulator.`,
    `We do not claim accre` + `ditation.`,
    // A question is not a claim.
    `Can CARSI award nationally ${a} Australian qualifications?`,
    `Is CARSI ${a}?`,
    // "accredited" about another body, with CARSI nearby but not its subject.
    `CARSI recommends a NATA-${a} laboratory for mould sampling.`,
    `The laboratory is NATA ${a}.`,
    `Our team uses ${a} laboratories.`,
  ];
  for (const src of clean) {
    it(`leaves ${JSON.stringify(src)} alone`, () => {
      expect(sourceHits(src)).toEqual([]);
    });
  }
});

describe('tracked source carries no retired provider wording', () => {
  const files = trackedTextFiles();

  it('scans the whole tree', () => {
    expect(files.length).toBeGreaterThan(1000);
    expect(files).toContain('src/components/landing/PublicFooter.tsx');
  });

  it('no file outside the allow-lists uses it', () => {
    expect(offendersIn(ROOT, files)).toEqual([]);
  });

  // The pre-check skips files, so prove on disk that it never skips one the full scan would flag:
  // one planted file per way a reading view can assemble the word, run through the same scan.
  it('the scan still flags every split shape planted in a file', () => {
    const w = 'accre' + 'dited';
    const W = w.toUpperCase();
    const plants: Record<string, string> = {
      'inline-tag.tsx': `<p>IICRC accre<span>dited</span></p>`,
      'upper-tag.tsx': `<p>IICRC ACCRE<b>DITED</b></p>`,
      'comment.tsx': `<p>IICRC accre<!-- a > b -->dited</p>`,
      'soft-hyphen.html': `<p>IICRC accre&shy;dited</p>`,
      'decimal-ref.tsx': `<p>IICRC &#97;ccredited</p>`,
      'hex-ref.tsx': `<p>IICRC &#x61;ccredited</p>`,
      // Plain concatenation: the test transform may rewrite escapes inside String.raw templates.
      'hex-escape.tsx': "<p>IICRC {'\\x61ccredited'}</p>",
      'unicode-escape.tsx': "<p>IICRC {'\\u0061ccredited'}</p>",
      'jsx-literals.tsx': `<p>IICRC {'accre'}{"dited"}</p>`,
      'template-literal.tsx': '<p>IICRC {`accre`}{`dited`}</p>',
      'backspace-escape.tsx': "<p>IICRC {'accre\\bdited'}</p>",
      'line-continuation.tsx': `<p>IICRC {'accre\\\ndited'}</p>`,
      'markdown.md': `Courses ac**cred**ited by the IICRC.`,
      'carsi-claim.tsx': `<p>CARSI is fully accre<em>dited</em>.</p>`,
      'plain.ts': `const s = 'IICRC ${w}';`,
      'plain-upper.txt': `IICRC ${W}`,
    };
    const dir = mkdtempSync(join(tmpdir(), 'provider-wording-'));
    try {
      for (const [name, src] of Object.entries(plants)) writeFileSync(join(dir, name), src);
      writeFileSync(join(dir, 'clean.tsx'), `<p>${IICRC_APPROVED_CEC_PROVIDER}</p>`);
      const flagged = offendersIn(dir, [...Object.keys(plants), 'clean.tsx']).map(
        (o) => o.split(':')[0]
      );
      expect(flagged.sort()).toEqual(Object.keys(plants).sort());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('the pre-check lets ordinary source through without building the views', () => {
    expect(couldBeFlagged(`export const x = <p className="a">IICRC {'CEC'} hours</p>;`)).toBe(
      false
    );
    expect(couldBeFlagged(`Nationally recognised; see the IICRC.`)).toBe(false);
    // A clean file that merely holds the word still goes to the full scan.
    expect(couldBeFlagged(`not ${'accre' + 'dited'} by anyone`)).toBe(true);
  });

  it('every PENDING entry still needs to be there (the list only shrinks)', () => {
    const stale: string[] = [];
    for (const [entry, owner] of Object.entries(PENDING)) {
      const scope = entry.endsWith('/')
        ? files.filter((f) => f.startsWith(entry))
        : files.filter((f) => f === entry);
      const dirty = scope.some((f) => (fileHits(ROOT, f)?.length ?? 0) > 0);
      if (!dirty) stale.push(`${entry} (${owner})`);
    }
    expect(stale).toEqual([]);
  });

  it('every allow-listed exact path still exists and still needs the entry', () => {
    const missing = [...HISTORICAL, ...DETECTORS]
      .filter((k) => !k.endsWith('/'))
      .filter((k) => !files.includes(k) || (fileHits(ROOT, k)?.length ?? 0) === 0);
    expect(missing).toEqual([]);
  });

  // pdf-lib refuses a jsdom-realm Buffer, so the text is read in a plain Node process.
  const PDF_TEXT_SCRIPT =
    "const { pdfText } = await import(process.argv[1]); const raw = await pdfText(process.argv[2]); process.stdout.write(Array.isArray(raw) ? raw.join(' ') : String(raw));";
  const pdfText = (path: string) =>
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        PDF_TEXT_SCRIPT,
        pathToFileURL(join(ROOT, 'scripts/pdf-text.mjs')).href,
        path,
      ],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
    );

  /** Problems in the served PDFs, given the pending exemptions. One owner for the PDF rule. */
  function pdfProblems(pending: Record<string, string>): string[] {
    const problems: string[] = [];
    for (const pdf of servedPdfs()) {
      const text = pdfText(join(ROOT, pdf)).replace(/\s+/g, ' ');
      if (text.trim().length < 200) problems.push(`${pdf}: no text extracted`);
      const dirty = matchesIn(text).length > 0;
      if (dirty && !pending[pdf]) problems.push(`${pdf}: carries the retired wording`);
      if (!dirty && pending[pdf]) problems.push(`${pdf}: clean now, remove it from PENDING_PDFS`);
    }
    return problems;
  }

  // GP-704 review round 2: the PDF loop once read a list with every PDF filtered out, so it
  // could not fail. These controls fail if it reads nothing, misses a pending PDF, or cannot
  // see the wording in a PDF that carries it.
  it('the PDF check sees every served PDF and fires without its exemptions', () => {
    const pdfs = servedPdfs();
    expect(pdfs.length).toBeGreaterThan(0);
    expect(Object.keys(PENDING_PDFS).filter((k) => !pdfs.includes(k))).toEqual([]);
    const withoutExemptions = pdfProblems({});
    for (const pdf of Object.keys(PENDING_PDFS))
      expect(withoutExemptions).toContain(`${pdf}: carries the retired wording`);
    // GP-770: with no PDF pending, prove the text read reaches the provider sentence itself. The
    // guide states CARSI's standing; if the extraction lost that line, the scan above could not
    // see the retired wording there either.
    const guide = pdfText(join(ROOT, 'public/downloads/carsi-government-contractor-guide.pdf'));
    expect(guide.replace(/\s+/g, ' ')).toContain(CARSI_PROVIDER_STATUS);
  }, 60_000);

  it('served PDFs carry no retired wording outside PENDING_PDFS (and pending ones still need it)', () => {
    expect(pdfProblems(PENDING_PDFS)).toEqual([]);
  }, 60_000);

  // The phrase on any code line (string, template or JSX text, even alone on its line);
  // comment lines may name it.
  const QUOTED_PHRASE = new RegExp(IICRC_APPROVED_CEC_PROVIDER, 'i');

  it('pages and components use the module rather than retyping the phrase', () => {
    const retyped = files.filter(
      (f) =>
        /^(?:app|src)\/.*\.(?:ts|tsx)$/.test(f) &&
        !/\.test\.tsx?$/.test(f) &&
        !f.startsWith('src/lib/iicrc/approved-wording') &&
        !f.startsWith('src/lib/iicrc/approved-provider-wording') &&
        (readText(join(ROOT, f)) ?? '')
          .split('\n')
          .some((line) => !/^\s*(?:\/\/|\*|\/\*)/.test(line) && QUOTED_PHRASE.test(line))
    );
    expect(retyped).toEqual([]);
  });
});

describe('rendered site-wide surfaces state the approved provider wording', () => {
  it('the footer, in both tones', async () => {
    const { PublicFooter } = await import('@/components/landing/PublicFooter');
    for (const tone of ['chrome', 'light'] as const) {
      const text = visibleText(renderToStaticMarkup(createElement(PublicFooter, { tone })));
      expect(matchesIn(text)).toEqual([]);
      expect(text).toContain(IICRC_APPROVED_CEC_PROVIDER);
    }
  });

  it('the sign-in, register and password pages', async () => {
    const pages = [
      (await import('../../../app/(auth)/login/page')).default,
      (await import('../../../app/(auth)/register/page')).default,
      (await import('../../../app/(auth)/forgot-password/page')).default,
    ];
    for (const Page of pages) {
      const el = await (Page as (p: unknown) => Promise<React.ReactElement> | React.ReactElement)({
        searchParams: Promise.resolve({}),
      });
      const text = visibleText(renderToStaticMarkup(el));
      expect(matchesIn(text)).toEqual([]);
      expect(text).toContain(FROM_IICRC_APPROVED_CEC_PROVIDER);
    }
  });

  it('the support and terms pages', async () => {
    const pages = [
      (await import('../../../app/(public)/support/page')).default,
      (await import('../../../app/(public)/terms/page')).default,
    ];
    for (const Page of pages) {
      const text = visibleText(
        renderToStaticMarkup(createElement(Page as () => React.ReactElement))
      );
      expect(matchesIn(text)).toEqual([]);
    }
  });

  it('the root metadata (title, description, OpenGraph, Twitter)', async () => {
    const { metadata } = await import('../../../app/layout');
    expect(matchesIn(JSON.stringify(metadata))).toEqual([]);
  });

  it('the emails that state CARSI standing', async () => {
    const email = await import('@/lib/server/email-templates');
    const guide = email.renderGovContractorGuideEmail({
      appOrigin: 'https://carsi.com.au',
      downloadUrl: 'https://carsi.com.au/x.pdf',
    });
    expect(matchesIn(JSON.stringify(guide))).toEqual([]);
    expect(guide.text).toContain(CARSI_PROVIDER_STATUS);
    const welcome = email.renderRegistrationWelcomeEmail({
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      dashboardUrl: 'https://carsi.com.au/dashboard',
    });
    expect(matchesIn(JSON.stringify(welcome))).toEqual([]);
  });

  it('the static AI citation pack in public/ carries the module sentence', () => {
    const md = readFileSync(join(ROOT, 'public/carsi-ai-citation-pack.md'), 'utf8');
    expect(md).toContain(CARSI_PROVIDER_STATUS);
    const json = readFileSync(join(ROOT, 'public/carsi-citation-pack.json'), 'utf8');
    expect(json).toContain(CARSI_PROVIDER_STATUS);
  });
});
