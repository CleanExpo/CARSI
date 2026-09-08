import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The checkout route is the ONLY path that mints a CCW-FREE entry token. An
 * independent review planted a mutant that deleted the whole
 * `allowsFreeEntryRegistration` block from that route, and the behavioural suite in
 * ccw-roadshow-registration-mode.test.ts stayed 7/7 green — the guard function was
 * tested, its wiring into the route was not. This file closes that gap.
 *
 * What this proves: the route calls the guard, and does so BEFORE it mints a token.
 * Both are decidable in the route source, which is where the wiring lives.
 *
 * What this does NOT prove: the route's runtime response. A full POST test would
 * need the rate limiter, captcha and Prisma stubbed; that is worth doing and is
 * tracked, but its absence must not leave the mint path with no control at all.
 */
const ROUTE_PATH = join(
  process.cwd(),
  'app/api/events/ccw-roadshow/checkout/route.ts',
);

describe('free entry token mint guard is wired into the checkout route', () => {
  const source = readFileSync(ROUTE_PATH, 'utf8');

  it('reads a route that actually mints tokens (positive control)', () => {
    // If this fails, the assertions below are checking the wrong file and their
    // passing would mean nothing.
    expect(source).toContain('generateFreeEntryToken');
    expect(source).toContain('getCcwRoadshowEvent');
  });

  it('calls allowsFreeEntryRegistration', () => {
    expect(source).toContain('allowsFreeEntryRegistration');
  });

  // `generateFreeEntryToken` is DECLARED in this file before it is called, and the
  // declaration sits above the guard. Matching the bare name — or even `name(` —
  // finds the declaration and makes the ordering check fail for the wrong reason,
  // which is exactly what happened on the first attempt at this test. Exclude the
  // declaration and assert against every remaining call site.
  const mintCallSites = (): number[] => {
    const sites: number[] = [];
    const re = /(?<!function\s)generateFreeEntryToken\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) sites.push(m.index);
    return sites;
  };

  it('finds a mint call that is not the declaration (positive control)', () => {
    const declAt = source.search(/function\s+generateFreeEntryToken\s*\(/);
    const sites = mintCallSites();
    expect(declAt, 'declaration not found - wrong file?').toBeGreaterThan(-1);
    expect(sites.length, 'no call site found, only the declaration').toBeGreaterThan(0);
    expect(sites, 'the declaration must not be counted as a call site').not.toContain(declAt);
  });

  it('refuses before minting, at every call site', () => {
    const guardAt = source.indexOf('allowsFreeEntryRegistration(event)');
    expect(guardAt, 'guard call not found in route').toBeGreaterThan(-1);
    for (const site of mintCallSites()) {
      expect(
        guardAt,
        `a token is minted at offset ${site} before the registration guard runs`,
      ).toBeLessThan(site);
    }
  });

  it('short-circuits with a refusal rather than falling through', () => {
    // The guard must return, not merely log or set a flag.
    const guardBlock = source.slice(
      source.indexOf('if (!allowsFreeEntryRegistration(event))'),
      mintCallSites()[0],
    );
    expect(guardBlock).toContain('return NextResponse.json');
    expect(guardBlock).toMatch(/status:\s*409/);
  });
});
