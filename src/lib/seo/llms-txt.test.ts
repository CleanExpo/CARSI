/**
 * public/llms.txt is quoted by AI answer engines, so a stale path or an unsupported claim there
 * spreads. Every site path it lists must resolve to a real app route or public file.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const LLMS = readFileSync(join(ROOT, 'public', 'llms.txt'), 'utf8');

/** Child dirs of an app dir, looking through route groups like `(public)`. */
function childDirs(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (!statSync(full).isDirectory()) continue;
    if (/^\(.*\)$/.test(name)) out.push(...childDirs(full));
    else out.push(full);
  }
  return out;
}

function hasRouteFile(dir: string): boolean {
  return ['page.tsx', 'page.ts', 'route.ts'].some((f) => existsSync(join(dir, f)));
}

/**
 * True when `/a/{id}/b` matches an app route: a static segment matches its directory (else a
 * `[param]` directory), and `{x}` matches a `[param]` directory.
 */
export function siteRouteExists(path: string): boolean {
  const clean = path.split(/[?#]/)[0];
  if (existsSync(join(ROOT, 'public', clean))) return true;
  const segments = clean.split('/').filter(Boolean);
  let frontier = [join(ROOT, 'app')];
  for (const segment of segments) {
    const dynamic = /^\{.+\}$/.test(segment);
    frontier = frontier.flatMap((dir) => {
      const children = childDirs(dir);
      const name = (child: string) => child.split('/').pop() ?? '';
      const params = children.filter((child) => /^\[.+\]$/.test(name(child)));
      if (dynamic) return params;
      const exact = children.filter((child) => name(child) === segment);
      // A concrete value (e.g. a start-smart slug) is served by the dynamic segment.
      return exact.length > 0 ? exact : params;
    });
    if (frontier.length === 0) return false;
  }
  return segments.length === 0 ? true : frontier.some(hasRouteFile);
}

/** Paths from the "- /path — description" route list and "Method: GET /path" lines. */
function listedPaths(text: string): string[] {
  const fromList = Array.from(text.matchAll(/^- (\/[^\s—]*)\s+—/gm), (m) => m[1]);
  const fromMethods = Array.from(text.matchAll(/Method: (?:GET|POST) (\/\S+)/g), (m) => m[1]);
  return [...new Set([...fromList, ...fromMethods])];
}

describe('llms.txt', () => {
  it('the route checker can fail: an invented path is rejected', () => {
    expect(siteRouteExists('/credentials-made-up/{id}')).toBe(false);
    expect(siteRouteExists('/verify/credential/{id}')).toBe(true);
    expect(siteRouteExists('/carsi-citation-pack.json')).toBe(true);
  });

  it('lists only paths that exist', () => {
    const paths = listedPaths(LLMS);
    expect(paths.length).toBeGreaterThan(10);
    expect(paths.filter((p) => !siteRouteExists(p))).toEqual([]);
  });

  it('uses the current credential verification path', () => {
    expect(LLMS).not.toMatch(/\/credentials\/\{id\}/);
    expect(LLMS).toContain('/verify/credential/{id}');
  });

  it('lists the CEC hub', () => {
    expect(LLMS).toContain('/iicrc-cec-courses');
  });

  it('carries no unsupported superlative or stale price floor', () => {
    expect(LLMS).not.toMatch(/Australia['’]s leading/i);
    expect(LLMS).not.toMatch(/\bleading (online )?training/i);
    expect(LLMS).not.toMatch(/from \$20\b/);
    expect(LLMS).not.toMatch(/CARSI-awarded IICRC/i);
  });
});
