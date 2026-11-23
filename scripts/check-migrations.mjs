#!/usr/bin/env node
/**
 * Prisma migration guard (GP-678).
 *
 * WHY THIS EXISTS. Codex's review of PR #1010 (GP-634) found that
 * `prisma/migrations/20261104120000_coaching_marketing_pack/migration.sql` ends with an extra
 * blank line. The obvious fix (delete the line) is NOT safe: Prisma stores the SHA-256 of every
 * applied migration.sql in `_prisma_migrations.checksum`. Proven on a scratch Postgres 16
 * database on 2026-11-21 with Prisma 7.10.1: after deleting the blank line, `prisma migrate
 * deploy` and `prisma migrate status` stay silent, but `prisma migrate dev` stops with
 * "The migration `20261104120000_coaching_marketing_pack` was modified after it was applied"
 * and asks to reset the schema, which drops all data on that database. So once a migration is
 * applied, its bytes are frozen, whitespace included.
 *
 * Two rules:
 *   1. Applied migrations are immutable. `prisma/migration-checksums.json` pins the SHA-256 of
 *      every migration.sql on main (the same value Prisma stores). A pinned migration whose bytes
 *      change, or that is deleted, fails. Existing whitespace defects in pinned migrations stay
 *      as they are, because fixing them would change the checksum.
 *   2. New migrations are clean before they are pinned: no trailing blank line, no trailing
 *      spaces or tabs, no CR characters, and exactly one final newline. `git diff --check` only
 *      sees a migration while it is in a diff, and it does not run in CI.
 *
 * A new migration directory that is clean but not yet pinned fails too, so the pin lands in the
 * same PR as the migration: run `npm run check:migrations -- --pin-new`. That flag only ADDS
 * pins for clean, unpinned migrations; it never rewrites or removes an existing pin.
 *
 * Exit codes: 0 clean, 1 findings, 2 configuration error (no migrations found, pin file missing
 * or unreadable). A guard that scans nothing must not exit 0.
 *
 * Usage: node scripts/check-migrations.mjs [--root <dir>] [--pin-new]
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MIGRATIONS_DIR = 'prisma/migrations';
export const PIN_FILE = 'prisma/migration-checksums.json';

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

/** Whitespace problems in a migration's text. Empty array = clean. */
export function whitespaceFindings(text) {
  const out = [];
  if (text.length === 0) return ['file is empty'];
  if (text.includes('\r')) out.push('contains CR characters (use LF line endings)');
  if (!text.endsWith('\n')) out.push('does not end with a newline');
  else if (/\n[ \t]*\n$/.test(text) || /^[ \t]*\n$/.test(text)) out.push('ends with a blank line');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (/[ \t]+\r?$/.test(line)) out.push(`line ${i + 1} has trailing whitespace`);
  });
  return out;
}

/** Migration directory names that hold a migration.sql, sorted. */
export function listMigrations(root) {
  const dir = join(root, MIGRATIONS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() && existsSync(join(p, 'migration.sql'));
    })
    .sort();
}

export function readPins(root) {
  const p = join(root, PIN_FILE);
  if (!existsSync(p)) throw new Error(`${PIN_FILE} is missing`);
  const parsed = JSON.parse(readFileSync(p, 'utf8'));
  const pins = parsed && typeof parsed === 'object' ? parsed.migrations : undefined;
  if (!pins || typeof pins !== 'object' || Array.isArray(pins)) {
    throw new Error(`${PIN_FILE} has no "migrations" object`);
  }
  for (const [name, hash] of Object.entries(pins)) {
    if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) {
      throw new Error(`${PIN_FILE}: pin for ${name} is not a SHA-256 hex string`);
    }
  }
  return pins;
}

/**
 * Evaluate a tree. Returns { findings: string[], unpinnedClean: string[], scanned: number }.
 * Throws on configuration errors.
 */
export function evaluate(root) {
  const names = listMigrations(root);
  if (names.length === 0) throw new Error(`no migrations found under ${MIGRATIONS_DIR}`);
  const pins = readPins(root);
  if (Object.keys(pins).length === 0) throw new Error(`${PIN_FILE} pins no migrations`);

  const findings = [];
  const unpinnedClean = [];
  const present = new Set(names);

  for (const name of Object.keys(pins).sort()) {
    if (!present.has(name)) {
      findings.push(
        `${name}: pinned (applied) migration is missing. Applied migrations must never be deleted or renamed.`
      );
    }
  }

  for (const name of names) {
    const buf = readFileSync(join(root, MIGRATIONS_DIR, name, 'migration.sql'));
    const rel = `${MIGRATIONS_DIR}/${name}/migration.sql`;
    if (Object.hasOwn(pins, name)) {
      const actual = sha256(buf);
      if (actual !== pins[name]) {
        findings.push(
          `${rel}: changed after it was applied (sha256 ${actual.slice(0, 12)}…, pinned ${pins[name].slice(0, 12)}…). ` +
            'Prisma checks this checksum; `prisma migrate dev` would demand a schema reset. ' +
            'Revert the file and put the change in a new migration.'
        );
      }
      continue;
    }
    const ws = whitespaceFindings(buf.toString('utf8'));
    if (ws.length > 0) {
      for (const w of ws) findings.push(`${rel}: ${w}. Fix it before the migration is applied.`);
    } else {
      unpinnedClean.push(name);
    }
  }
  return { findings, unpinnedClean, scanned: names.length, pins };
}

function main(argv) {
  let root = process.cwd();
  const rootIdx = argv.indexOf('--root');
  if (rootIdx !== -1) root = resolve(argv[rootIdx + 1] ?? '.');
  const pinNew = argv.includes('--pin-new');

  let result;
  try {
    result = evaluate(root);
  } catch (err) {
    console.error(`check:migrations configuration error: ${err.message}`);
    return 2;
  }
  const { findings, unpinnedClean, scanned, pins } = result;

  if (pinNew && unpinnedClean.length > 0) {
    const next = { ...pins };
    for (const name of unpinnedClean) {
      next[name] = sha256(readFileSync(join(root, MIGRATIONS_DIR, name, 'migration.sql')));
    }
    const sorted = Object.fromEntries(
      Object.keys(next)
        .sort()
        .map((k) => [k, next[k]])
    );
    const p = join(root, PIN_FILE);
    const existing = JSON.parse(readFileSync(p, 'utf8'));
    writeFileSync(p, `${JSON.stringify({ ...existing, migrations: sorted }, null, 2)}\n`);
    for (const name of unpinnedClean) console.log(`pinned ${name}`);
  } else {
    for (const name of unpinnedClean) {
      findings.push(
        `${MIGRATIONS_DIR}/${name}: new migration is not pinned. Run \`npm run check:migrations -- --pin-new\` and commit ${PIN_FILE}.`
      );
    }
  }

  if (findings.length > 0) {
    console.error(`check:migrations: ${findings.length} finding(s) in ${scanned} migrations`);
    for (const f of findings) console.error(`  - ${f}`);
    return 1;
  }
  console.log(
    `check:migrations: ${scanned} migrations clean, ${Object.keys(pins).length + (pinNew ? unpinnedClean.length : 0)} pinned`
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
