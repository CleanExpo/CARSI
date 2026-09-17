/**
 * /pricing cards: which plan is on sale under which switch, and the per-course price label.
 *
 * The coming-soon test id is asserted by the Reticle flow
 * `.reticle/flows/carsi-0f3ff945/pricing-yearly-not-on-sale.json` and by
 * `scripts/verify-go-live-readiness.mjs`, so it is pinned here too: renaming it without them
 * would turn both of those checks blind.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  INDIVIDUAL_TIERS,
  PER_COURSE_PRICE_FALLBACK_LABEL,
  perCoursePriceLabel,
} from '@/lib/lms/pricing-tiers';
import { minPaidCoursePrice } from '@/lib/server/public-catalogue-facts';

import { PricingTiers, tierCtaTestId } from './PricingTiers';

function render(props: Parameters<typeof PricingTiers>[0]): string {
  return renderToStaticMarkup(createElement(PricingTiers, props));
}

const has = (html: string, id: string) => html.includes(`data-testid="${id}"`);

describe('PricingTiers — switches', () => {
  it('both off: yearly and Teams are coming soon, nothing is buyable', () => {
    const html = render({});
    expect(has(html, 'pricing-pro_annual-coming-soon')).toBe(true);
    expect(has(html, 'pricing-pro_annual-buy')).toBe(false);
    for (const id of ['starter', 'growth', 'full_library']) {
      expect(has(html, `pricing-${id}-coming-soon`)).toBe(true);
      expect(has(html, `pricing-${id}-buy`)).toBe(false);
    }
    expect(html).not.toContain('Start membership');
    expect(html).not.toContain('Start Teams plan');
  });

  it('yearly on, Teams off: only the yearly card is on sale', () => {
    const html = render({ subscriptionsEnabled: true, teamsEnabled: false });
    expect(has(html, 'pricing-pro_annual-buy')).toBe(true);
    expect(has(html, 'pricing-pro_annual-coming-soon')).toBe(false);
    expect(html).toContain('Start membership');
    for (const id of ['starter', 'growth', 'full_library']) {
      expect(has(html, `pricing-${id}-coming-soon`)).toBe(true);
      expect(has(html, `pricing-${id}-buy`)).toBe(false);
    }
    expect(html).not.toContain('Start Teams plan');
  });

  it('both on: yearly and Teams are on sale', () => {
    const html = render({ subscriptionsEnabled: true, teamsEnabled: true });
    expect(has(html, 'pricing-pro_annual-buy')).toBe(true);
    for (const id of ['starter', 'growth', 'full_library']) {
      expect(has(html, `pricing-${id}-buy`)).toBe(true);
      expect(has(html, `pricing-${id}-coming-soon`)).toBe(false);
    }
  });

  it('the coming-soon CTA is marked disabled and says "Coming soon"', () => {
    const html = render({});
    const span = html.match(
      /<span[^>]*data-testid="pricing-pro_annual-coming-soon"[^>]*>([^<]*)<\/span>/
    );
    expect(span).not.toBeNull();
    expect(span?.[0]).toContain('aria-disabled="true"');
    expect(span?.[1]).toBe('Coming soon');
  });

  it('test ids match the ids the Reticle flow and the go-live script look for', () => {
    expect(tierCtaTestId('pro_annual', true)).toBe('pricing-pro_annual-coming-soon');
    const flow = readFileSync(
      join(process.cwd(), '.reticle/flows/carsi-0f3ff945/pricing-yearly-not-on-sale.json'),
      'utf8'
    );
    expect(flow).toContain('"pricing-pro_annual-coming-soon"');
  });
});

describe('per-course price label', () => {
  it('renders the derived label, not the fallback, when a price is known', () => {
    const html = render({ perCoursePriceLabel: 'From $29' });
    expect(html).toContain('From $29');
    expect(html).not.toContain(PER_COURSE_PRICE_FALLBACK_LABEL);
  });

  it('formats whole and fractional dollars, and refuses unusable figures', () => {
    expect(perCoursePriceLabel(29)).toBe('From $29');
    expect(perCoursePriceLabel(29.5)).toBe('From $29.50');
    for (const bad of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(perCoursePriceLabel(bad)).toBeNull();
    }
  });

  it('takes the lowest PAID price: free, zero and unreadable prices are skipped', () => {
    expect(
      minPaidCoursePrice([
        { price_aud: 0, is_free: true },
        { price_aud: 10, is_free: true },
        { price_aud: 0, is_free: false },
        { price_aud: 'n/a', is_free: false },
        { price_aud: '49.00', is_free: false },
        { price_aud: 29, is_free: false },
        { price_aud: 149 },
      ])
    ).toBe(29);
    expect(minPaidCoursePrice([])).toBeNull();
    expect(minPaidCoursePrice([{ price_aud: 99, is_free: true }])).toBeNull();
  });

  it('over the seed catalogue, the label is the cheapest published paid course', () => {
    const seed = JSON.parse(
      readFileSync(join(process.cwd(), 'data/seed/courses-catalog.json'), 'utf8')
    ) as { courses: Array<{ status: string; priceAud: number; isFree: boolean }> };
    const published = seed.courses.filter((c) => c.status.toLowerCase() === 'published');
    const paid = published.filter((c) => !c.isFree && Number(c.priceAud) > 0);
    expect(paid.length).toBeGreaterThan(0);
    const label = perCoursePriceLabel(
      minPaidCoursePrice(published.map((c) => ({ price_aud: c.priceAud, is_free: c.isFree })))
    );
    expect(label).toBe(`From $${Math.min(...paid.map((c) => Number(c.priceAud)))}`);
    // The figure the page used to hardcode matches no published course.
    expect(paid.some((c) => Number(c.priceAud) === 20)).toBe(false);
  });

  it('the static tier data carries no dollar figure for per-course', () => {
    const perCourse = INDIVIDUAL_TIERS.find((t) => t.id === 'per_course');
    expect(perCourse?.priceLabel).toBe(PER_COURSE_PRICE_FALLBACK_LABEL);
    expect(perCourse?.priceLabel).not.toMatch(/\$\d/);
  });

  it('no page or component hardcodes a "From $N" per-course price', () => {
    const files = [
      'app/(public)/pricing/page.tsx',
      'app/(public)/restoration-training-cost-australia/page.tsx',
      'app/page.tsx',
      'src/components/landing/HomePricingSection.tsx',
      'src/components/pricing/PricingTiers.tsx',
      'src/lib/lms/pricing-tiers.ts',
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8');
      expect(src, f).not.toMatch(/From \$\d/);
    }
  });

  it('per-course copy does not call every course IICRC CEC Accredited', () => {
    const perCourse = INDIVIDUAL_TIERS.find((t) => t.id === 'per_course');
    expect(perCourse?.description).not.toMatch(/per IICRC CEC Accredited course/i);
    const html = render({});
    expect(html).not.toMatch(/per IICRC CEC Accredited course/i);
    expect(html).toContain('only for courses the IICRC has approved');
  });
});
