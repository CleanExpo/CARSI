/**
 * GP-700 source guard: the request's Host and X-Forwarded-Host headers are caller-controlled,
 * so no server code may build an absolute URL from them. There is one owner for the site
 * address, `getAppOrigin` in src/lib/server/app-url.ts; every email link, redirect, Stripe
 * return URL and credential link calls it instead of reading the request.
 *
 * Named limit: `request.nextUrl.clone()` redirects in the proxy keep the requester's own host.
 * They answer only the request that carried the header (nothing is stored or emailed), so they
 * are outside this guard.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCAN_DIRS = ['app', 'src'];
const SCAN_FILES = ['proxy.ts'];

/** Files allowed to read the request host, each with the reason. */
const ALLOWED: Record<string, string> = {
  'src/lib/server/app-url.ts': 'the single owner; reads the request only outside production',
  'src/lib/server/first-touch-capture.ts':
    'records the landing page for analytics; never builds a link or redirect',
};

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'request.nextUrl origin/host', re: /\bnextUrl\??\.(origin|host|hostname|href)\b/ },
  { name: 'new URL(request.url).origin', re: /\.url\)\.origin\b/ },
  { name: 'Host header', re: /\.get\(\s*['"]host['"]\s*\)/i },
  { name: 'X-Forwarded-Host header', re: /x-forwarded-host/i },
  { name: 'X-Forwarded-Proto header', re: /x-forwarded-proto/i },
];

function listSources(rel: string, out: string[]) {
  const abs = path.join(ROOT, rel);
  for (const name of readdirSync(abs)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const childRel = `${rel}/${name}`;
    const st = statSync(path.join(abs, name));
    if (st.isDirectory()) listSources(childRel, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(childRel);
  }
}

function findViolations(files: string[], read: (rel: string) => string): string[] {
  const hits: string[] = [];
  for (const rel of files) {
    if (ALLOWED[rel]) continue;
    const lines = read(rel).split('\n');
    lines.forEach((line, i) => {
      for (const { name, re } of FORBIDDEN) {
        if (re.test(line)) hits.push(`${rel}:${i + 1} ${name}: ${line.trim()}`);
      }
    });
  }
  return hits;
}

describe('GP-700 host header guard', () => {
  it('no server code builds a URL from the request host', () => {
    const files: string[] = [];
    for (const dir of SCAN_DIRS) listSources(dir, files);
    files.push(...SCAN_FILES);
    expect(files.length).toBeGreaterThan(100);
    const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
    expect(findViolations(files, read)).toEqual([]);
  });

  it('positive control: each pattern fires on a planted line', () => {
    const planted: Record<string, string> = {
      'app/a.ts': 'const origin = request.nextUrl.origin;',
      'app/b.ts': "const o = new URL(request.url).origin;",
      'app/c.ts': "const host = request.headers.get('host');",
      'app/d.ts': "const h = headers.get('X-Forwarded-Host');",
      'app/e.ts': "const p = h.get('x-forwarded-proto') ?? 'http';",
    };
    const hits = findViolations(Object.keys(planted), (rel) => planted[rel]);
    expect(hits).toHaveLength(5);
  });
});
