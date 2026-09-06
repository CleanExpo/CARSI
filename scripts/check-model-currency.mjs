#!/usr/bin/env node
/**
 * CARSI model-currency guard.
 *
 * Replaces src/ai/version-checks/check-model-currency.ts, which could not fail:
 * it read apps/backend/.env.local (a directory this repo does not have), audited
 * an empty list, and reported "all current" for ever. It was never wired to a
 * package script or a CI job either, so nothing ran it. That is why the approved
 * registry sat on a superseded Opus id from 07/05/2026 to 06/09/2026 unnoticed.
 *
 * Three properties, all fail-closed:
 *
 *   1. FRESHNESS  - the registry declares REGISTRY_REVIEWED. Once it is older
 *                   than MAX_AGE_DAYS this guard goes red, so "stale" becomes a
 *                   loud CI failure instead of a silent fact. No offline check
 *                   can know a new model shipped; this forces a human to look.
 *   2. NON-VACUITY - if the scan reached zero files, or the registry parsed to
 *                   zero entries, that is a FAILURE, not a pass. A checker that
 *                   examined nothing must never report clean.
 *   3. DRIFT      - every Anthropic/Google model id hardcoded in source must
 *                   exist in the registry and must not be deprecated. Catches
 *                   code and registry disagreeing.
 *
 * Run: node scripts/check-model-currency.mjs
 * Self-test (proves it can fail): node scripts/check-model-currency.test.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const REGISTRY_PATH = 'src/ai/model-registry/index.ts';
export const MAX_AGE_DAYS = 90;

/** Source trees that may legitimately hardcode a model id. */
export const DEFAULT_SCAN_ROOTS = ['src', 'packages', 'app', 'scripts'];

/**
 * Scanned-but-exempt. Each needs a reason, because an unexplained exemption is
 * how a guard quietly stops covering the thing it was written for.
 *   - the registry itself is the authority, not a consumer of it;
 *   - this guard and its self-test necessarily contain model ids as data, and a
 *     guard that matches its own prose reports itself as a defect.
 * docs/ is not scanned at all: its example ids are knowingly stale and deferred.
 */
export const EXEMPT_FILES = new Set([
  'scripts/check-model-currency.mjs',
  'scripts/check-model-currency.test.mjs',
]);

/**
 * The registry module is the authority on model ids, not a consumer of them: its
 * provider files carry type-level unions naming every id a vendor offers, which
 * is not the same list as "ids this project approves as defaults".
 */
export const EXEMPT_PREFIXES = ['src/ai/model-registry/'];

export const isExempt = (file) =>
  EXEMPT_FILES.has(file) || EXEMPT_PREFIXES.some((p) => file.startsWith(p));

const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git']);
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

/**
 * Quoted vendor model ids. A leading "vendor/" (OpenRouter form) is normalised off.
 *
 * Deliberately NOT case-insensitive, and each vendor requires a family token. Both
 * constraints are load-bearing: a loose /claude-[a-z0-9.-]+/i matched the crawler
 * user-agents 'Claude-SearchBot' and 'Claude-User' in app/robots.ts and reported
 * them as unapproved models. A guard that cries wolf gets switched off.
 */
const MODEL_ID = new RegExp(
  String.raw`['"\`](?:[a-z0-9-]+/)?(` +
    String.raw`(?:claude-(?:opus|sonnet|haiku|fable|mythos|instant)-[a-z0-9.-]+)` +
    String.raw`|(?:gemini-[0-9][a-z0-9.-]*|gemini-pro)` +
    String.raw`|(?:imagen-[0-9][a-z0-9.-]*)` +
    String.raw`)['"\`]`,
  'g',
);

export function listFiles(roots, cwd = process.cwd()) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return; // a missing root is reported by the non-vacuity check, not here
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (CODE_EXT.test(entry)) out.push(relative(cwd, full));
    }
  };
  for (const root of roots) walk(join(cwd, root));
  return out;
}

/** Textual parse of the registry, so this guard needs no TypeScript toolchain. */
export function parseRegistry(source) {
  const reviewedMatch = source.match(/REGISTRY_REVIEWED\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/);
  const entries = [];
  const block = /\{\s*id:\s*['"]([^'"]+)['"][^}]*?status:\s*['"]([^'"]+)['"][^}]*?\}/gs;
  for (const m of source.matchAll(block)) entries.push({ id: m[1], status: m[2] });
  return { reviewed: reviewedMatch ? reviewedMatch[1] : null, entries };
}

