import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as lucide from 'lucide-react';
import { describe, expect, it } from 'vitest';

// lucide-react 1.x removed its brand icons (Linkedin, Github, ...). A removed named import is
// `undefined` at runtime: it passes type-stripped tooling and then throws "Element type is
// invalid" when rendered. This guard fails on the import itself.
const SRC = join(process.cwd(), 'src');
const IMPORT_RE = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) ? [path] : [];
  });
}

describe('lucide-react named imports', () => {
  it('every runtime import resolves to an exported icon', () => {
    const exported = lucide as Record<string, unknown>;
    const missing: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(IMPORT_RE)) {
        for (const raw of match[1].split(',')) {
          const entry = raw.trim();
          if (!entry || entry.startsWith('type ')) continue;
          const name = entry.split(/\s+as\s+/)[0];
          if (name !== 'LucideIcon' && !(name in exported)) missing.push(`${name} in ${file}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
