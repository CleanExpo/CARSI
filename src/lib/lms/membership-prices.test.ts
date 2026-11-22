/**
 * GP-773: the membership prices are the founder's 20/10/2026 prices (ruled again by pop-up on
 * 22/11/2026), and every page that prints one reads them from `membership-prices.ts`.
 *
 * - Individual annual membership: A$795 per year.
 * - Business owner plan: A$1,295 per year (the code used to say per month).
 * - Each extra staff member: A$695 per year (the code used to say $49, $39 or $29 by tier).
 *
 * The last block scans `app/` and `src/` for a membership amount written anywhere else, so a
 * second copy of a price cannot drift from the source again.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PricingTiers } from '@/components/pricing/PricingTiers';
import { INDIVIDUAL_TIERS, TEAM_TIERS } from '@/lib/lms/pricing-tiers';
import {
  BUSINESS_OWNER_PLAN,
  EXTRA_STAFF_SEAT,
  INDIVIDUAL_MEMBERSHIP,
  annualPriceLabel,
  extraSeatLabel,
} from '@/lib/lms/membership-prices';
import { MEMBERSHIP_PRICE_AUD } from '@/lib/membership-checkout';
import { RWR_MEMBERSHIP_ANNUAL_CENTS } from '@/lib/metrics/rwr';
import { formatOnboardingPrice, resolveOnboardingAmountAud } from '@/lib/onboarding/enterprise';

describe('the source of truth holds the founder prices', () => {
  it('individual membership is A$795 per year', () => {
    expect(INDIVIDUAL_MEMBERSHIP.amountCents).toBe(79_500);
    expect(INDIVIDUAL_MEMBERSHIP.interval).toBe('year');
    expect(INDIVIDUAL_MEMBERSHIP.currency).toBe('aud');
  });

  it('business owner plan is A$1,295 per YEAR, not per month', () => {
    expect(BUSINESS_OWNER_PLAN.amountCents).toBe(129_500);
    expect(BUSINESS_OWNER_PLAN.interval).toBe('year');
    expect(BUSINESS_OWNER_PLAN.currency).toBe('aud');
  });

  it('each extra staff member is A$695 per year', () => {
    expect(EXTRA_STAFF_SEAT.amountCents).toBe(69_500);
    expect(EXTRA_STAFF_SEAT.interval).toBe('year');
    expect(EXTRA_STAFF_SEAT.currency).toBe('aud');
  });

  it('labels are built from the amounts', () => {
    expect(annualPriceLabel(INDIVIDUAL_MEMBERSHIP)).toBe('$795 / year');
    expect(annualPriceLabel(BUSINESS_OWNER_PLAN)).toBe('$1,295 / year');
    expect(extraSeatLabel()).toBe('+$695/seat per year');
  });
});

describe('every price reader uses the source', () => {
  it('the yearly membership tier', () => {
    const yearly = INDIVIDUAL_TIERS.find((t) => t.id === 'pro_annual');
    expect(yearly?.priceCents).toBe(INDIVIDUAL_MEMBERSHIP.amountCents);
    expect(yearly?.priceLabel).toBe('$795 / year');
  });

  it('every Teams tier quotes A$695 per extra seat, not $49, $39 or $29', () => {
    for (const tier of TEAM_TIERS) {
      expect(tier.perSeatExpansionLabel).toBe('+$695/seat per year');
    }
  });

  it('the membership checkout analytics value', () => {
    expect(MEMBERSHIP_PRICE_AUD).toBe(795);
  });

  it('the RWR membership term', () => {
    expect(RWR_MEMBERSHIP_ANNUAL_CENTS).toBe(INDIVIDUAL_MEMBERSHIP.amountCents);
  });

  it('the organisation (business owner) label is per year, whatever stale course meta says', () => {
    const stale = { amountAud: 1295, billingCycle: 'monthly' as const, gst: 'exclusive' as const };
    for (const label of [formatOnboardingPrice(), formatOnboardingPrice(null), formatOnboardingPrice(stale)]) {
      expect(label).toContain('$1,295/year');
      expect(label).not.toContain('/month');
      expect(label).not.toContain('+ GST');
    }
  });

  it('the onboarding fallback amount is the business owner price, whatever course meta says', () => {
    expect(resolveOnboardingAmountAud(null)).toBe(1295);
    expect(resolveOnboardingAmountAud({ pricing: { amountAud: 99 } })).toBe(1295);
  });
});

describe('the /pricing page shows the same numbers', () => {
  for (const props of [{}, { subscriptionsEnabled: true, teamsEnabled: true }]) {
    it(`renders $795 / year and +$695 per seat (${JSON.stringify(props)})`, () => {
      const html = renderToStaticMarkup(createElement(PricingTiers, props));
      expect(html).toContain('$795 / year');
      if ((props as { teamsEnabled?: boolean }).teamsEnabled) {
        expect(html).toContain('+$695/seat per year');
      }
      for (const old of ['+$49/seat', '+$39/seat', '+$29/seat', '/month']) {
        expect(html).not.toContain(old);
      }
    });
  }
});

/**
 * A membership amount written outside the source file. Comment lines are skipped: they describe,
 * they do not render or charge.
 */
const ROOT = join(__dirname, '..', '..', '..');
const SOURCE_FILE = 'src/lib/lms/membership-prices.ts';
const EXEMPT = new Set([
  SOURCE_FILE,
  // Do-not-touch while the GP-748 IICRC removal PR is open; its "$795/yr" matches the source.
  // Follow-up: read INDIVIDUAL_MEMBERSHIP there once GP-748 merges.
  'src/components/lms/CoursePublicDetail.tsx',
]);
const PATTERNS: RegExp[] = [
  /\b(?:79_?500|129_?500|69_?500)\b/,
  /\$\s?(?:795|1,295|1295|695)\b/,
  /\b(?:amountAud|price|priceAud)\s*:\s*(?:795|1295|695)\b/,
  /\breturn\s+(?:795|1295|695)\b/,
  /['"`](?:795|1295|695)['"`]/,
  /=\s*(?:795|1295|695)\s*;/,
];

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      // src/generated is Prisma output (its inline schema copies schema.prisma comments).
      if (name === 'node_modules' || name === 'generated' || name.startsWith('.')) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
}

describe('no second copy of a membership price', () => {
  it('app/ and src/ carry no membership amount outside the source', () => {
    const files: string[] = [];
    walk(join(ROOT, 'app'), files);
    walk(join(ROOT, 'src'), files);
    const hits: string[] = [];
    for (const file of files) {
      const rel = relative(ROOT, file).split('\\').join('/');
      if (EXEMPT.has(rel)) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const t = line.trim();
          if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*')) return;
          if (PATTERNS.some((p) => p.test(line))) hits.push(`${rel}:${i + 1}: ${t}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('the scan is live: it flags a planted copy', () => {
    const planted = "  const priceLabel = '$795 / year';";
    expect(PATTERNS.some((p) => p.test(planted))).toBe(true);
  });
});
