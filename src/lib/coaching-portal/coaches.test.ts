import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CoachNotificationEmailInvalidError,
  CoachPriceMissingError,
  coachCharge,
  isMemberOfChapter,
  sameCharge,
  stripePriceMatchesCharge,
  coachCheckoutLineItem,
  coachNotifyRecipients,
  coachPriceDisclosure,
  coachPriceLabel,
  countActions,
  memberOnboardingStatus,
  nextSessionAt,
  type CoachRecord,
} from '@/lib/coaching-portal/coaches';
import {
  renderCarsiCoachingMonthlyWelcomeEmail,
  renderCoachingGrowthQuoteMemberEmail,
  renderCoachingOnboardingSubmittedMemberEmail,
} from '@/lib/server/email-templates';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const phill: CoachRecord = {
  id: 'default',
  userId: null,
  displayName: 'Phill McGurk',
  chapterSlug: 'carsi-business-coaching',
  chapterName: 'CARSI Business Coaching',
  currency: 'aud',
  monthlyPriceCents: 49500,
  stripePriceId: null,
  notificationEmail: 'phill.mcgurk@gmail.com',
  isDefault: true,
  isDemo: false,
  brandColour: null,
  logoUrl: null,
};

const coachB: CoachRecord = {
  ...phill,
  id: 'b',
  displayName: 'Demo Coach',
  chapterSlug: 'demo-us',
  chapterName: 'Demo US Coaching',
  currency: 'usd',
  monthlyPriceCents: 49700,
  notificationEmail: 'Coach.B@example.com',
  isDefault: false,
};

const founderInbox = ['ops@example.com'];

