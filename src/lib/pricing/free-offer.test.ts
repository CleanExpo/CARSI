/**
 * GP-574. The pricing page promised a "Free Library" with ten named items (standard operating
 * procedures, a webinar series, a terminology guide and so on). None of them exists on the site,
 * and /library and /free-library return 404. The free offer may name only what is really free
 * (courses marked Free, and the Free Resources page), and may link only to pages that exist.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveDisciplineParam } from '@/lib/catalogue/discipline-param';
import { pricingFaqs } from '@/lib/seo/answer-engine';

const ROOT = join(__dirname, '../../..');
const PRICING_PAGE = readFileSync(join(ROOT, 'app/(public)/pricing/page.tsx'), 'utf8');

// The ten items the old card listed. None of them is published on the site.
const UNBACKED_ITEMS = [
  'Australian Government Resources',
  'Standard Operating Procedures',
  'Cleaning Essentials guide',
  'Job Safety & Environmental Analysis',
  'Safe Work Method Statement',
  'Free Webinar Series',
  'Industry Terminology guide',
  'Technician Flow Chart',
  'Moisture & Dehumidification guide',
  'ChatGPT Cheat Sheet for Restorers',
];

function faqText(): string {
  return pricingFaqs({
    minPaidCoursePriceAud: 29,
    membership: { priceAud: 795, available: true, terms: 'Yearly access.' },
  })
    .map((f) => `${f.question} ${f.answer}`)
    .join('\n');
}

/** A public page path ("/resources") exists when app/(public)/<path>/page.tsx exists. */
function publicPageExists(path: string): boolean {
  const segment = path.split('?')[0].replace(/^\/+|\/+$/g, '');
  return existsSync(join(ROOT, 'app/(public)', segment, 'page.tsx'));
}

describe('pricing page free offer (GP-574)', () => {
  it('links only to public pages that exist', async () => {
    const { FREE_OFFER } = await import('./free-offer');
    const hrefs = [FREE_OFFER.href, FREE_OFFER.resourcesHref];
    expect(hrefs).toEqual(['/courses?discipline=free', '/resources']);
    for (const href of hrefs) expect(publicPageExists(href), href).toBe(true);
  });

  it('opens the catalogue on its Free tab', async () => {
    const { FREE_OFFER } = await import('./free-offer');
    const param = new URL(FREE_OFFER.href, 'https://carsi.com.au').searchParams.get('discipline');
    expect(resolveDisciplineParam(param)).toBe('Free');
  });

  it('is the offer the pricing page renders', () => {
    expect(PRICING_PAGE).toContain("from '@/lib/pricing/free-offer'");
    expect(PRICING_PAGE).toContain('FREE_OFFER.href');
    expect(PRICING_PAGE).toContain('FREE_OFFER.resourcesHref');
  });

  it('names no "Free Library" and none of the ten unbacked items', () => {
    expect(PRICING_PAGE).not.toMatch(/free library/i);
    expect(faqText()).not.toMatch(/free library/i);
    for (const item of UNBACKED_ITEMS) expect(PRICING_PAGE).not.toContain(item);
  });

  it('never links the missing /library or /free-library pages', () => {
    expect(PRICING_PAGE).not.toMatch(/['"`]\/(free-)?library\b/);
  });
});

/**
 * The homepage pricing section carried the same false promise in a second copy: a "Free Library"
 * tier, "real certificates" and "Certificates included" with no condition, linking the whole
 * catalogue rather than its Free tab. A certificate is issued only once every lesson and required
 * assessment is complete (app/api/lms/enrollments/[enrollmentId]/certificate/route.ts), so the
 * wording must say so. The homepage reads its free tier from FREE_OFFER so the two cannot drift.
 */
describe('homepage free tier (GP-574)', () => {
  const HOME = readFileSync(join(ROOT, 'src/components/landing/HomePricingSection.tsx'), 'utf8');

  it('reads its free tier from FREE_OFFER', () => {
    expect(HOME).toContain("from '@/lib/pricing/free-offer'");
    for (const field of [
      'FREE_OFFER.title',
      'FREE_OFFER.href',
      'FREE_OFFER.cta',
      'FREE_OFFER.home.description',
      'FREE_OFFER.home.features',
    ]) {
      expect(HOME, field).toContain(field);
    }
  });

  it('names no "Free Library" and makes no unconditional certificate promise', async () => {
    const { FREE_OFFER } = await import('./free-offer');
    const wording = [HOME, JSON.stringify(FREE_OFFER)];
    for (const text of wording) {
      expect(text).not.toMatch(/free library/i);
      expect(text).not.toMatch(/certificates included|real certificates/i);
    }
    const certificateLines = FREE_OFFER.home.features.filter((f) => /certificate/i.test(f));
    for (const line of certificateLines) expect(line).toMatch(/when you (finish|complete)/i);
  });

  it('keeps every homepage free-tier line short enough for the ticket card', async () => {
    const { FREE_OFFER } = await import('./free-offer');
    expect(FREE_OFFER.home.features.length).toBe(3);
    for (const line of FREE_OFFER.home.features) expect(line.length, line).toBeLessThanOrEqual(40);
  });
});
