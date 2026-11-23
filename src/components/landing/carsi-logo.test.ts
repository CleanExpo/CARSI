import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  APPROVED_CARSI_LOGO_PATHS,
  CARSI_LOGO_SRC,
  isApprovedCarsiLogoSrc,
} from './carsi-logo';

const ORIGIN = 'https://carsi.com.au';

/** What next/image puts in img.currentSrc for a local file. */
function nextImageUrl(file: string): string {
  return `${ORIGIN}/_next/image?url=${encodeURIComponent(file)}&w=640&q=75`;
}

describe('approved CARSI logo paths (single owner for PublicLogo and the live smoke)', () => {
  it('lists exactly the light wordmark and the reversed chrome wordmark', () => {
    expect(CARSI_LOGO_SRC).toEqual({ light: '/logo/logo1.png', chrome: '/logo/dark-logo.png' });
    expect([...APPROVED_CARSI_LOGO_PATHS].sort()).toEqual(
      ['/logo/dark-logo.png', '/logo/logo1.png'].sort()
    );
  });

  it('accepts each approved logo, served direct or through next/image', () => {
    for (const file of APPROVED_CARSI_LOGO_PATHS) {
      expect(isApprovedCarsiLogoSrc(`${ORIGIN}${file}`), file).toBe(true);
      expect(isApprovedCarsiLogoSrc(nextImageUrl(file)), `next/image ${file}`).toBe(true);
      expect(isApprovedCarsiLogoSrc(`${file}?v=2`), `relative with cache-buster ${file}`).toBe(true);
    }
  });

  it('accepts the reversed wordmark the /login band shows (live smoke run 45109317306)', () => {
    expect(isApprovedCarsiLogoSrc(nextImageUrl('/logo/dark-logo.png'))).toBe(true);
  });

  it('rejects an unapproved logo, so a page showing only that still fails the smoke', () => {
    const unapproved = [
      nextImageUrl('/logo/old-shield.png'),
      `${ORIGIN}/logo/carsi-badge.png`,
      `${ORIGIN}/images/logo1.png`,
      // A look-alike that merely contains an approved path must not pass.
      `${ORIGIN}/logo/logo1.png.bak.png`,
      `${ORIGIN}/img/other.png?from=/logo/logo1.png`,
      nextImageUrl('/logo/other.png?x=/logo/dark-logo.png'),
      '',
      'not a url at all',
    ];
    for (const src of unapproved) {
      expect(isApprovedCarsiLogoSrc(src), src).toBe(false);
    }
  });
});

describe('the live smoke takes the list from its owner, never a second copy', () => {
  const smoke = readFileSync(path.join(process.cwd(), 'e2e', 'live-smoke.live.ts'), 'utf8');

  it('imports the approved-logo rule from carsi-logo', () => {
    expect(smoke).toMatch(/from '\.\.\/src\/components\/landing\/carsi-logo'/);
    expect(smoke).toContain('isApprovedCarsiLogoSrc');
  });

  it('hard-codes no logo path of its own', () => {
    expect(smoke).not.toMatch(/\/logo\//);
  });
});

describe('PublicLogo renders only approved paths', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'src', 'components', 'landing', 'PublicLogo.tsx'),
    'utf8'
  );

  it('uses the shared CARSI_LOGO_SRC rather than its own literals', () => {
    expect(source).toContain("from './carsi-logo'");
    expect(source).not.toMatch(/['"]\/logo\//);
  });
});
