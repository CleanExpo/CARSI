/**
 * GP-632 flow: two coaching chapters on one engine.
 *
 * Drives the real server code (admin coach creation, member assignment, onboarding packet,
 * session prep, growth quote, checkout, subscription notice, coach dashboard) with only the
 * database, email and Stripe replaced by in-memory fakes. Done when: a member assigned to
 * coach B emails B only, pays B's price and appears only on B's dashboard, while a member with
 * no coach keeps today's Phill routing and AUD price.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => {
  const tables: Record<string, Row[]> = {};
  const reset = () => {
    for (const k of Object.keys(tables)) delete tables[k];
  };
  const t = (name: string) => (tables[name] ??= []);

  function matches(row: Row, where: Row | undefined): boolean {
    if (!where) return true;
    return Object.entries(where).every(([key, cond]) => {
      if (key === 'OR') return (cond as Row[]).some((w) => matches(row, w));
      if (key === 'AND') return (cond as Row[]).every((w) => matches(row, w));
      const value = row[key] ?? null;
      if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
        const c = cond as Row;
        if ('in' in c) return (c.in as unknown[]).includes(value);
        if ('not' in c) return value !== c.not;
        if ('equals' in c) return value === c.equals;
        return false;
      }
      return value === (cond ?? null);
    });
  }

  function withRelations(model: string, row: Row): Row {
    const out: Row = { ...row };
    if (model === 'carsiCoachingBusinessProfile') {
      out.coach = row.coachId ? (t('carsiCoachingCoach').find((c) => c.id === row.coachId) ?? null) : null;
      out.user = t('lmsUser').find((u) => u.id === row.userId) ?? null;
    }
    return out;
  }

  const defaults: Record<string, () => Row> = {
    carsiCoachingCoach: () => ({
      currency: 'aud',
      monthlyPriceCents: null,
      stripePriceId: null,
      userId: null,
      isDefault: false,
      isDemo: false,
      brandColour: null,
      logoUrl: null,
      createdAt: new Date(),
    }),
    carsiCoachingBusinessProfile: () => ({ coachId: null, updatedAt: new Date() }),
  };

  let seq = 0;
  function model(name: string) {
    return {
      findUnique: async ({ where }: { where: Row }) => {
        const row = t(name).find((r) => matches(r, where));
        return row ? withRelations(name, row) : null;
      },
      findFirst: async ({ where }: { where?: Row } = {}) => {
        const row = t(name).find((r) => matches(r, where));
        return row ? withRelations(name, row) : null;
      },
      findMany: async ({ where }: { where?: Row } = {}) =>
        t(name)
          .filter((r) => matches(r, where))
          .map((r) => withRelations(name, r)),
      create: async ({ data }: { data: Row }) => {
        const row = { id: `id-${++seq}`, ...(defaults[name]?.() ?? {}), ...data };
        t(name).push(row);
        return withRelations(name, row);
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = t(name).find((r) => matches(r, where));
        if (!row) throw Object.assign(new Error('not found'), { code: 'P2025' });
        Object.assign(row, data);
        return withRelations(name, row);
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const rows = t(name).filter((r) => matches(r, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
      upsert: async ({ where, create, update }: { where: Row; create: Row; update: Row }) => {
        const row = t(name).find((r) => matches(r, where));
        if (row) {
          Object.assign(row, update);
          return withRelations(name, row);
        }
        const created = { id: `id-${++seq}`, ...(defaults[name]?.() ?? {}), ...create };
        t(name).push(created);
        return withRelations(name, created);
      },
    };
  }

  const prisma: Row = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === '$transaction') return async (fn: (tx: unknown) => unknown) => fn(prisma);
        return model(prop);
      },
    }
  );
  return { prisma, tables, t, reset };
});

const sent = vi.hoisted(() => [] as Array<{ to: string | string[]; subject: string; html: string; text?: string }>);
/** Subjects whose send should report failure (simulates a provider outage for one email). */
const failSubjects = vi.hoisted(() => [] as string[]);
const stripeCalls = vi.hoisted(() => ({ sessions: [] as Row[], updates: [] as Row[] }));

