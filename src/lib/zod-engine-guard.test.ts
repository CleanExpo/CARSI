import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// The zod 4 package is installed for its security fixes, but the app's schemas run on the zod 3
// engine it ships at 'zod/v3', so validation (string lengths, coercion, messages) stays exactly
// as before the upgrade. Moving a schema to the zod 4 engine is a behaviour change that needs its
// own parity proof (see ai-course-builder-differential.test.ts and auth-forms-zod3-parity.test.ts).
const ROOT = join(__dirname, '..', '..');
const SCAN = ['src', 'app', 'lib'];
const IMPORT = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)['"](zod(?:\/[^'"]*)?)['"]/g;

function sourceFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name) && !/\.test\.[tj]sx?$/.test(name))
      out.push(path);
  }
  return out;
}

describe('zod engine', () => {
  const imports = SCAN.flatMap((d) => sourceFiles(join(ROOT, d))).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(IMPORT)].map((m) => ({
      file: relative(ROOT, file),
      spec: m[1],
    }))
  );

  it('finds the known zod users (the scan is looking at real files)', () => {
    expect(imports.map((i) => i.file)).toEqual(
      expect.arrayContaining([
        'src/lib/server/ai-course-builder.ts',
        'src/components/auth/login-form.tsx',
        'src/components/auth/register-form.tsx',
      ])
    );
  });

  it('every app import of zod uses the zod 3 engine at zod/v3', () => {
    expect(imports.filter((i) => i.spec !== 'zod/v3')).toEqual([]);
  });
});
