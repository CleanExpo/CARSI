import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

/**
 * V7 — the renewal reminder carries a "your year with CARSI" recap built from the member's own
 * record. This drives the real sender (`sendUpcomingRenewalReminder`) and the real renewal
 * summary over a fixture learner, then reads the email that would have been sent.
 *
 * Licence-critical: CEC hours come ONLY from the approvals registry. The unapproved course below
 * carries a polluted stored `cecHours: 4`; it must never surface as a CEC line.
 */

const NOW = new Date('2026-10-18T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

type Enrolment = {
  status: string;
  completedAt: Date | null;
  certificateIssuedAt: Date | null;
  course: {
    id: string;
    slug: string;
    title: string;
    cecHours: number | null;
    iicrcDiscipline: string | null;
    status: string;
    isPublished: boolean;
    modules: { lessons: { id: string }[] }[];
  };
};

function enrolment(
  slug: string,
  opts: { done?: Date | null; cert?: Date | null; status?: string; storedCec?: number }
): Enrolment {
  return {
    status: opts.status ?? 'completed',
    completedAt: opts.done ?? null,
    certificateIssuedAt: opts.cert ?? null,
    course: {
      id: `c-${slug}`,
      slug,
      title: slug,
      cecHours: opts.storedCec ?? null,
      iicrcDiscipline: null,
      status: 'published',
      isPublished: true,
      modules: [{ lessons: [{ id: `l-${slug}` }] }],
    },
  };
}

// Registry-approved (1 CEC hour each in data/seed/cec-approvals.json).
const APPROVED_A = 'introduction-to-porous-materials-drying';
const APPROVED_B = 'introduction-to-odour-control-and-removal-techniques';
const APPROVED_OLD = 'introduction-to-structural-drying-concepts';
// Not in the registry, with a polluted stored CEC value.
const UNAPPROVED = 'truckmount-maintenance-essentials';

const FULL_YEAR: Enrolment[] = [
  enrolment(APPROVED_A, { done: daysAgo(60), cert: daysAgo(60) }),
  enrolment(APPROVED_B, { done: daysAgo(20), cert: daysAgo(20) }),
  enrolment(UNAPPROVED, { done: daysAgo(30), storedCec: 4 }),
  // Completed two years ago: outside this year's recap.
  enrolment(APPROVED_OLD, { done: daysAgo(730), cert: daysAgo(730) }),
  // Started, not finished.
  enrolment('introduction-to-drying-techniques-and-equipment', { status: 'active' }),
];

const h = vi.hoisted(() => ({
  enrolments: [] as unknown[],
  sendEmail: vi.fn(async (_p: { html: string; text: string }) => ({
    sent: true as boolean,
    messageId: 'msg_1',
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsNotification: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: 'n-1' })),
      delete: vi.fn(async () => ({})),
    },
    lmsUser: {
      findUnique: vi.fn(async () => ({
        email: 'member@example.com',
        fullName: 'Casey Member',
        iicrcMemberNumber: null,
        iicrcExpiryDate: null,
        onboarding: null,
      })),
    },
    lmsEnrollment: { findMany: vi.fn(async () => h.enrolments) },
    lmsLessonProgress: { findMany: vi.fn(async () => []) },
    lmsCourse: {
      findMany: vi.fn(async () => [
        {
          id: 'c-next',
          title: 'Mould Remediation Practitioner',
          slug: 'mould-remediation-practitioner',
          description: null,
          shortDescription: null,
          thumbnailUrl: null,
          cecHours: null,
          meta: null,
          iicrcDiscipline: null,
          status: 'published',
          isPublished: true,
        },
      ]),
    },
  },
}));
vi.mock('@/lib/server/email', () => ({
  sendEmail: (p: { html: string; text: string }) => h.sendEmail(p),
  isEmailConfigured: () => true,
}));
vi.mock('@/lib/server/subscription-store', () => ({
  resolveUserIdForStripeSubscription: vi.fn(async () => 'user-1'),
}));
vi.mock('@/lib/server/team-subscription-store', () => ({
  resolveTeamIdForStripeSubscription: vi.fn(async () => null),
}));

import { sendUpcomingRenewalReminder } from './renewal-reminder';

const invoice = {
  amount_due: 79500,
  currency: 'aud',
  next_payment_attempt: Math.floor(new Date('2026-11-01T00:00:00Z').getTime() / 1000),
  customer_email: 'member@example.com',
} as unknown as Stripe.Invoice;
const subscription = { id: 'sub_1', status: 'active', metadata: {} } as unknown as Stripe.Subscription;

async function sentEmail(enrolments: Enrolment[]) {
  h.enrolments = enrolments;
  h.sendEmail.mockClear();
  const outcome = await sendUpcomingRenewalReminder({ invoice, subscription, kind: 'individual' });
  expect(outcome.sent).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledTimes(1);
  return h.sendEmail.mock.calls[0][0];
}

describe('renewal reminder — your year with CARSI', () => {
  const prevUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test';
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
  });

  it('shows the courses completed this year and registry-approved CEC hours only', async () => {
    const { html, text } = await sentEmail(FULL_YEAR);
    expect(text).toContain('Your year with CARSI (last 12 months)');
    // Three completions in the year; the two-year-old one and the unfinished one do not count.
    expect(text).toContain('- Completed: 3 courses');
    expect(text).toContain('- Certificates: 2 certificates');
    // 1 + 1 from the registry. The unapproved course's stored 4 hours never count.
    expect(text).toContain('- CEC hours earned: 2');
    expect(html).toContain('Your year with CARSI');
    expect(html).toContain('CEC hours earned: 2');
    // Next suggestion links to the course page.
    expect(text).toMatch(
      /- Mould Remediation Practitioner: https?:\/\/\S+\/courses\/mould-remediation-practitioner\n/
    );
  });

  it('shows no CEC line when the only completed course is not CEC-approved', async () => {
    const { html, text } = await sentEmail([
      enrolment(UNAPPROVED, { done: daysAgo(30), cert: daysAgo(30), storedCec: 4 }),
    ]);
    expect(text).toContain('- Completed: 1 course');
    expect(text).toContain('- Certificates: 1 certificate');
    expect(text).not.toMatch(/CEC/);
    expect(html).not.toMatch(/CEC hours/);
  });

  it('still sends the reminder, without a recap, when the record cannot be read', async () => {
    delete process.env.DATABASE_URL;
    const { text } = await sentEmail(FULL_YEAR);
    expect(text).toContain('renews automatically');
    expect(text).not.toContain('Your year with CARSI');
  });
});