vi.mock('@/lib/prisma', () => ({ prisma: db.prisma }));
vi.mock('@/lib/server/email', () => ({
  sendEmail: vi.fn(async (params: { to: string | string[]; subject: string; html: string; text?: string }) => {
    if (failSubjects.some((f) => params.subject.includes(f))) return { sent: false };
    sent.push(params);
    return { sent: true };
  }),
}));
vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => ({ email: 'admin@example.com' }),
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    prices: {
      retrieve: async (id: string) => ({
        id,
        active: true,
        currency: 'usd',
        unit_amount: 49700,
        recurring: { interval: 'month', interval_count: 1 },
      }),
    },
    checkout: {
      sessions: {
        create: async (params: Row) => {
          stripeCalls.sessions.push(params);
          return { id: `cs_test_${stripeCalls.sessions.length}`, url: 'https://checkout.example/session' };
        },
        update: async (id: string, params: Row) => {
          stripeCalls.updates.push({ id, ...params });
          return { id };
        },
      },
    },
    subscriptions: { retrieve: async () => { throw new Error('not used'); } },
  }),
}));
vi.mock('@/lib/server/carsi-coaching-subscription-store', () => ({
  getCoachingPortalRowForUser: async () => null,
  updateCoachingPortalWorkspace: async () => undefined,
  workspaceFromRow: () => ({ sessionPrepNotes: '' }),
  upsertCoachingMonthlySubscription: async () => undefined,
}));

