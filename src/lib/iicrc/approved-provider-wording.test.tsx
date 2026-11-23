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
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
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
  'src/components/seo/JsonLd.tsx':
    'GP-748 (PR #1205) rewrites this file; fix the credential line after it merges',
  'src/components/lms/CoursePublicDetail.tsx':
    'GP-748 (PR #1205) rewrites this file; fix the provider line after it merges',
  'src/lib/certificate/CertificateArt.tsx':
    'certificate wording builder (fix/certificate-cec-wording)',
  'src/components/lms/diagrams/CertificatePreview.tsx':
    'certificate wording builder (fix/certificate-cec-wording)',
  'app/(dashboard)/dashboard/student/credentials/page.tsx':
    'certificate wording builder (fix/certificate-cec-wording)',
  'app/(public)/verify/credential/[credentialId]/page.tsx':
    'certificate wording builder (fix/certificate-cec-wording)',
  'docs/marketing/': 'GP-770: unsent marketing drafts',
  'docs/campaigns/': 'GP-770: unsent marketing drafts',
  'docs/cec-submissions/': 'GP-770: unsent marketing drafts',
  'docs/content/': 'GP-770: unsent marketing drafts',
  'docs/course-content/': 'GP-749: workshop course content',
};

/** Served PDFs whose text still carries the wording, with the owner who regenerates them. */
const PENDING_PDFS: Record<string, string> = {
  'public/downloads/carsi-government-contractor-guide.pdf':
    'PR #1194 changes this PDF; regenerate it from scripts/generate-lead-magnet-pdf.mjs (already fixed) after that merges',
};

const BINARY =
  /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|mp4|mov|webm|mp3|wav|woff2?|ttf|otf|zip|gz|lock)$/i;

// Untracked, non-ignored files are scanned too, so a local run sees a new file before it is
// committed (a committed-only scan let this guard pass on its own uncommitted file).
function repoFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean);
}

function trackedTextFiles(): string[] {
  return repoFiles().filter((f) => !BINARY.test(f));
}

/** Served PDFs, listed from the unfiltered file list (the text list drops binaries). */
function servedPdfs(): string[] {
  return repoFiles().filter((f) => /^public\/.*\.pdf$/i.test(f));
}

function matchesIn(text: string): string[] {
  return [...text.matchAll(RETIRED_PROVIDER_WORDING)].map((m) => m[0]);
}

function covered(file: string, list: Record<string, string> | string[]): string | null {
  const keys = Array.isArray(list) ? list : Object.keys(list);
  return keys.find((k) => (k.endsWith('/') ? file.startsWith(k) : file === k)) ?? null;
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

describe('tracked source carries no retired provider wording', () => {
  const files = trackedTextFiles();

  it('scans the whole tree', () => {
    expect(files.length).toBeGreaterThan(1000);
    expect(files).toContain('src/components/landing/PublicFooter.tsx');
  });

  it('no file outside the allow-lists uses it', () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (covered(file, HISTORICAL) || covered(file, DETECTORS) || covered(file, PENDING)) continue;
      let text: string;
      try {
        text = readFileSync(join(ROOT, file), 'utf8');
      } catch {
        continue;
      }
      const hits = matchesIn(text);
      if (hits.length) offenders.push(`${file}: ${[...new Set(hits)].join(' | ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('every PENDING entry still needs to be there (the list only shrinks)', () => {
    const stale: string[] = [];
    for (const [entry, owner] of Object.entries(PENDING)) {
      const scope = entry.endsWith('/')
        ? files.filter((f) => f.startsWith(entry))
        : files.filter((f) => f === entry);
      const dirty = scope.some((f) => matchesIn(readFileSync(join(ROOT, f), 'utf8')).length > 0);
      if (!dirty) stale.push(`${entry} (${owner})`);
    }
    expect(stale).toEqual([]);
  });

  it('every allow-listed exact path still exists and still needs the entry', () => {
    const missing = [...HISTORICAL, ...DETECTORS]
      .filter((k) => !k.endsWith('/'))
      .filter(
        (k) => !files.includes(k) || matchesIn(readFileSync(join(ROOT, k), 'utf8')).length === 0
      );
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
        readFileSync(join(ROOT, f), 'utf8')
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