describe('coach email routing', () => {
  it('keeps founder routing when the member has no coach or the default coach', () => {
    expect(coachNotifyRecipients(null, founderInbox)).toEqual(founderInbox);
    expect(coachNotifyRecipients(phill, founderInbox)).toEqual(founderInbox);
  });

  it('sends a partner-chapter member only to that coach', () => {
    expect(coachNotifyRecipients(coachB, founderInbox)).toEqual(['coach.b@example.com']);
  });

  it('refuses to route a partner member when the coach email is malformed', () => {
    expect(() =>
      coachNotifyRecipients({ ...coachB, notificationEmail: 'nope' }, founderInbox)
    ).toThrow(CoachNotificationEmailInvalidError);
  });

  it('resolves recipients before saving, so a routing failure changes nothing', () => {
    for (const [file, save] of [
      [
        'src/lib/server/carsi-coaching-onboarding-submit.ts',
        'carsiCoachingBusinessProfile.update(',
      ],
      ['src/lib/server/carsi-coaching-session-prep.ts', 'persistCoachingSessionPrepNotes(claims.sub'],
    ] as const) {
      const full = read(file);
      const start = full.search(/export async function (submitCoachingOnboardingToCoach|saveCoachingSessionPrep)\(/);
      expect(start, file).toBeGreaterThan(-1);
      const src = full.slice(start);
      expect(src.indexOf(save), file).toBeGreaterThan(-1);
      const resolve = src.indexOf('getCoachRoutingForMember(');
      expect(resolve, file).toBeGreaterThan(-1);
      expect(resolve, file).toBeLessThan(src.indexOf(save));
    }
  });

  it('every coach email call site uses the member-coach resolver, not the fixed founder list', () => {
    for (const file of [
      'src/lib/server/carsi-coaching-onboarding-submit.ts',
      'src/lib/server/carsi-coaching-session-prep.ts',
      'src/lib/server/carsi-coaching-growth-quote.ts',
    ]) {
      const src = read(file);
      expect(src, file).toContain('getCoachRoutingForMember(');
      expect(src, file).not.toContain('getCarsiCoachingMonthlyNotifyRecipients(');
      // One lookup gives both recipients and coach name; a second lookup could disagree.
      expect(src, file).not.toContain('getCoachForMember(');
    }
  });
});

describe('coach pricing', () => {
  it('default coach keeps the AUD $495 inline price', () => {
    const item = coachCheckoutLineItem(phill);
    expect('price_data' in item && item.price_data.currency).toBe('aud');
    expect('price_data' in item && item.price_data.unit_amount).toBe(49500);
    expect(coachCheckoutLineItem(null)).toEqual(item);
    expect(coachPriceLabel(phill)).toBe('$495/month');
  });

  it('partner coach charges its own currency and amount', () => {
    const item = coachCheckoutLineItem(coachB);
    expect('price_data' in item && item.price_data.currency).toBe('usd');
    expect('price_data' in item && item.price_data.unit_amount).toBe(49700);
    expect(coachPriceLabel(coachB)).toBe('US$497/month');
  });

  it("a coach's Stripe price id wins over inline pricing", () => {
    expect(coachCheckoutLineItem({ ...coachB, stripePriceId: 'price_123' })).toEqual({
      quantity: 1,
      price: 'price_123',
    });
  });

  it('checkout reads the coach line item', () => {
    const src = read('src/lib/server/carsi-coaching-monthly-checkout.ts');
    expect(src).toContain('coachCheckoutLineItem(coach)');
    expect(src).toContain('getCoachForMember(input.userId)');
  });
});

describe('coach dashboard rules', () => {
  it('derives onboarding status in order', () => {
    const none = { profileCompletedAt: null, assessmentStatus: null, onboardingSubmittedAt: null };
    expect(memberOnboardingStatus(none)).toBe('not_started');
    expect(memberOnboardingStatus({ ...none, profileCompletedAt: new Date() })).toBe('profile');
    expect(memberOnboardingStatus({ ...none, assessmentStatus: 'draft' })).toBe('not_started');
    expect(memberOnboardingStatus({ ...none, assessmentStatus: 'submitted' })).toBe('assessment');
    expect(memberOnboardingStatus({ ...none, onboardingSubmittedAt: new Date() })).toBe(
      'submitted'
    );
  });

  it('counts open and blocked actions', () => {
    expect(countActions(['todo', 'in_progress', 'done', 'blocked', 'blocked'])).toEqual({
      open: 2,
      blocked: 2,
    });
  });

  it('picks the earliest future scheduled session only', () => {
    const now = new Date('2026-10-11T00:00:00Z');
    const got = nextSessionAt(
      [
        { scheduledAt: new Date('2026-10-01T00:00:00Z'), status: 'scheduled' },
        { scheduledAt: new Date('2026-10-20T00:00:00Z'), status: 'scheduled' },
        { scheduledAt: new Date('2026-10-15T00:00:00Z'), status: 'cancelled' },
        { scheduledAt: new Date('2026-10-18T00:00:00Z'), status: 'scheduled' },
      ],
      now
    );
    expect(got?.toISOString()).toBe('2026-10-18T00:00:00.000Z');
  });

  it('dashboard page exists with every required column and the approval control', () => {
    expect(existsSync(join(ROOT, 'app/(coaching-portal)/dashboard/coaching/coach/page.tsx'))).toBe(
      true
    );
    const ui = read('src/components/coaching-portal/CoachDashboard.tsx');
    for (const id of [
      'coach-member-onboarding',
      'coach-member-next-session',
      'coach-member-open-actions',
      'coach-member-blocked-actions',
      'coach-approve-draft-plan',
    ]) {
      expect(ui, id).toContain(`data-testid="${id}"`);
    }
    expect(read('app/api/coaching/coach/plan-approval/route.ts')).toContain(
      'approveMemberDraftPlan'
    );
  });

  it('approval only flips a draft, atomically', () => {
    const src = read('src/lib/server/carsi-coaching-coaches.ts');
    expect(src).toMatch(/updateMany\(\{\s*where: \{ userId: memberUserId, status: 'draft' \}/);
  });
});

describe('coaches schema and migration', () => {
  const migration = read('prisma/migrations/20261104090000_carsi_coaching_coaches/migration.sql');
  const schema = read('prisma/schema.prisma');

  it('creates the coaches table with the required columns', () => {
    for (const col of [
      'display_name',
      'chapter_slug',
      'currency',
      'stripe_price_id',
      'notification_email',
      'brand_colour',
      'logo_url',
    ]) {
      expect(migration, col).toContain(`"${col}"`);
    }
    expect(schema).toContain('@@map("carsi_coaching_coaches")');
    expect(schema).toMatch(/coachId\s+String\?\s+@map\("coach_id"\)/);
  });

  it('is additive only and seeds Phill as the default coach', () => {
    expect(migration).not.toMatch(/\bDROP\b|\bTRUNCATE\b|DELETE\s+FROM|ALTER COLUMN|\bUPDATE\s+"/i);
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "coach_id" UUID;');
    expect(migration).toMatch(/'Phill McGurk', 'carsi-business-coaching'.*true\)/);
  });

  it('seeds the default chapter with the shared coach-routing vocabulary', async () => {
    const { DEFAULT_COACHING_CHAPTER_SLUG, DEFAULT_COACHING_COACH } = await import(
      '@/lib/coaching-portal/coach-routing'
    );
    expect(migration).toContain(`'${DEFAULT_COACHING_COACH.displayName}', '${DEFAULT_COACHING_CHAPTER_SLUG}'`);
  });
});

describe('partner price and welcome copy (GP-632 review F6/F8)', () => {
  it('discloses the partner price in its own currency without GST wording', () => {
    expect(coachPriceDisclosure(coachB)).toEqual({
      amountCents: 49700,
      currency: 'usd',
      priceLabel: coachPriceLabel(coachB),
      billingNote: 'Secure subscription via Stripe, billed in USD. Cancel anytime from billing.',
    });
  });

  it('refuses to price a partner chapter that has no amount of its own', () => {
    const noPrice = { ...coachB, monthlyPriceCents: null };
    expect(() => coachPriceDisclosure(noPrice)).toThrow(CoachPriceMissingError);
    expect(() => coachCheckoutLineItem(noPrice)).toThrow(CoachPriceMissingError);
    expect(() => coachCheckoutLineItem({ ...noPrice, stripePriceId: 'price_x' })).toThrow(
      CoachPriceMissingError
    );
  });

  it('keeps the default chapter disclosure unchanged', () => {
    for (const coach of [null, phill]) {
      const d = coachPriceDisclosure(coach);
      expect(d.priceLabel).toBe('$495/month');
      expect(d.billingNote).toContain('GST included');
    }
  });

  it('names the partner coach in the welcome email, and Phill by default', () => {
    const base = {
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      amountLabel: 'USD $497',
      dashboardUrl: 'https://carsi.com.au/dashboard/student',
      coachingPageUrl: 'https://carsi.com.au/ccw-training',
    };
    const partner = renderCarsiCoachingMonthlyWelcomeEmail({ ...base, coachName: 'Coach B' });
    expect(partner.text).toContain('first monthly session with Coach B');
    expect(partner.html).toContain('Coach B and the CARSI team');
    expect(partner.text + partner.html).not.toContain('Phill');
    expect(renderCarsiCoachingMonthlyWelcomeEmail(base).text).toContain('session with Phill');
  });
});

describe('checkout charge binding and chapter membership (GP-632 review round two)', () => {
  const usd497 = { amountCents: 49700, currency: 'usd' };
  const monthlyPrice = {
    active: true,
    currency: 'usd',
    unit_amount: 49700,
    recurring: { interval: 'month', interval_count: 1 },
  };

  it('charges the partner amount in the partner currency, and AUD by default', () => {
    expect(coachCharge(coachB)).toEqual(usd497);
    expect(coachCharge(null)).toEqual({ amountCents: 49500, currency: 'aud' });
    expect(coachCharge(phill)).toEqual({ amountCents: 49500, currency: 'aud' });
  });

  it('treats a different amount or currency as a different charge', () => {
    expect(sameCharge(usd497, { amountCents: 49700, currency: 'USD' })).toBe(true);
    expect(sameCharge(usd497, { amountCents: 49500, currency: 'usd' })).toBe(false);
    expect(sameCharge(usd497, { amountCents: 49700, currency: 'aud' })).toBe(false);
  });

  it('accepts a Stripe price only when it bills exactly the disclosed monthly charge', () => {
    expect(stripePriceMatchesCharge(monthlyPrice, usd497)).toBe(true);
    expect(stripePriceMatchesCharge({ ...monthlyPrice, unit_amount: 99900 }, usd497)).toBe(false);
    expect(stripePriceMatchesCharge({ ...monthlyPrice, currency: 'aud' }, usd497)).toBe(false);
    expect(stripePriceMatchesCharge({ ...monthlyPrice, active: false }, usd497)).toBe(false);
    expect(
      stripePriceMatchesCharge({ ...monthlyPrice, recurring: { interval: 'year' } }, usd497)
    ).toBe(false);
    expect(
      stripePriceMatchesCharge(
        { ...monthlyPrice, recurring: { interval: 'month', interval_count: 3 } },
        usd497
      )
    ).toBe(false);
    expect(stripePriceMatchesCharge({ ...monthlyPrice, recurring: null }, usd497)).toBe(false);
  });

  it('limits a partner coach to their own members, and the default coach to unassigned ones', () => {
    expect(isMemberOfChapter(coachB, coachB.id)).toBe(true);
    expect(isMemberOfChapter(coachB, null)).toBe(false);
    expect(isMemberOfChapter(coachB, phill.id)).toBe(false);
    expect(isMemberOfChapter(phill, null)).toBe(true);
    expect(isMemberOfChapter(phill, phill.id)).toBe(true);
    expect(isMemberOfChapter(phill, coachB.id)).toBe(false);
  });

  it('approves under a row lock and checks membership inside the same transaction', () => {
    const src = read('src/lib/server/carsi-coaching-coaches.ts');
    const start = src.indexOf('export async function approveMemberDraftPlan');
    const next = src.indexOf('\nexport ', start + 1);
    const body = src.slice(start, next === -1 ? undefined : next);
    expect(body).toContain('prisma.$transaction(');
    expect(body).toContain('FOR UPDATE');
    expect(body.indexOf('isMemberOfChapter(')).toBeLessThan(body.indexOf('updateMany('));
    expect(body).not.toMatch(/\bprisma\.carsiCoaching/);
  });

  it('checkout verifies the disclosed charge and any Stripe price before creating a session', () => {
    const src = read('src/lib/server/carsi-coaching-monthly-checkout.ts');
    const create = src.indexOf('checkout.sessions.create(');
    expect(src.indexOf('sameCharge(')).toBeLessThan(create);
    expect(src.indexOf('stripePriceMatchesCharge(')).toBeLessThan(create);
    expect(src).toContain('line_items: [lineItem]');
  });
});

describe('chapter-aware member copy and currency (GP-632 review round three)', () => {
  it('refuses a chapter currency whose amounts are not in hundredths', () => {
    for (const currency of ['jpy', 'kwd', 'xyz']) {
      const coach = { ...coachB, currency };
      expect(() => coachPriceDisclosure(coach)).toThrow(CoachPriceMissingError);
      expect(() => coachCharge(coach)).toThrow(CoachPriceMissingError);
      expect(() => coachCheckoutLineItem(coach)).toThrow(CoachPriceMissingError);
    }
  });

  it('no portal component hardcodes the founder as the coach', () => {
    const dir = 'src/components/coaching-portal';
    const files = readdirSync(join(ROOT, dir)).filter(
      (f) => f.endsWith('.tsx') && f !== 'CoachContext.tsx'
    );
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) {
      expect(read(`${dir}/${f}`), f).not.toMatch(/\bPhill\b/);
    }
  });

  it('member emails name the member coach', () => {
    const quote = renderCoachingGrowthQuoteMemberEmail({
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      serviceTitle: 'Website rebuild',
      rateLabel: 'From $1,500',
      portalUrl: 'https://carsi.com.au/dashboard/coaching',
      coachName: 'Coach B',
    });
    expect(quote.text + quote.html).toContain('Coach B or the CARSI team');
    expect(quote.text + quote.html).not.toContain('Phill');
    const onboarding = renderCoachingOnboardingSubmittedMemberEmail({
      appOrigin: 'https://carsi.com.au',
      name: 'Sam',
      businessName: 'Blue Ridge',
      problemStatement: 'Quotes are slow to go out.',
      goalStatement: 'Double the close rate this year.',
      portalUrl: 'https://carsi.com.au/dashboard/coaching',
      coachName: 'Coach B',
    });
    expect(onboarding.text + onboarding.html).toContain('Coach B will review everything');
    expect(onboarding.text + onboarding.html).not.toContain('Phill');
  });
});
