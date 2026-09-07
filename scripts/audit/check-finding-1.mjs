#!/usr/bin/env node
/**
 * GP-567 c8 verifier — finding #1 is filed WITH its evidence, and filed in the
 * right class. The meta/og strings must appear as verbatim quotes, and the
 * accreditation question must be recorded as JUSTIFIED rather than asserted
 * false, because the approvals registry is no longer empty.
 */
import fs from 'node:fs';

const FILE = 'docs/audit/evidence-ledger.jsonl';
const fail = (m) => {
  console.error(`FAIL c8: ${m}`);
  process.exit(1);
};

if (!fs.existsSync(FILE)) fail(`missing ${FILE}`);
const entries = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

const banned = entries.filter((e) => e.claim_class === 'banned-language');
if (banned.length === 0) fail('no banned-language entries filed');

const meta = banned.find((e) => /IICRC CEC Accredited provider/.test(e.quote || ''));
if (!meta) fail('the /courses meta description claim is not filed with its verbatim quote');
if (meta.access_date !== '2026-09-07') fail('finding #1 carries no correct access date');

const og = banned.find((e) => /Earn continuing education credits/.test(e.quote || ''));
if (!og) fail('the og:description "Earn continuing education credits" claim is not filed');

const acc = entries.find((e) => e.claim_class === 'accreditation');
if (!acc) fail('no entry resolves whether the accreditation claim is actually true');
if (acc.status !== 'JUSTIFIED') {
  fail(`the accreditation claim is filed as ${acc.status}; with 38 registry approvals it is JUSTIFIED, and calling it false would be its own false finding`);
}

const slugFindings = banned.filter((e) => /courses\/(wrt|asd|cct|fsrt)-/i.test(e.surface || ''));
if (slugFindings.length === 0) fail('live URL-slug acronym findings not filed');

console.log(`OK c8: ${banned.length} banned-language entries incl. ${slugFindings.length} live URL slugs; accreditation filed JUSTIFIED`);
