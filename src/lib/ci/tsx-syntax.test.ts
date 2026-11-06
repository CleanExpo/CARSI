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

function syntaxErrors(fileName: string, text: string): string[] {
  const result = ts.transpileModule(text, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: { jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext },
  });
  return (result.diagnostics ?? []).map((d) => {
    const pos =
      d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : undefined;
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

  it('every .ts/.tsx file under app/ and src/ parses', () => {
    const files = sourceFiles();
    expect(files.length).toBeGreaterThan(100);
    const errors = files.flatMap((f) => syntaxErrors(relative(ROOT, f), readFileSync(f, 'utf8')));
    expect(errors).toEqual([]);
  });
});
