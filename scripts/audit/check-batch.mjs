#!/usr/bin/env node
/** GP-567 c4 verifier — batch 1 populated, schema-clean, every entry names what it feeds. */
import { validateFile } from './validate-ledger.mjs';
import fs from 'node:fs';

const MIN = Number(process.argv[2] || 20);
const FILE = 'docs/audit/evidence-ledger.jsonl';
const fail = (m) => {
  console.error(`FAIL c4: ${m}`);
  process.exit(1);
};

const r = validateFile(FILE);
if (!r.ok) fail(`${r.violations.length} schema violation(s): ${r.violations[0]}`);
if (r.count < MIN) fail(`ledger holds ${r.count} entries, minimum is ${MIN}`);

const entries = fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
for (const e of entries) {
  if (!Array.isArray(e.feeds) || e.feeds.length === 0) fail(`entry ${e.id} names nothing it feeds`);
}

const counts = entries.reduce((a, e) => ((a[e.status] = (a[e.status] || 0) + 1), a), {});
console.log(`OK c4: ${r.count} entries, 0 violations, all name a surface — ${JSON.stringify(counts)}`);
