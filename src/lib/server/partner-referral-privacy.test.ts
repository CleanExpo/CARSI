/**
 * GP-767: Phill ruled (22/11/2026) that the partner referral cookie needs no consent gate, and
 * that the privacy policy names it in one plain sentence in section 7 (Cookies).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PARTNER_REF_COOKIE_MAX_AGE_SECONDS,
  PARTNER_REF_COOKIE_NAME,
} from '@/lib/partners/referral-partners';

const SOURCE = readFileSync(path.join(process.cwd(), 'app/(public)/privacy/page.tsx'), 'utf8');

/** The page's visible text: JSX tags and {' '} spacers removed, entities decoded, whitespace collapsed. */
function visibleText(tsx: string): string {
  return tsx
    .replace(/\{' '\}/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&rsquo;/g, '’')
    .replace(/\s+/g, ' ');
}

describe('privacy policy names the partner referral cookie (GP-767)', () => {
  it('says what the cookie records, for how long, and that it is not shared', () => {
    expect(visibleText(SOURCE)).toContain(
      'If you arrive through a CARSI partner’s link, we set a first-party cookie, carsi_ref, for 30 days recording which partner referred you, so we can credit them for a purchase. It is not shared with the partner or anyone else.'
    );
  });

  it('places it in section 7 (Cookies), before the analytics services', () => {
    const cookies = SOURCE.indexOf('<section id="cookies">');
    const referral = SOURCE.indexOf('Partner referral links');
    const analytics = SOURCE.indexOf('>Google Analytics</h3>');
    expect(cookies).toBeGreaterThan(-1);
    expect(referral).toBeGreaterThan(cookies);
    expect(analytics).toBeGreaterThan(referral);
  });

  it('matches the cookie the code actually sets', () => {
    expect(PARTNER_REF_COOKIE_NAME).toBe('carsi_ref');
    expect(PARTNER_REF_COOKIE_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });
});
