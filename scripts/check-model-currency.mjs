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
    // The optional generation group matters: legacy ids put it BEFORE the family
    // (claude-3-5-sonnet-20240620, claude-3-opus-20240229) while current ones put
    // it after (claude-opus-5). The trailing segment is OPTIONAL because the
    // OpenRouter alias form ends at the family (anthropic/claude-3.5-sonnet), and
    // @ and : are allowed because Vertex and Bedrock use them
    // (claude-3-5-sonnet-v2@20241022).
    String.raw`(?:claude-(?:[0-9]+(?:[.-][0-9]+)*-)?(?:opus|sonnet|haiku|fable|mythos|instant)(?:[-.@:][a-z0-9.@:-]+)?)` +
    String.raw`|(?:gemini-(?:exp-[0-9][a-z0-9.-]*|[0-9][a-z0-9.-]*|pro[a-z0-9.-]*))` +
    String.raw`|(?:imagen-[0-9][a-z0-9.-]*)` +
    String.raw`)['"\`]`,
  'g',
);

/**
 * A quoted string can look like a model id and be a filename ('gemini-1.png').
 * Model ids never carry an asset or source extension, so this removes that false
 * positive class without loosening the pattern. Raised by independent review.
 */
const FILE_EXTENSION =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|json|ts|tsx|js|jsx|mjs|cjs|css|scss|md|mdx|txt|ya?ml|html?|pdf|mp4|webm|woff2?)$/i;

/**
 * SCOPE OF THE DRIFT CHECK - read before trusting it as a proof.
 *
 * Deciding "is this arbitrary quoted string a vendor model id" is a recognition
 * problem, and no pattern closes it: vendors invent new shapes whenever they like.
 * Two review rounds each found a further alias form, which is the signature of a
 * net, not a proof. So the claim this guard makes is deliberately split:
 *
 *   FRESHNESS and NON-VACUITY are EXACT. They do not depend on recognising an id,
 *   and they are what carries the "the registry cannot go stale unnoticed"
 *   guarantee the founder asked for.
 *
 *   DRIFT is BEST-EFFORT. It catches the id shapes enumerated above and will miss
 *   a genuinely novel one. A clean drift result means "no KNOWN id shape drifted",
 *   never "no model id anywhere is unapproved".
 *
 * Widen the pattern when a new shape appears; do not read a clean run as proof no
 * unapproved model is in use.
 */

/**
 * Returns { files, unreadable }. Unreadable paths are RETURNED, not swallowed:
 * a directory or file the guard could not read is a hole in its coverage, and a
 * hole must fail the guard rather than shrink the scan in silence. Only a root
 * that is simply absent is tolerated, and the non-vacuity check catches the case
 * where that leaves nothing to scan.
 */
export function listFiles(roots, cwd = process.cwd()) {
  const out = [];
  const unreadable = [];
  const walk = (dir, isRoot = false) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch (e) {
      if (!(isRoot && e.code === 'ENOENT')) unreadable.push(`${relative(cwd, dir)} (${e.code})`);
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch (e) {
        unreadable.push(`${relative(cwd, full)} (${e.code})`);
        continue;
      }
      if (st.isDirectory()) walk(full);
      else if (CODE_EXT.test(entry)) out.push(relative(cwd, full));
    }
  };
  for (const root of roots) walk(join(cwd, root), true);
  return { files: out, unreadable };
}

/**
 * Strip // and block comments. Without this a commented-out registry entry still
 * parses as an approved model, so commenting one out would silently keep it
 * approved — a fail-open, and the quietest kind.
 */
export function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Split a source string into brace-balanced object blocks, ignoring braces that
 * appear inside string literals. Needed because entry `notes` values legitimately
 * contain punctuation, and a regex cannot tell a brace in code from one in prose.
 */
export function objectBlocks(source) {
  const blocks = [];
  let depth = 0;
  let start = -1;
  let quote = null;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) blocks.push(source.slice(start, i + 1));
    }
  }
  return blocks;
}

