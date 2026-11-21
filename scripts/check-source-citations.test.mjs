#!/usr/bin/env node
/**
 * Non-vacuity proof for the source-citation scorecard.
 *
 * The scorecard is the machine-checkable half of E-E-A-T: it measures whether course content is
 * grounded in primary regulators or in supplier catalogues. A classifier that silently mis-tiers
 * a domain would report a flattering authority ratio while the content got worse — the same
 * failure mode as the completeness bar that manufactured an intro-video pass.
 *
 * Guards the classification itself, since that is where a wrong answer is invisible.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const reg = JSON.parse(readFileSync('data/seed/source-registry.json', 'utf8'));
const tierOf = new Map(reg.sources.map((s) => [s.domain.toLowerCase(), s.tier]));
const assetHosts = new Set(reg.assetHosts.domains.map((d) => d.toLowerCase()));

/** Mirrors classify() in check-source-citations.mjs. */
function classify(host) {
  const h = host.toLowerCase().replace(/^www\./, '');
  if (assetHosts.has(h) || [...assetHosts].some((a) => h.endsWith(`.${a}`))) return 'asset';
  if (tierOf.has(h)) return tierOf.get(h);
  for (const [d, t] of tierOf) if (h.endsWith(`.${d}`)) return t;
  return 'unvetted';
}

const CASES = [
  // Primary regulators must be tier 1 — these carry a safety or compliance claim.
  ['safeworkaustralia.gov.au', 1],
  ['www.safeworkaustralia.gov.au', 1],
  ['legislation.gov.au', 1],
  ['standards.org.au', 1],
  ['epa.nsw.gov.au', 1],
  ['epa.vic.gov.au', 1],
  ['worksafe.vic.gov.au', 1],
  // Suppliers must be tier 4 — citable for product spec, NEVER evidence for a safety claim.
  ['hydramaster.com', 4],
  ['actichem.com.au', 4],
  ['ccwonline.com.au', 4],
  // The IICRC is nominative-only. Mis-tiering it upward would let their standards look like a
  // permitted source, which their AI Use Policy forbids.
  ['iicrc.org', 3],
  // Asset hosts must never score — an image-heavy lesson is not a well-sourced one.
  ['cdn.shopify.com', 'asset'],
  ['res.cloudinary.com', 'asset'],
  ['carsi.com.au', 'asset'],
  // Unknown domains are unvetted, not silently trusted.
  ['some-random-blog.example', 'unvetted'],
  ['chatgpt.com', 'unvetted'],
];

let failed = 0;
for (const [host, expected] of CASES) {
  const got = classify(host);
  if (got !== expected) {
    console.error(`✖ ${host}: expected ${expected}, got ${got}`);
    failed++;
  }
}

// A supplier must never be counted as authoritative — the ratio is the whole point.
const authoritative = (h) => [1, 2].includes(classify(h));
for (const h of ['hydramaster.com', 'ccwonline.com.au', 'actichem.com.au']) {
  if (authoritative(h)) {
    console.error(`✖ supplier ${h} counted toward the authority ratio`);
    failed++;
  }
}
if (!authoritative('safeworkaustralia.gov.au')) {
  console.error('✖ Safe Work Australia NOT counted toward the authority ratio');
  failed++;
}

// The registry must carry the licence rule in data, not only in prose.
if (!/nominative/i.test(JSON.stringify(reg.rules) + JSON.stringify(reg.sources))) {
  console.error('✖ registry no longer records the IICRC nominative-only rule');
  failed++;
}

// GP-718: draft courses live under data/courses/<slug>/v1-draft/ until promoted. A citation that
// exists only in a draft must be scanned, so an unvetted domain there fails --enforce.
{
  const here = resolve('scripts/check-source-citations.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'source-citations-drafts-'));
  try {
    mkdirSync(join(dir, 'data/seed'), { recursive: true });
    writeFileSync(
      join(dir, 'data/seed/source-registry.json'),
      JSON.stringify({
        rules: ['IICRC is nominative only'],
        sources: [{ domain: 'safeworkaustralia.gov.au', tier: 1 }],
        assetHosts: { domains: ['carsi.com.au'] },
      })
    );
    const draft = join(dir, 'data/courses/draft-course/v1-draft');
    mkdirSync(draft, { recursive: true });
    writeFileSync(
      join(draft, 'research-pack.md'),
      'See https://www.safeworkaustralia.gov.au/x and https://unvetted-draft-only.example/y'
    );
    const run = (args) => {
      try {
        return {
          status: 0,
          out: execFileSync(process.execPath, [here, ...args], {
            cwd: dir,
            encoding: 'utf8',
            stdio: 'pipe',
          }),
        };
      } catch (e) {
        return { status: e.status, out: String(e.stdout) };
      }
    };
    const enforced = run(['--enforce']);
    if (enforced.status !== 1) {
      console.error(
        `✖ an unvetted domain cited only in a v1-draft course must fail --enforce (exit ${enforced.status})`
      );
      failed++;
    }
    const json = run(['--json']);
    let scanned;
    try {
      scanned = JSON.parse(json.out).scanned;
    } catch {
      scanned = undefined;
    }
    if (!scanned || scanned.draftFiles !== 1 || scanned.files !== 1) {
      console.error(
        `✖ --json must report scanned files including drafts, got ${JSON.stringify(scanned)}`
      );
      failed++;
    }
    // Fail closed: a scan that finds no content files (only the registry) is not a pass.
    rmSync(join(dir, 'data/courses'), { recursive: true, force: true });
    const empty = run([]);
    if (empty.status !== 2) {
      console.error(
        `✖ a scan that reads only the registry must exit 2, not pass (exit ${empty.status})`
      );
      failed++;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

if (failed > 0) {
  console.error(`\n✖ Source-citation scorecard self-test failed — ${failed} case(s).`);
  process.exit(1);
}
console.log(`✓ Source-citation scorecard self-test passed (${CASES.length} classifications).`);
process.exit(0);
