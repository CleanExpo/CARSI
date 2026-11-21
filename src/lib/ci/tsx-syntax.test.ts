/**
 * GP-696: every .ts/.tsx file under app/ and src/ must parse.
 *
 * On 6 Nov 2026 three files reached main with broken JSX: a stray copy of an old page
 * tail left after the new one (podcast, testimonials) and a dropped <ul> opening tag
 * (CoachingModulePages). `next build` failed, so the DigitalOcean deploy of main failed.
 * This test runs the TypeScript parser over each file and fails on any syntax error, so
 * the unit suite reports the file and line in seconds, without a full build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCE_DIRS = ['app', 'src'];
// GP-738: `prisma generate` (postinstall, so every CI run and dev checkout) writes its
// client into src/generated/prisma/. It is gitignored, machine-written, and about 5 MB:
// roughly 40% of the bytes this guard used to parse. No one edits it, so it cannot carry
// the hand-edit breakage this guard exists for. Skip it; everything committed is parsed.
const SKIP_DIRS = [join('src', 'generated') + sep];

// GP-738: this one test reads and parses every source file, so its work grows with the
// repository, unlike the rest of the suite. It runs in a few seconds, but inside the full
// parallel suite on a loaded machine wall-clock time stretches several-fold (observed
// 12-17 s before the GP-733/GP-738 speed-ups), so the global 15 s default is not a fair
// limit for it. 60 s still fails a guard that has genuinely hung. Do not raise the global
// testTimeout in config/vitest.config.ts for this; that file says the same.
const FULL_SWEEP_TIMEOUT_MS = 60_000;

function syntaxErrors(fileName: string, text: string): string[] {
  // Parse only. transpileModule also transforms and prints every file, which is where the
  // time went (GP-733); the syntax errors are exactly the parser's own diagnostics.
  // JSDoc parsing is skipped (GP-738): malformed JSDoc never produces a parse diagnostic,
  // so skipping it changes no result and saves parser work on every comment.
  const sf = ts.createSourceFile(
    fileName,
    text,
    { languageVersion: ts.ScriptTarget.ESNext, jsDocParsingMode: ts.JSDocParsingMode.ParseNone },
    false,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  // parseDiagnostics is not in the public typings. If a TypeScript upgrade removes it the
  // guard must fail loudly, never report "no errors".
  const diagnostics = (sf as unknown as { parseDiagnostics?: readonly ts.Diagnostic[] })
    .parseDiagnostics;
  if (!Array.isArray(diagnostics)) {
    throw new Error('TypeScript no longer exposes parseDiagnostics; update the syntax guard');
  }
  return diagnostics.map((d) => {
    const pos = d.start !== undefined ? sf.getLineAndCharacterOfPosition(d.start) : undefined;
    const where = pos ? `${pos.line + 1}:${pos.character + 1}` : '?';
    return `${fileName}:${where} ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
  });
}

function sourceFiles(): string[] {
  const files: string[] = [];
  for (const dir of SOURCE_DIRS) {
    for (const entry of readdirSync(join(ROOT, dir), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.tsx?$/.test(entry.name) || entry.name.endsWith('.d.ts')) continue;
      const full = join(entry.parentPath, entry.name);
      if (full.includes(`${sep}node_modules${sep}`)) continue;
      if (SKIP_DIRS.some((d) => relative(ROOT, full).startsWith(d))) continue;
      files.push(full);
    }
  }
  return files;
}

describe('TSX syntax guard (GP-696)', () => {
  it('reports the broken shapes that reached main on 6 Nov 2026', () => {
    // Stray copy of an old page tail after the new closing elements.
    const strayTail = `export default function P() {
  return (
    <>
      <section />
      <Next />
          </div>
        </div>
      </section>
    </>
  );
}`;
    // Children kept after their <ul> opening tag was dropped.
    const droppedOpenTag = `export function R() {
  return (
    <Section>
      <p>x</p>
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </Section>
  );
}`;
    expect(syntaxErrors('stray-tail.tsx', strayTail).length).toBeGreaterThan(0);
    expect(syntaxErrors('dropped-open-tag.tsx', droppedOpenTag).length).toBeGreaterThan(0);
    expect(syntaxErrors('ok.tsx', 'export const A = () => <ul><li /></ul>;')).toEqual([]);
  });

  it(
    'every .ts/.tsx file under app/ and src/ parses',
    () => {
      const files = sourceFiles();
      expect(files.length).toBeGreaterThan(100);
      const errors = files.flatMap((f) => syntaxErrors(relative(ROOT, f), readFileSync(f, 'utf8')));
      expect(errors).toEqual([]);
    },
    FULL_SWEEP_TIMEOUT_MS
  );

  it('skips only the generated Prisma client, never committed source', () => {
    const files = sourceFiles().map((f) => relative(ROOT, f));
    expect(files.some((f) => f.startsWith(join('src', 'generated') + sep))).toBe(false);
    // The skip must not swallow neighbouring committed code.
    expect(files).toContain(join('src', 'lib', 'ci', 'tsx-syntax.test.ts'));
    expect(files.some((f) => f.startsWith(`app${sep}`))).toBe(true);
  });
});
