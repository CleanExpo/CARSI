/**
 * Live link check for the /ecosystem page and the legacy WordPress redirects.
 *
 *   npx tsx scripts/check-ecosystem-links.ts               every outbound href the page renders
 *                                                          resolves to 200 on its own host, and
 *                                                          every redirect destination is 200 on
 *                                                          carsi.com.au
 *   npx tsx scripts/check-ecosystem-links.ts --self-test   proves the checker fails on a planted
 *                                                          404 and a planted cross-host redirect
 *   npx tsx scripts/check-ecosystem-links.ts --legacy-status
 *                                                          prints what each legacy URL answers on
 *                                                          the live site today (evidence, no gate)
 *
 * The URLs come from src/lib/ecosystem/products.ts and src/lib/seo/legacy-wordpress-redirects.ts
 * themselves, never from a copy, so the check cannot drift from what the page links to.
 *
 * Exit 0 pass · 1 a link failed · 2 network trouble (UNPROVEN: report it, never read it as a pass).
 */
import { ECOSYSTEM_PRODUCTS, ecosystemHref } from '../src/lib/ecosystem/products';
import { LEGACY_WORDPRESS_REDIRECTS } from '../src/lib/seo/legacy-wordpress-redirects';

const SITE = 'https://carsi.com.au';
const TIMEOUT_MS = 20_000;
const MAX_HOPS = 3;

type Outcome =
  | { ok: true; status: number; finalUrl: string }
  | { ok: false; reason: string; network?: boolean };

async function request(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  return fetch(url, {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': 'carsi-ecosystem-link-check/1.0 (+https://carsi.com.au/ecosystem)' },
  });
}

/** Follows at most MAX_HOPS redirects; the final answer must be 200 on the starting host. */
export async function checkUrl(url: string, opts: { allowRedirects?: boolean } = {}): Promise<Outcome> {
  const startHost = new URL(url).host;
  let current = url;
  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await request(current, 'HEAD');
      if (res.status === 403 || res.status === 405) res = await request(current, 'GET');
    } catch (e) {
      return { ok: false, network: true, reason: `${current}: ${(e as Error).message}` };
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return { ok: false, reason: `${current}: ${res.status} with no location` };
      const next = new URL(location, current);
      if (next.host !== startHost) {
        return { ok: false, reason: `${url}: redirects off-site to ${next.host} (${res.status})` };
      }
      if (opts.allowRedirects === false) {
        return { ok: false, reason: `${url}: redirected (${res.status} -> ${next.pathname})` };
      }
      current = next.toString();
      continue;
    }
    if (res.status !== 200) return { ok: false, reason: `${url}: HTTP ${res.status}` };
    return { ok: true, status: res.status, finalUrl: current };
  }
  return { ok: false, reason: `${url}: more than ${MAX_HOPS} redirects` };
}

function targets(): Array<{ url: string; allowRedirects: boolean }> {
  const outbound = ECOSYSTEM_PRODUCTS.flatMap((p) =>
    p.links.map((l) => ({ url: ecosystemHref(l.url), allowRedirects: true }))
  );
  const destinations = [...new Set(LEGACY_WORDPRESS_REDIRECTS.map((r) => r.destination))].map(
    (path) => ({ url: `${SITE}${path}`, allowRedirects: false })
  );
  return [...outbound, ...destinations];
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  if (args.includes('--legacy-status')) {
    for (const r of LEGACY_WORDPRESS_REDIRECTS) {
      const path = r.source.replace('/:slug*', '/carsi-unknown-legacy-product');
      const res = await request(`${SITE}${path}/`, 'GET').catch(() => null);
      const hop1 = res ? `${res.status} ${res.headers.get('location') ?? ''}` : 'network error';
      const res2 = await request(`${SITE}${path}`, 'GET').catch(() => null);
      const hop2 = res2 ? `${res2.status} ${res2.headers.get('location') ?? ''}` : 'network error';
      console.log(`${path}/  ->  ${hop1.trim()}   |   ${path}  ->  ${hop2.trim()}`);
    }
    return 0;
  }

  if (args.includes('--self-test')) {
    const planted404 = await checkUrl('https://restoreassist.app/__carsi_link_check_selftest_404');
    const plantedOffsite = await checkUrl('https://www.disasterrecovery.com.au/trade-hall');
    const good = await checkUrl(`${SITE}/courses`, { allowRedirects: false });
    const network = [planted404, plantedOffsite, good].some((o) => !o.ok && o.network);
    if (network) {
      console.error('UNPROVEN: network trouble during self-test');
      return 2;
    }
    const flagged404 = !planted404.ok && /HTTP 404/.test(planted404.reason);
    const flaggedOffsite = !plantedOffsite.ok && /off-site/.test(plantedOffsite.reason);
    console.log(`self-test: planted 404 flagged=${flagged404}; planted off-site redirect flagged=${flaggedOffsite}; known-good passed=${good.ok}`);
    return flagged404 && flaggedOffsite && good.ok ? 0 : 1;
  }

  const list = targets();
  const results = await Promise.all(list.map((t) => checkUrl(t.url, { allowRedirects: t.allowRedirects })));
  let passed = 0;
  let network = false;
  results.forEach((o, i) => {
    if (o.ok) {
      passed++;
      console.log(`ok   ${list[i].url}`);
    } else {
      network ||= Boolean(o.network);
      console.log(`FAIL ${o.reason}`);
    }
  });
  console.log(`checked ${passed}/${list.length}`);
  if (passed === list.length) return 0;
  return network ? 2 : 1;
}

main().then((code) => process.exit(code));