export function findHardcodedIds(files, readFile) {
  const found = [];
  for (const file of files) {
    if (isExempt(file)) continue;
    let text;
    try {
      text = readFile(file);
    } catch {
      continue;
    }
    for (const m of text.matchAll(MODEL_ID)) found.push({ file, id: m[1] });
  }
  return found;
}

/**
 * The whole verdict as a pure function, so the self-test can drive every failure
 * mode without mutating a tracked file or setting an env var that could also be
 * used to weaken the guard in CI.
 */
export function evaluate({ reviewed, entries, filesScanned, hardcoded, now, maxAgeDays = MAX_AGE_DAYS }) {
  const errors = [];

  // 2. NON-VACUITY first: everything below is meaningless if nothing was read.
  if (filesScanned === 0) {
    errors.push(
      `scanned 0 source files under ${DEFAULT_SCAN_ROOTS.join(', ')} — the guard examined ` +
        `nothing, so a clean result would be meaningless. Check the scan roots exist.`,
    );
  }
  if (entries.length === 0) {
    errors.push(
      `parsed 0 entries from ${REGISTRY_PATH} — the registry is missing, empty, or its ` +
        `shape changed and this parser no longer understands it.`,
    );
  }

  // 1. FRESHNESS
  if (!reviewed) {
    errors.push(
      `${REGISTRY_PATH} declares no REGISTRY_REVIEWED date. Add ` +
        `export const REGISTRY_REVIEWED = 'YYYY-MM-DD' and set it to the date the ` +
        `model list was last checked against the vendor's current line-up.`,
    );
  } else {
    const ageDays = Math.floor((now.getTime() - Date.parse(`${reviewed}T00:00:00Z`)) / 86400000);
    if (Number.isNaN(ageDays)) {
      errors.push(`REGISTRY_REVIEWED is not a valid date: ${reviewed}`);
    } else if (ageDays > maxAgeDays) {
      errors.push(
        `model registry was last reviewed ${reviewed} (${ageDays} days ago, limit ` +
          `${maxAgeDays}). Re-check every approved id against the vendor's current ` +
          `models, update ${REGISTRY_PATH}, then set REGISTRY_REVIEWED to today. ` +
          `This is the check that stops the registry going stale unnoticed.`,
      );
    }
  }

  // 3. DRIFT
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const { file, id } of hardcoded) {
    const entry = byId.get(id);
    if (!entry) {
      errors.push(
        `${file} hardcodes model id "${id}", which is not in ${REGISTRY_PATH}. ` +
          `Add it to APPROVED_MODELS or change the code to an approved id.`,
      );
    } else if (entry.status === 'deprecated') {
      errors.push(`${file} uses "${id}", which the registry marks deprecated.`);
    }
  }

  return errors;
}

function main() {
  const cwd = process.cwd();
  // Scan roots may be narrowed on the command line for the self-test. Narrowing can
  // only cause a failure (fewer files, and zero files is fatal), never a pass.
  const roots = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const scanRoots = roots.length ? roots : DEFAULT_SCAN_ROOTS;

  let registrySource = '';
  try {
    registrySource = readFileSync(join(cwd, REGISTRY_PATH), 'utf8');
  } catch (e) {
    console.error(`FAIL: cannot read ${REGISTRY_PATH}: ${e.message}`);
    process.exit(1);
  }

  const { reviewed, entries } = parseRegistry(registrySource);
  const files = listFiles(scanRoots, cwd);
  const hardcoded = findHardcodedIds(files, (f) => readFileSync(join(cwd, f), 'utf8'));

  const errors = evaluate({
    reviewed,
    entries,
    filesScanned: files.length,
    hardcoded,
    now: new Date(),
  });

  console.log(
    `model-currency: ${files.length} source files scanned, ${entries.length} registry ` +
      `entries, ${hardcoded.length} hardcoded id(s), reviewed ${reviewed ?? 'NEVER'}`,
  );

  if (errors.length) {
    console.error(`\nFAIL: model-currency guard found ${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log('PASS: model registry is current and no source file drifts from it.');
}

// Only run when invoked directly, so the self-test can import the pure functions.
if (process.argv[1] && process.argv[1].endsWith('check-model-currency.mjs')) main();