/**
 * Read top-level `key: 'value'` pairs from one object block, skipping anything
 * inside a string literal.
 *
 * A single regex over the whole entry was a fail-open: `[^}]*?status:` matched
 * the FIRST occurrence of `status:`, so a notes string containing the characters
 * `status: 'current'` would be read as the entry's status and could mask a
 * deprecated model. Raised as P1 by independent review 06/09/2026. Scanning
 * fields properly removes the whole class rather than the one example.
 */
export function parseEntryFields(block) {
  const fields = {};
  let depth = 0;
  let quote = null;
  let token = '';
  let pendingKey = null;
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    if (quote) {
      if (c === '\\') {
        token += block[i + 1] ?? '';
        i++;
      } else if (c === quote) {
        if (pendingKey && depth === 1 && !(pendingKey in fields)) fields[pendingKey] = token;
        quote = null;
        pendingKey = null;
        token = '';
      } else token += c;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      quote = c;
      token = '';
      continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === ':' && depth === 1) pendingKey = token.trim().replace(/^,/, '').trim();
    else if (c === ',') {
      pendingKey = null;
      token = '';
    } else token += c;
  }
  return fields;
}

/** Textual parse of the registry, so this guard needs no TypeScript toolchain. */
export function parseRegistry(rawSource) {
  const source = stripComments(rawSource);
  const reviewedMatch = source.match(/REGISTRY_REVIEWED\s*=\s*['"](\d{4}-\d{2}-\d{2})['"]/);
  const entries = [];
  for (const block of objectBlocks(source)) {
    const f = parseEntryFields(block);
    if (f.id && f.status) entries.push({ id: f.id, status: f.status });
  }
  return { reviewed: reviewedMatch ? reviewedMatch[1] : null, entries };
}

/**
 * Returns { found, unreadable }. Same rule as listFiles: a file that could not be
 * read is a coverage hole, not a file without model ids. Swallowing the error let
 * a single EACCES turn "one file unscanned" into "guard reports clean".
 */
export function findHardcodedIds(files, readFile) {
  const found = [];
  const unreadable = [];
  for (const file of files) {
    if (isExempt(file)) continue;
    let text;
    try {
      text = readFile(file);
    } catch (e) {
      unreadable.push(`${file} (${e.code ?? e.message})`);
      continue;
    }
    for (const m of text.matchAll(MODEL_ID)) {
      if (FILE_EXTENSION.test(m[1])) continue; // a filename, not a model id
      found.push({ file, id: m[1] });
    }
  }
  return { found, unreadable };
}

/**
 * The whole verdict as a pure function, so the self-test can drive every failure
 * mode without mutating a tracked file or setting an env var that could also be
 * used to weaken the guard in CI.
 */
export function evaluate({
  reviewed,
  entries,
  filesScanned,
  hardcoded,
  now,
  unreadable = [],
  maxAgeDays = MAX_AGE_DAYS,
}) {
  const errors = [];

  // 2a. PARTIAL COVERAGE is a failure too. filesScanned === 0 only catches a
  // total wipeout; a single unreadable file would otherwise shrink the scan
  // silently and still report clean.
  if (unreadable.length) {
    errors.push(
      `could not read ${unreadable.length} path(s), so the scan has holes and a clean ` +
        `result would be unsound: ${unreadable.slice(0, 5).join(', ')}` +
        `${unreadable.length > 5 ? ` (+${unreadable.length - 5} more)` : ''}`,
    );
  }

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
  const { files, unreadable: unreadableDirs } = listFiles(scanRoots, cwd);
  const { found: hardcoded, unreadable: unreadableFiles } = findHardcodedIds(files, (f) =>
    readFileSync(join(cwd, f), 'utf8'),
  );

  const errors = evaluate({
    reviewed,
    entries,
    filesScanned: files.length,
    hardcoded,
    unreadable: [...unreadableDirs, ...unreadableFiles],
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
