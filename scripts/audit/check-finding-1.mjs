#!/usr/bin/env node
/**
 * GP-567 c8 verifier.
 *
 * Criterion c8, verbatim from the locked contract:
 *   "the live /courses meta description and og:description banned
 *    accreditation/CEC claims are in the ledger as GAP entries carrying the
 *    verbatim raw-HTML evidence and the access date."
 *
 * The first version of this file asserted the accreditation entry was JUSTIFIED
 * and never asserted GAP on the meta/og rows at all — it checked what had been
 * built rather than what the criterion demanded. Independent review flagged that
 * as a criterion satisfiable by favourable filing. Narrowing a locked criterion
 * at judgement time is self-certification, so the implementation was changed to
 * meet the criterion and this verifier now tests the criterion's own words.
 */
import fs from 'node:fs';

const FILE = 'docs/audit/evidence-ledger.jsonl';
const fail = (m) => {
  console.error(`FAIL c8: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(FILE)) fail(`missing ${FILE}`);
const entries = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const needle = (frag) => entries.find((e) => (e.quote || '').includes(frag));

// The two live surfaces named by the criterion, each as a GAP with evidence.
const cases = [
  ['meta description', 'IICRC CEC Accredited provider'],
  ['og:description', 'Earn continuing education credits'],
];

for (const [label, frag] of cases) {
  const e = needle(frag);
  if (!e) fail(`the live /courses ${label} claim is not in the ledger with its verbatim quote`);
  if (e.status !== 'GAP') {
    fail(`the ${label} claim is filed as ${e.status}; criterion c8 requires GAP — a non-GAP status lets the ledger preserve the licence-critical claim instead of blocking it`);
  }
  if (e.access_date !== '2026-09-07') fail(`the ${label} entry carries no correct access date`);
  if (!e.reason || !e.recommended_action) fail(`the ${label} GAP entry is missing reason or recommended_action`);
  if (!/^https?:\/\//.test(e.evidence_url || '')) fail(`the ${label} entry carries no raw-HTML evidence URL`);
}

// The provider-level claim — the one the marketing copy actually makes — must be
// a GAP in its own right, not absorbed into a JUSTIFIED per-course entry.
const provider = entries.find((e) => e.claim_class === 'accreditation' && /provider-level|Accredited provider/i.test(e.claim));
if (!provider) fail('no entry resolves the PROVIDER-level accreditation claim distinctly from per-course approvals');
if (provider.status !== 'GAP') {
  fail(`the provider-level accreditation claim is filed as ${provider.status}; nothing located establishes provider accreditation, so it is a GAP`);
}

// Live URL-slug acronym findings.
const slugFindings = entries.filter((e) => e.claim_class === 'banned-language' && /courses\/(wrt|asd|cct|fsrt)-/i.test(e.surface || ''));
if (slugFindings.length === 0) fail('live URL-slug acronym findings not filed');

const gaps = entries.filter((e) => e.status === 'GAP').length;
console.log(`OK c8: meta + og filed GAP with verbatim evidence and access date; provider claim GAP; ${slugFindings.length} live URL slugs; ${gaps} GAP entries total`);
