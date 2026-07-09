/**
 * Live IICRC-claims audit (C6 of the IICRC-compliance spec) — repeatable version of the
 * 2026-07-09 crawl.
 *
 * Crawls the live site's sitemap, fetches every page, and reports:
 *   1. Banned-pattern hits (the same rule set as the course-kit scanner /
 *      check-iicrc-terminology guard — src/lib/course-kit/iicrc-phrases.ts), and
 *   2. A numeric-CEC census: every page displaying a specific CEC-hour claim, which is
 *      only legitimate for a course with a recorded approval in
 *      data/seed/cec-approvals.json (the SSOT).
 *
 * Read-only (GET requests against the public site). Exit code 1 when banned patterns are
 * found OR a numeric CEC claim appears for a slug without a registry approval.
 *
 *   npx tsx scripts/audit-live-iicrc-claims.ts                 # crawl carsi.com.au
 *   npx tsx scripts/audit-live-iicrc-claims.ts --base https://carsi-web-sandbox.example
 *   npx tsx scripts/audit-live-iicrc-claims.ts --courses-only  # only /courses/* pages
 */
import { BANNED_PHRASE_RULES } from '../src/lib/course-kit/iicrc-phrases';
import { getApprovedCecSlugs } from '../src/lib/seed/cec-approvals';

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const BASE = (baseIdx !== -1 ? args[baseIdx + 1] : 'https://www.carsi.com.au').replace(/\/$/, '');
const COURSES_ONLY = args.includes('--courses-only');
const CONCURRENCY = 6;
const TIMEOUT_MS = 20_000;

/** Specific CEC-hour claim (mirrors CEC_NUMBER in scripts/check-iicrc-compliance.mjs). */
const CEC_NUMBER =
  /\b\d+(?:\.\d+)?\s*IICRC\s+(?:CEC|Continuing[\s-]+Education[\s-]+Credit)|\((?:IICRC\s+)?CEC\)\s*:?\s*\d+(?:\.\d+)?\s*Hours?|\b\d+(?:\.\d+)?\s*CEC\s+hours?\b/i;
/** Recert-requirement facts describe the IICRC program, not a CARSI course. */
const CEC_NUMBER_ALLOW =
  /\bper\s+(?:\d+[\s-]*year|cycle|recert|renewal)|every\s+\d+\s+years|recertification|maintain(?:ing)?\s+(?:an?\s+)?(?:existing\s+)?IICRC/i;

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'carsi-iicrc-claims-audit/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

type PageResult = {
  url: string;
  bannedHits: Array<{ message: string; snippet: string }>;
  cecClaims: string[];
  error?: string;
};

async function auditPage(url: string): Promise<PageResult> {
  const result: PageResult = { url, bannedHits: [], cecClaims: [] };
  let text: string;
  try {
    text = htmlToText(await fetchText(url));
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }

  for (const rule of BANNED_PHRASE_RULES) {
    const m = rule.re.exec(text);
    if (m && !(rule.allow && rule.allow.test(text))) {
      const at = Math.max(0, (m.index ?? 0) - 60);
      result.bannedHits.push({ message: rule.message, snippet: text.slice(at, at + 160) });
    }
  }

  const cecMatch = CEC_NUMBER.exec(text);
  if (cecMatch && !CEC_NUMBER_ALLOW.test(text.slice(Math.max(0, cecMatch.index - 120), cecMatch.index + 160))) {
    result.cecClaims.push(cecMatch[0].trim());
  }

  return result;
}

async function main() {
  console.log(`IICRC live-claims audit — ${BASE} (${new Date().toISOString()})\n`);

  const sitemapXml = await fetchText(`${BASE}/sitemap.xml`);
  let urls = [...sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  if (COURSES_ONLY) urls = urls.filter((u) => /\/courses\//.test(u));
  urls = [...new Set(urls)];
  console.log(`Sitemap URLs to audit: ${urls.length}${COURSES_ONLY ? ' (courses only)' : ''}`);

  const results: PageResult[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, urls.length) }, async () => {
      while (cursor < urls.length) {
        const url = urls[cursor++];
        results.push(await auditPage(url));
      }
    })
  );

  const errors = results.filter((r) => r.error);
  const banned = results.filter((r) => r.bannedHits.length > 0);
  const cecPages = results.filter((r) => r.cecClaims.length > 0);
  const approvedSlugs = getApprovedCecSlugs();
  const unapprovedCecPages = cecPages.filter(
    (r) => !approvedSlugs.some((slug) => r.url.includes(slug))
  );

  console.log('\n=== Summary ===');
  console.log(`Pages audited:            ${results.length}`);
  console.log(`Fetch errors:             ${errors.length}`);
  console.log(`Banned-pattern pages:     ${banned.length}`);
  console.log(`Numeric-CEC census:       ${cecPages.length} page(s) display a specific CEC-hour claim`);
  console.log(`  …without registry approval: ${unapprovedCecPages.length}`);
  console.log(`Registry-approved slugs:  ${approvedSlugs.length ? approvedSlugs.join(', ') : '(none — registry is empty)'}`);

  if (banned.length > 0) {
    console.log('\n--- Banned-pattern hits ---');
    for (const r of banned) {
      for (const h of r.bannedHits) {
        console.log(`  ${r.url}\n    ${h.message}\n    → …${h.snippet}…`);
      }
    }
  }

  if (cecPages.length > 0) {
    console.log('\n--- Numeric-CEC census ---');
    for (const r of cecPages) {
      const ok = approvedSlugs.some((slug) => r.url.includes(slug));
      console.log(`  ${ok ? '[approved]  ' : '[UNAPPROVED]'} ${r.url} → "${r.cecClaims.join('", "')}"`);
    }
  }

  if (errors.length > 0) {
    console.log('\n--- Fetch errors (audited pages unreachable, not crashed) ---');
    for (const r of errors) console.log(`  ${r.url}: ${r.error}`);
  }

  const fail = banned.length > 0 || unapprovedCecPages.length > 0;
  console.log(
    fail
      ? '\n✖ Audit found live IICRC-claim issues (see above).'
      : '\n✓ No banned patterns and no unapproved numeric CEC claims found live.'
  );
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error('audit-live-iicrc-claims failed:', e);
  process.exit(1);
});
