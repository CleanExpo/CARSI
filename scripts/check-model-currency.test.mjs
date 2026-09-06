#!/usr/bin/env node
/**
 * Self-test for the model-currency guard.
 *
 * The guard it replaced could not fail — it read a directory this repo does not
 * have, audited an empty list, and reported "all current" for ever. So the only
 * thing worth asserting here is the opposite property: that this guard DOES go
 * red, and for the stated reason, once each defect is present.
 *
 * Every mutant is applied to in-memory inputs of the pure `evaluate()` function.
 * Nothing on disk is touched, so this cannot damage a working tree the way a
 * file-mutating harness can.
 *
 * Run: node scripts/check-model-currency.test.mjs
 */
import {
  evaluate,
  findHardcodedIds,
  parseRegistry,
  isExempt,
  MAX_AGE_DAYS,
} from './check-model-currency.mjs';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failures++;
  }
};
const matches = (errors, needle) => errors.some((e) => e.includes(needle));

const NOW = new Date('2026-09-06T00:00:00Z');
const HEALTHY = {
  reviewed: '2026-09-01',
  entries: [
    { id: 'claude-opus-5', status: 'current' },
    { id: 'claude-sonnet-5', status: 'current' },
  ],
  filesScanned: 1142,
  hardcoded: [{ file: 'src/x.ts', id: 'claude-opus-5' }],
  now: NOW,
};

console.log('model-currency guard self-test\n');

// --- Positive control -------------------------------------------------------
// If this does not pass, every "the mutant made it fail" result below is
// meaningless, because the guard would be failing regardless of the mutant.
console.log('positive control (healthy input must be clean):');
const clean = evaluate(HEALTHY);
check('healthy input produces zero errors', clean.length === 0, clean.join('; '));

// --- Mutant 1: staleness ----------------------------------------------------
console.log('\nmutant: registry review date older than the limit');
const stale = evaluate({
  ...HEALTHY,
  reviewed: '2026-01-01', // 248 days before NOW, limit is 90
});
check('goes red', stale.length > 0);
check('names staleness, not something else', matches(stale, 'last reviewed'), stale.join('; '));
check('states the limit', matches(stale, String(MAX_AGE_DAYS)));

// Boundary: one day inside the limit must still pass, one day outside must fail.
// Without this pair the check could be firing on any date at all.
const dayMs = 86400000;
const justInside = new Date(NOW.getTime() - (MAX_AGE_DAYS - 1) * dayMs).toISOString().slice(0, 10);
const justOutside = new Date(NOW.getTime() - (MAX_AGE_DAYS + 1) * dayMs).toISOString().slice(0, 10);
check(
  `${MAX_AGE_DAYS - 1} days old still passes`,
  evaluate({ ...HEALTHY, reviewed: justInside }).length === 0,
);
check(
  `${MAX_AGE_DAYS + 1} days old fails`,
  evaluate({ ...HEALTHY, reviewed: justOutside }).length > 0,
);

// --- Mutant 2: no review date at all ---------------------------------------
console.log('\nmutant: REGISTRY_REVIEWED missing entirely');
const undated = evaluate({ ...HEALTHY, reviewed: null });
check('goes red', undated.length > 0);
check('names the missing constant', matches(undated, 'REGISTRY_REVIEWED'));

// --- Mutant 3: vacuity, scanned nothing ------------------------------------
// This is the exact defect that made the previous guard worthless.
console.log('\nmutant: the scan reached zero files');
const noFiles = evaluate({ ...HEALTHY, filesScanned: 0, hardcoded: [] });
check('goes red', noFiles.length > 0);
check('says it examined nothing', matches(noFiles, 'examined'), noFiles.join('; '));

// --- Mutant 4: vacuity, registry parsed to nothing -------------------------
console.log('\nmutant: the registry parsed to zero entries');
const noEntries = evaluate({ ...HEALTHY, entries: [], hardcoded: [] });
check('goes red', noEntries.length > 0);
check('names the registry', matches(noEntries, 'parsed 0 entries'));

// --- Mutant 5: drift, an id the registry does not list ---------------------
console.log('\nmutant: source hardcodes an unregistered model id');
const drift = evaluate({
  ...HEALTHY,
  hardcoded: [{ file: 'packages/shared/src/types/models.ts', id: 'claude-opus-4-8' }],
});
check('goes red', drift.length > 0);
check('names the offending id', matches(drift, 'claude-opus-4-8'));
check('names the offending file', matches(drift, 'packages/shared/src/types/models.ts'));

// --- Mutant 6: drift, a deprecated id --------------------------------------
console.log('\nmutant: source uses an id the registry marks deprecated');
const deprecated = evaluate({
  ...HEALTHY,
  entries: [{ id: 'claude-opus-4-8', status: 'deprecated' }],
  hardcoded: [{ file: 'src/x.ts', id: 'claude-opus-4-8' }],
});
check('goes red', deprecated.length > 0);
check('says deprecated', matches(deprecated, 'deprecated'));

// --- Regex aim: the false-positive class that was actually hit -------------
// A loose /claude-.../i matched the crawler user-agents in app/robots.ts. Assert
// BOTH directions: the precondition (a real id is still detected) and the
// negative (user-agents are not). Without the precondition, a regex that matched
// nothing at all would sail through the negative half.
console.log('\nregex aim (both directions, so a dead pattern cannot pass):');
const read = (f) =>
  ({
    'src/real.ts': `const m = 'claude-opus-5'; const g = "gemini-2.0-flash-exp";`,
    'app/robots.ts': `userAgent: 'Claude-SearchBot'\nuserAgent: 'Claude-User'`,
  })[f];
const realHits = findHardcodedIds(['src/real.ts'], read).map((h) => h.id);
check('PRECONDITION: a genuine model id is still detected', realHits.includes('claude-opus-5'));
check('a genuine Google id is still detected', realHits.includes('gemini-2.0-flash-exp'));
const uaHits = findHardcodedIds(['app/robots.ts'], read);
check('crawler user-agents are NOT reported as models', uaHits.length === 0, JSON.stringify(uaHits));

// --- Exemptions cannot swallow the codebase --------------------------------
console.log('\nexemption scope:');
check('the guard exempts its own source', isExempt('scripts/check-model-currency.mjs'));
check('the guard exempts the registry module', isExempt('src/ai/model-registry/providers/gemini.ts'));
check('an ordinary consumer is NOT exempt', !isExempt('packages/shared/src/types/models.ts'));
check('an ordinary app file is NOT exempt', !isExempt('src/lib/tools/index.ts'));

// --- Registry parser -------------------------------------------------------
console.log('\nregistry parser:');
const parsed = parseRegistry(
  `export const REGISTRY_REVIEWED = '2026-09-06';\n` +
    `{ id: 'claude-opus-5', provider: 'anthropic', status: 'current' },\n` +
    `{ id: 'old-one', provider: 'anthropic', status: 'deprecated' },`,
);
check('reads the review date', parsed.reviewed === '2026-09-06');
check('reads both entries', parsed.entries.length === 2, JSON.stringify(parsed.entries));
check('reads status', parsed.entries[1]?.status === 'deprecated');
check('a registry with no date reads as null', parseRegistry('{}').reviewed === null);

console.log(
  failures === 0
    ? '\nPASS: the guard fails on every defect it claims to catch.'
    : `\nFAIL: ${failures} self-test assertion(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