import { DEFAULT_COACHING_CHAPTER_SLUG, DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import type { SessionClaims } from '@/lib/auth/session-jwt';
import {
  assignMemberToCoach,
  createCoachingCoach,
  getCoachForMember,
  getDefaultCoach,
  listCoachMembers,
} from '@/lib/server/carsi-coaching-coaches';
import { submitCoachingGrowthQuoteRequest } from '@/lib/server/carsi-coaching-growth-quote';
import { createCarsiCoachingMonthlyCheckoutSession } from '@/lib/server/carsi-coaching-monthly-checkout';
import { processCarsiCoachingMonthlyCheckoutCompleted } from '@/lib/server/carsi-coaching-monthly-fulfillment';
import { submitCoachingOnboardingToCoach } from '@/lib/server/carsi-coaching-onboarding-submit';
import { saveCoachingSessionPrep } from '@/lib/server/carsi-coaching-session-prep';
import { COACHING_GROWTH_SERVICE_CATEGORIES } from '@/lib/coaching-portal/growth-services';
import { coachPriceDisclosure } from '@/lib/coaching-portal/coaches';
import { getCoachForViewer } from '@/lib/server/carsi-coaching-coaches';
import { POST as adminCreateCoach } from '../../../app/api/admin/business-coaching/coaches/route';
import { NextRequest } from 'next/server';
import type Stripe from 'stripe';

const FOUNDER = 'phill.mcgurk@gmail.com';
const COACH_A_EMAIL = 'coach.a@example.com';
const COACH_B_EMAIL = 'coach.b@example.com';

function claimsFor(id: string, email: string, name: string): SessionClaims {
  return { sub: id, email, full_name: name } as unknown as SessionClaims;
}

function seedMember(id: string, email: string, name: string) {
  db.t('lmsUser').push({ id, email, fullName: name });
  db.t('carsiCoachingBusinessProfile').push({
    id: `profile-${id}`,
    userId: id,
    coachId: null,
    businessName: `${name} Restorations`,
    industry: 'Restoration',
    location: 'Brisbane QLD',
    mainServices: 'Water damage',
    challenges: 'Lead flow is lumpy month to month',
    shortTermGoals: 'Two more crews by June',
    completedAt: new Date('2026-10-01T00:00:00Z'),
    onboardingSubmittedAt: null,
    updatedAt: new Date(),
  });
  db.t('carsiCoachingAssessment').push({
    id: `assess-${id}`,
    userId: id,
    status: 'submitted',
    submittedAt: new Date('2026-10-02T00:00:00Z'),
    updatedAt: new Date('2026-10-02T00:00:00Z'),
    responsesJson: '{}',
  });
}

function recipientsOf(subjectPart: string): string[] {
  return sent
    .filter((m) => m.subject.includes(subjectPart))
    .flatMap((m) => (Array.isArray(m.to) ? m.to : [m.to]))
    .map((s) => s.toLowerCase());
}

const service = COACHING_GROWTH_SERVICE_CATEGORIES[0].items[0];

async function runMemberJourney(claims: SessionClaims) {
  sent.length = 0;
  const onboarding = await submitCoachingOnboardingToCoach(claims, {
    problemStatement: 'We lose jobs because quotes go out two days late.',
    goalStatement: 'Same-day quotes on every water job by March.',
    extraNotes: '',
  });
  expect(onboarding.ok).toBe(true);
  const prep = await saveCoachingSessionPrep(claims, {
    notes: 'Review the quoting backlog and the new crew roster before the call.',
    notifyCoach: true,
  });
  expect(prep.ok).toBe(true);
  const quote = await submitCoachingGrowthQuoteRequest(claims, {
    serviceId: service.id,
    message: 'Please quote this for our Brisbane branch next month.',
  });
  expect(quote.ok).toBe(true);
  return {
    onboarding: recipientsOf('Onboarding ready'),
    sessionPrep: recipientsOf('Session prep'),
    growthQuote: recipientsOf('Quote request —'),
  };
}

describe('GP-632 multi-coach chapters flow', () => {
  beforeEach(() => {
    db.reset();
    sent.length = 0;
    stripeCalls.sessions.length = 0;
    stripeCalls.updates.length = 0;
    delete process.env.CARSI_COACHING_MONTHLY_NOTIFY_EMAIL;
    failSubjects.length = 0;
    // The migration's seeded default chapter.
    db.t('carsiCoachingCoach').push({
      id: 'coach-default',
      userId: null,
      displayName: DEFAULT_COACHING_COACH.displayName,
      chapterSlug: DEFAULT_COACHING_CHAPTER_SLUG,
      chapterName: 'CARSI Business Coaching',
      currency: 'aud',
      monthlyPriceCents: 49500,
      stripePriceId: null,
      notificationEmail: FOUNDER,
      isDefault: true,
      isDemo: false,
      brandColour: null,
      logoUrl: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
  });

  async function setUpTwoCoaches() {
    const a = await createCoachingCoach({
      displayName: 'Alex Partner',
      chapterSlug: 'nz-chapter',
      chapterName: 'Alex Partner Coaching NZ',
      currency: 'nzd',
      monthlyPriceCents: 52000,
      stripePriceId: null,
      notificationEmail: COACH_A_EMAIL,
      brandColour: '#0b5d3b',
      logoUrl: null,
    });
    const b = await createCoachingCoach({
      displayName: 'Blake Partner',
      chapterSlug: 'us-chapter',
      chapterName: 'Blake Partner Coaching US',
      currency: 'usd',
      monthlyPriceCents: 49700,
      stripePriceId: 'price_1TestCoachB',
      notificationEmail: COACH_B_EMAIL,
      brandColour: '#1d3557',
      logoUrl: 'https://cdn.example.com/blake-logo.png',
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('coach creation failed');
    return { coachA: a.coach, coachB: b.coach };
  }

  it('admin creates two partner coaches and refuses a duplicate chapter or bad input', async () => {
    const { coachA, coachB } = await setUpTwoCoaches();
    expect(coachA.isDefault).toBe(false);
    expect(coachB.chapterSlug).toBe('us-chapter');
    expect(db.t('carsiCoachingCoach')).toHaveLength(3);

    const dup = await createCoachingCoach({
      displayName: 'Copy',
      chapterSlug: 'us-chapter',
      chapterName: 'Copy',
      currency: 'usd',
      monthlyPriceCents: 100,
      stripePriceId: null,
      notificationEmail: 'copy@example.com',
      brandColour: null,
      logoUrl: null,
    });
    expect(dup).toMatchObject({ ok: false });

    for (const bad of [
      { notificationEmail: 'not-an-email' },
      { currency: 'jpy' },
      { monthlyPriceCents: 0 },
      { chapterSlug: 'Bad Slug!' },
      { brandColour: 'red; background:url(x)' },
      { logoUrl: 'javascript:alert(1)' },
      { stripePriceId: 'prod_123' },
    ]) {
      const res = await createCoachingCoach({
        displayName: 'X',
        chapterSlug: 'x-chapter',
        chapterName: 'X',
        currency: 'usd',
        monthlyPriceCents: 100,
        stripePriceId: null,
        notificationEmail: 'x@example.com',
        brandColour: null,
        logoUrl: null,
        ...bad,
      });
      expect(res, JSON.stringify(bad)).toMatchObject({ ok: false });
    }
    expect(db.t('carsiCoachingCoach')).toHaveLength(3);
  });

  it('a member assigned to coach B emails B only, pays B price, and appears only on B dashboard', async () => {
    const { coachA, coachB } = await setUpTwoCoaches();
    seedMember('member-b', 'owner.b@example.com', 'Bree Owner');
    const assigned = await assignMemberToCoach('member-b', coachB.id);
    expect(assigned).toMatchObject({ ok: true });
    expect((await getCoachForMember('member-b'))?.id).toBe(coachB.id);

    // Emails: onboarding packet, session prep and growth quote go to B and nobody else.
    const routes = await runMemberJourney(claimsFor('member-b', 'owner.b@example.com', 'Bree Owner'));
    for (const [kind, to] of Object.entries(routes)) {
      expect(to, kind).toEqual([COACH_B_EMAIL]);
    }
    const allCoachInboxes = sent
      .flatMap((m) => (Array.isArray(m.to) ? m.to : [m.to]))
      .map((s) => s.toLowerCase());
    expect(allCoachInboxes).not.toContain(FOUNDER);
    expect(allCoachInboxes).not.toContain(COACH_A_EMAIL);
    // Member-facing copy names coach B, never the founder.
    const memberCopy = sent.filter((m) => m.to === 'owner.b@example.com' || (Array.isArray(m.to) && m.to.includes('owner.b@example.com')));
    expect(memberCopy.length).toBeGreaterThan(0);
    for (const m of memberCopy) expect(m.text ?? m.html).not.toMatch(/\bPhill\b/);

    // Price: the disclosure and the Stripe checkout are B's USD price.
    const disclosure = coachPriceDisclosure(await getCoachForMember('member-b'));
    expect(disclosure).toMatchObject({ amountCents: 49700, currency: 'usd' });
    expect(disclosure.billingNote).not.toMatch(/GST/);
    await createCarsiCoachingMonthlyCheckoutSession({
      userId: 'member-b',
      contactEmail: 'owner.b@example.com',
      contactName: 'Bree Owner',
      appOrigin: 'https://carsi.example',
      successUrl: 'https://carsi.example/ok',
      cancelUrl: 'https://carsi.example/cancel',
      expectedCharge: { amountCents: 49700, currency: 'usd' },
    } as Parameters<typeof createCarsiCoachingMonthlyCheckoutSession>[0]);
    expect(stripeCalls.sessions).toHaveLength(1);
    expect(stripeCalls.sessions[0].line_items).toEqual([{ quantity: 1, price: 'price_1TestCoachB' }]);
    expect((stripeCalls.sessions[0].metadata as Row).coach_chapter).toBe('us-chapter');

    // Checkout refuses the AUD default for a B member.
    await expect(
      createCarsiCoachingMonthlyCheckoutSession({
        userId: 'member-b',
        contactEmail: 'owner.b@example.com',
        appOrigin: 'https://carsi.example',
        successUrl: 'https://carsi.example/ok',
        cancelUrl: 'https://carsi.example/cancel',
        expectedCharge: { amountCents: 49500, currency: 'aud' },
      } as Parameters<typeof createCarsiCoachingMonthlyCheckoutSession>[0])
    ).rejects.toThrow(/coaching_price_changed/);

    // New-subscription notice (member contact details) goes to B only.
    sent.length = 0;
    await processCarsiCoachingMonthlyCheckoutCompleted(
      {
        id: 'cs_test_paid',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 49700,
        currency: 'usd',
        customer_details: { email: 'owner.b@example.com', name: 'Bree Owner' },
        metadata: { source: 'carsi-coaching-monthly', carsi_user_id: 'member-b', contact_name: 'Bree Owner' },
        subscription: null,
      } as unknown as Stripe.Checkout.Session,
      { appOrigin: 'https://carsi.example' }
    );
    const notice = recipientsOf('New subscription');
    expect(notice).toEqual([COACH_B_EMAIL]);

    // Dashboard: on B's list only.
    const onB = (await listCoachMembers(coachB)).map((m) => m.userId);
    const onA = (await listCoachMembers(coachA)).map((m) => m.userId);
    const defaultCoach = await getDefaultCoach();
    const onDefault = (await listCoachMembers(defaultCoach!)).map((m) => m.userId);
    expect(onB).toEqual(['member-b']);
    expect(onA).not.toContain('member-b');
    expect(onDefault).not.toContain('member-b');
  });

  it('a member with no coach keeps Phill routing and the existing AUD price (no regression)', async () => {
    const { coachA, coachB } = await setUpTwoCoaches();
    seedMember('member-p', 'owner.p@example.com', 'Pat Owner');

    const routes = await runMemberJourney(claimsFor('member-p', 'owner.p@example.com', 'Pat Owner'));
    for (const [kind, to] of Object.entries(routes)) {
      expect(to, kind).toEqual([FOUNDER]);
    }

    const disclosure = coachPriceDisclosure(await getCoachForMember('member-p'));
    expect(disclosure).toMatchObject({ amountCents: 49500, currency: 'aud', priceLabel: '$495/month' });
    expect(disclosure.billingNote).toMatch(/GST included/);
    await createCarsiCoachingMonthlyCheckoutSession({
      userId: 'member-p',
      contactEmail: 'owner.p@example.com',
      appOrigin: 'https://carsi.example',
      successUrl: 'https://carsi.example/ok',
      cancelUrl: 'https://carsi.example/cancel',
      expectedCharge: { amountCents: 49500, currency: 'aud' },
    } as Parameters<typeof createCarsiCoachingMonthlyCheckoutSession>[0]);
    const line = (stripeCalls.sessions[0].line_items as Row[])[0] as {
      price_data: { currency: string; unit_amount: number; recurring: { interval: string } };
    };
    expect(line.price_data).toMatchObject({ currency: 'aud', unit_amount: 49500, recurring: { interval: 'month' } });

    sent.length = 0;
    await processCarsiCoachingMonthlyCheckoutCompleted(
      {
        id: 'cs_test_paid_p',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 49500,
        currency: 'aud',
        customer_details: { email: 'owner.p@example.com', name: 'Pat Owner' },
        metadata: { source: 'carsi-coaching-monthly', carsi_user_id: 'member-p', contact_name: 'Pat Owner' },
        subscription: null,
      } as unknown as Stripe.Checkout.Session,
      { appOrigin: 'https://carsi.example' }
    );
    expect(recipientsOf('New subscription')).toEqual([FOUNDER]);

    const defaultCoach = await getDefaultCoach();
    expect((await listCoachMembers(defaultCoach!)).map((m) => m.userId)).toEqual(['member-p']);
    expect((await listCoachMembers(coachA)).map((m) => m.userId)).toEqual([]);
    expect((await listCoachMembers(coachB)).map((m) => m.userId)).toEqual([]);
  });

  it('reassigning a member moves their routing; unassigning returns them to Phill', async () => {
    const { coachA, coachB } = await setUpTwoCoaches();
    seedMember('member-m', 'owner.m@example.com', 'Mo Owner');
    await assignMemberToCoach('member-m', coachA.id);
    expect((await runMemberJourney(claimsFor('member-m', 'owner.m@example.com', 'Mo Owner'))).growthQuote).toEqual([
      COACH_A_EMAIL,
    ]);
    db.t('carsiCoachingBusinessProfile').find((p) => p.userId === 'member-m')!.onboardingSubmittedAt = null;
    await assignMemberToCoach('member-m', coachB.id);
    expect((await listCoachMembers(coachA)).map((m) => m.userId)).toEqual([]);
    expect((await listCoachMembers(coachB)).map((m) => m.userId)).toEqual(['member-m']);
    await assignMemberToCoach('member-m', null);
    expect((await getCoachForMember('member-m'))?.isDefault).toBe(true);
    expect(await assignMemberToCoach('member-m', 'no-such-coach')).toMatchObject({ ok: false });
  });

  it('admin opens a chapter linked to the coach login, and that coach then sees their dashboard', async () => {
    db.t('lmsUser').push({ id: 'c0c0c0c0-0000-4000-8000-00000000000c', email: 'casey.coach@example.com', fullName: 'Casey Coach' });
    const body = {
      displayName: 'Casey Coach',
      chapterName: 'Casey Coaching UK',
      chapterSlug: 'uk-chapter',
      currency: 'gbp',
      monthlyPriceCents: 39900,
      notificationEmail: 'casey.inbox@example.com',
      coachLoginEmail: 'Casey.Coach@example.com',
    };
    const post = (b: Record<string, unknown>) =>
      adminCreateCoach(
        new NextRequest('http://localhost/api/admin/business-coaching/coaches', {
          method: 'POST',
          body: JSON.stringify(b),
        })
      );

    // A chapter must name a coach login, and that login must exist.
    const withoutLogin: Record<string, unknown> = { ...body };
    delete withoutLogin.coachLoginEmail;
    expect((await post(withoutLogin)).status).toBe(400);
    expect((await post({ ...body, coachLoginEmail: 'nobody@example.com' })).status).toBe(404);
    expect(db.t('carsiCoachingCoach')).toHaveLength(1);

    const res = await post(body);
    expect(res.status).toBe(201);
    const viewer = await getCoachForViewer(claimsFor('c0c0c0c0-0000-4000-8000-00000000000c', 'casey.coach@example.com', 'Casey Coach'));
    expect(viewer?.chapterSlug).toBe('uk-chapter');
    expect(viewer?.userId).toBe('c0c0c0c0-0000-4000-8000-00000000000c');
  });

  it('a failed coach notice is not marked sent; the retry reaches coach B without re-sending the welcome', async () => {
    const { coachB } = await setUpTwoCoaches();
    seedMember('member-r', 'owner.r@example.com', 'Rory Owner');
    await assignMemberToCoach('member-r', coachB.id);
    const session = {
      id: 'cs_test_retry',
      mode: 'subscription',
      status: 'complete',
      payment_status: 'paid',
      amount_total: 49700,
      currency: 'usd',
      customer_details: { email: 'owner.r@example.com', name: 'Rory Owner' },
      metadata: { source: 'carsi-coaching-monthly', carsi_user_id: 'member-r', contact_name: 'Rory Owner' } as Record<string, string>,
      subscription: null,
    };

    failSubjects.push('New subscription');
    const first = await processCarsiCoachingMonthlyCheckoutCompleted(
      session as unknown as Stripe.Checkout.Session,
      { appOrigin: 'https://carsi.example' }
    );
    expect(first.customerEmailSent).toBe(true);
    expect(first.founderEmailSent).toBe(false);
    expect(recipientsOf('New subscription')).toEqual([]);
    // Stripe metadata after the first attempt, as the next delivery would read it.
    const written = stripeCalls.updates.at(-1)?.metadata as Record<string, string>;
    expect(written).toBeTruthy();

    failSubjects.length = 0;
    sent.length = 0;
    const retry = await processCarsiCoachingMonthlyCheckoutCompleted(
      { ...session, metadata: written } as unknown as Stripe.Checkout.Session,
      { appOrigin: 'https://carsi.example' }
    );
    expect(retry.founderEmailSent).toBe(true);
    expect(recipientsOf('New subscription')).toEqual([COACH_B_EMAIL]);
    expect(recipientsOf('Welcome to')).toEqual([]);

    // A third delivery sends nothing.
    sent.length = 0;
    const done = stripeCalls.updates.at(-1)?.metadata as Record<string, string>;
    const third = await processCarsiCoachingMonthlyCheckoutCompleted(
      { ...session, metadata: done } as unknown as Stripe.Checkout.Session,
      { appOrigin: 'https://carsi.example' }
    );
    expect(third.skipped).toBe('already_emailed');
    expect(sent).toEqual([]);
  });

  it('a session already marked sent by the previous code is not emailed again', async () => {
    seedMember('member-l', 'owner.l@example.com', 'Lee Owner');
    const legacy = await processCarsiCoachingMonthlyCheckoutCompleted(
      {
        id: 'cs_test_legacy',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        amount_total: 49500,
        currency: 'aud',
        customer_details: { email: 'owner.l@example.com', name: 'Lee Owner' },
        metadata: {
          source: 'carsi-coaching-monthly',
          carsi_user_id: 'member-l',
          coaching_monthly_emails_sent: 'true',
        },
        subscription: null,
      } as unknown as Stripe.Checkout.Session,
      { appOrigin: 'https://carsi.example' }
    );
    expect(legacy.skipped).toBe('already_emailed');
    expect(sent).toEqual([]);
  });
});
