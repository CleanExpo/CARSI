/**
 * Route-level canonical check, nested layouts included. The root layout's './' canonical
 * resolves per page, but a nested layout that sets an ABSOLUTE canonical hands it to every
 * page below it. Live on 18/10/2026: /subscribe/success was indexable ("index, follow") with
 * rel=canonical pointing at /subscribe, inherited from app/(public)/subscribe/layout.tsx.
 *
 * For every page under app/, the nearest `canonical:` (page first, then each enclosing
 * layout) must name that page's own path, unless the route is kept out of the index
 * (robots noindex in the page or a layout, an X-Robots-Tag noindex header in next.config,
 * or a robots.txt Disallow). A template-literal or computed canonical is page-specific and
 * is not judged here.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';

import nextConfig from '../../../next.config';
import robots from '../../../app/robots';

const APP = join(process.cwd(), 'app');

function pages(dir = APP, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name === 'api') continue;
    if (statSync(full).isDirectory()) pages(full, out);
    else if (/^page\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

function routePath(pageFile: string): string {
  const segs = relative(APP, dirname(pageFile))
    .split(sep)
    .filter((s) => s && !/^\(.*\)$/.test(s));
  return '/' + segs.join('/');
}

/** The page, then each enclosing layout up to app/. */
function chain(pageFile: string): string[] {
  const files = [pageFile];
  let dir = dirname(pageFile);
  while (dir.startsWith(APP)) {
    for (const f of ['layout.tsx', 'layout.ts']) {
      if (existsSync(join(dir, f))) files.push(join(dir, f));
    }
    if (dir === APP) break;
    dir = dirname(dir);
  }
  return files;
}

const NOINDEX = /index:\s*false|['"]noindex/;

/** First literal canonical value in a file: a string, or null when computed / absent. */
export function literalCanonical(source: string): { found: boolean; value: string | null } {
  const m = source.match(/canonical:\s*(['"`])([^'"`]*)\1/);
  if (m) return { found: true, value: m[1] === '`' && m[2].includes('${') ? null : m[2] };
  if (/canonical:/.test(source)) return { found: true, value: null };
  return { found: false, value: null };
}

async function headerNoindex(path: string): Promise<boolean> {
  const rules = (await nextConfig.headers?.()) ?? [];
  return rules.some((rule) => {
    const match = getPathMatch(rule.source, {
      strict: true,
      removeUnnamedParams: true,
      sensitive: false,
    });
    return (
      match(path) !== false &&
      rule.headers.some((h) => h.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(h.value))
    );
  });
}

function robotsDisallowed(path: string): boolean {
  const all = [robots().rules].flat().find((r) => r.userAgent === '*');
  const disallow = [all?.disallow ?? []].flat();
  return disallow.some(
    (d) => path === d.replace(/\/$/, '') || path.startsWith(d.endsWith('/') ? d : `${d}/`)
  );
}

/** Pages whose effective canonical names another path while the page stays indexable. */
async function offenders(): Promise<string[]> {
  const out: string[] = [];
  for (const page of pages()) {
    const path = routePath(page);
    if (path.includes('[')) continue; // dynamic routes compute their own canonical
    const files = chain(page);
    const sources = files.map((f) => readFileSync(f, 'utf8'));
    if (
      sources.some((s) => NOINDEX.test(s)) ||
      (await headerNoindex(path)) ||
      robotsDisallowed(path)
    )
      continue;
    const nearest = sources.map(literalCanonical).find((c) => c.found);
    if (!nearest || nearest.value === null || nearest.value === './') continue;
    const canonicalPath =
      new URL(nearest.value, 'https://carsi.com.au').pathname.replace(/\/$/, '') || '/';
    if (canonicalPath !== path) {
      const from = relative(
        process.cwd(),
        files[sources.findIndex((s) => literalCanonical(s).found)]
      );
      out.push(`${path} -> ${canonicalPath} (from ${from})`);
    }
  }
  return out;
}

describe('route-level canonicals', () => {
  it('reads a literal canonical and ignores computed ones', () => {
    expect(literalCanonical("alternates: { canonical: 'https://carsi.com.au/subscribe' }")).toEqual(
      {
        found: true,
        value: 'https://carsi.com.au/subscribe',
      }
    );
    expect(
      literalCanonical('alternates: { canonical: `${siteUrl}/courses/${slug}` }').value
    ).toBeNull();
    expect(literalCanonical('title: "x"').found).toBe(false);
  });

  it('no indexable page inherits a canonical that names a different path', async () => {
    expect(await offenders()).toEqual([]);
  });

  it('every post-purchase / post-submission success route is kept out of the index', async () => {
    // Live on 18/10/2026 /courses/<slug>/payment-success served "index, follow" with the
    // homepage canonical. Dynamic routes are checked too: their noindex does not vary by slug.
    const indexable: string[] = [];
    for (const page of pages()) {
      const path = routePath(page);
      if (!/\/(payment-)?success$/.test(path)) continue;
      const sources = chain(page).map((f) => readFileSync(f, 'utf8'));
      const concrete = path.replace(/\[[^\]]+\]/g, 'x');
      if (sources.some((s) => NOINDEX.test(s)) || (await headerNoindex(concrete))) continue;
      indexable.push(path);
    }
    expect(indexable).toEqual([]);
  });
});
