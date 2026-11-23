import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * GP-760 review (f512fd90, P1): "a password write on an existing account ends every older session"
 * has ONE owner, src/lib/server/lms-auth.ts (setPasswordEndingSessions, and consumePasswordReset for
 * the emailed link). Every other module calls the owner; none writes lms_users.hashed_password on an
 * existing row itself, because a copy that forgets the session-generation bump lets old sessions
 * survive (the admin reset did exactly that).
 *
 * This is an allow-list over the source tree: an UPDATE-shaped write of the password hash
 * (lmsUser.update / upsert / updateMany carrying hashedPassword, or raw SQL setting
 * "hashed_password") is allowed only in the owner, and every write there bumps the generation.
 * Creates of brand-new rows (create(), and an upsert's `create` branch) are not matched. Named limit:
 * a write through a generic delegate (`d[table].upsert`, partner-demo-seed.ts, which only ever
 * stores a non-login lock marker) is not seen by this scan.
 */

const ROOT = process.cwd();
const OWNER = 'src/lib/server/lms-auth.ts';
const SCANNED = ['app', 'src', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', 'generated', '.next']);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx|mts|cts|js|mjs|cjs)$/.test(name) && !/\.test\.|\.spec\./.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** The balanced text that starts at `open` (the index of an opening `(` or `{`). */
function balancedText(text: string, open: number): string {
  const opener = text[open];
  const closer = opener === '(' ? ')' : '}';
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === opener) depth += 1;
    else if (text[i] === closer) {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return text.slice(open);
}

/** For an upsert, only its `update: { ... }` branch writes an existing row (`create` makes a new one). */
function existingRowWriteText(kind: string, args: string): string {
  if (kind !== 'upsert') return args;
  const m = /\bupdate\s*:\s*/.exec(args);
  if (!m) return '';
  const start = m.index + m[0].length;
  // `update: someVariable` — the object is built elsewhere; treat the whole call as the write.
  return args[start] === '{' ? balancedText(args, start) : args;
}

type Write = { file: string; line: number; text: string };

function passwordWrites(file: string, text: string): Write[] {
  const writes: Write[] = [];
  const lineOf = (index: number) => text.slice(0, index).split('\n').length;
  for (const m of text.matchAll(/lmsUser\s*\.\s*(update|upsert|updateMany)\s*\(/g)) {
    const args = balancedText(text, m.index! + m[0].length - 1);
    const write = existingRowWriteText(m[1], args);
    if (/\bhashedPassword\b/.test(write)) writes.push({ file, line: lineOf(m.index!), text: write });
  }
  for (const m of text.matchAll(/UPDATE\s+"?lms_users"?[\s\S]*?SET[\s\S]*?"?hashed_password"?\s*=/gi)) {
    // the whole tagged-template statement, up to its closing backtick
    const end = text.indexOf('`', m.index!);
    writes.push({ file, line: lineOf(m.index!), text: text.slice(m.index!, end === -1 ? undefined : end) });
  }
  return writes;
}

const allWrites = SCANNED.flatMap((dir) =>
  sourceFiles(join(ROOT, dir)).flatMap((full) => {
    const file = relative(ROOT, full).split('\\').join('/');
    return passwordWrites(file, readFileSync(full, 'utf8'));
  })
);

describe('GP-760 password writes on existing accounts have one owner', () => {
  it('finds the owner’s writes (positive control: the scan sees what it is looking for)', () => {
    expect(allWrites.filter((w) => w.file === OWNER).length).toBeGreaterThanOrEqual(2);
  });

  it('no module other than the owner writes the password hash of an existing row', () => {
    const outside = allWrites.filter((w) => w.file !== OWNER).map((w) => `${w.file}:${w.line}`);
    expect(outside).toEqual([]);
  });

  it('every write in the owner adds one to the session generation', () => {
    const missing = allWrites
      .filter((w) => w.file === OWNER)
      .filter(
        (w) =>
          !/sessionGeneration\s*:\s*\{\s*increment\s*:\s*1\s*\}/.test(w.text) &&
          !/"session_generation"\s*=\s*"session_generation"\s*\+\s*1/.test(w.text)
      )
      .map((w) => `${w.file}:${w.line}`);
    expect(missing).toEqual([]);
  });
});
