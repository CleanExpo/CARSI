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

const MEMBER = {
  email: 'member@example.com',
  fullName: 'Casey Member',
  isVerified: true,
  iicrcMemberNumber: null,
  iicrcExpiryDate: null,
  onboarding: null,
};

const h = vi.hoisted(() => ({
  enrolments: [] as unknown[],
  /** When set, the enrolment read never settles (a stalled query). */
  stallEnrolments: false,
  user: null as null | Record<string, unknown>,
  progress: [] as unknown[],
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
    lmsUser: { findUnique: vi.fn(async () => h.user) },
    lmsEnrollment: {
      findMany: vi.fn(() =>
        h.stallEnrolments ? new Promise(() => {}) : Promise.resolve(h.enrolments)
      ),
    },
    lmsLessonProgress: { findMany: vi.fn(async () => h.progress) },
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
import { cecHoursInForceAt } from './renewal-summary';

function invoiceFor(billingEmail: string) {
  return {
    amount_due: 79500,
    currency: 'aud',
    next_payment_attempt: Math.floor(new Date('2026-11-01T00:00:00Z').getTime() / 1000),
    customer_email: billingEmail,
  } as unknown as Stripe.Invoice;
}
const subscription = {
  id: 'sub_1',
  status: 'active',
  metadata: {},
} as unknown as Stripe.Subscription;

async function sentEmail(enrolments: Enrolment[], billingEmail = 'member@example.com') {
  h.enrolments = enrolments;
  h.sendEmail.mockClear();
  const outcome = await sendUpcomingRenewalReminder({
    invoice: invoiceFor(billingEmail),
    subscription,
    kind: 'individual',
  });
  expect(outcome.sent).toBe(true);
  expect(h.sendEmail).toHaveBeenCalledTimes(1);
  return h.sendEmail.mock.calls[0][0] as { html: string; text: string; to?: string };
}

describe('renewal reminder — your year with CARSI', () => {
  const prevUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test';
    h.user = { ...MEMBER };
    h.stallEnrolments = false;
    h.progress = [];
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  // Review r1 P1-V7-RECAP-DISCLOSES-LEARNER-HISTORY
  it('sends no recap when the billing email is not the learner’s account email', async () => {
    const sent = await sentEmail(FULL_YEAR, 'accounts@employer.example.com');
    expect(sent.text).toContain('renews automatically');
    expect(sent.text).not.toContain('Your year with CARSI');
    expect(sent.html).not.toContain('Your year with CARSI');
    expect(sent.text).not.toContain('Completed:');
  });

  // Review r2 P1-V7-RECAP-UNREACHABLE-FOR-NEW-MEMBERS (parent decision): verification is not
  // required. /register creates isVerified:false accounts and no verification flow exists; the
  // recap goes to the address that owns the account, which is the privacy point.
  it('sends the recap to an unverified account when the address matches', async () => {
    h.user = { ...MEMBER, isVerified: false };
    const { text } = await sentEmail(FULL_YEAR);
    expect(text).toContain('renews automatically');
    expect(text).toContain('Your year with CARSI');
    expect(text).toContain('- Completed: 3 courses');
  });

  it('matches the account email trimmed and lower-cased', async () => {
    h.user = { ...MEMBER, isVerified: false, email: '  Member@Example.COM ' };
    const { text } = await sentEmail(FULL_YEAR, 'member@example.com');
    expect(text).toContain('Your year with CARSI');
  });

  // Review r1 P1-V7-OPTIONAL-READ-BLOCKS-REMINDER
  it('sends the reminder without a recap when the recap read never settles', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(NOW);
    h.stallEnrolments = true;
    h.enrolments = FULL_YEAR;
    h.sendEmail.mockClear();
    const pending = sendUpcomingRenewalReminder({
      invoice: invoiceFor('member@example.com'),
      subscription,
      kind: 'individual',
    });
    // Review r2 P1-V7-DEADLINE-TEST-ESCAPES: an independent bound, not the production constant.
    // The reminder must be out within 3 seconds of a stalled recap read, whatever the constant says.
    const REQUIRED_MAX_DELAY_MS = 3_050;
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(REQUIRED_MAX_DELAY_MS);
    expect(settled, 'reminder still pending 3,050 ms after a stalled recap read').toBe(true);
    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const outcome = await pending;
    expect(outcome.sent).toBe(true);
    const { text } = h.sendEmail.mock.calls[0][0];
    expect(text).toContain('renews automatically');
    expect(text).not.toContain('Your year with CARSI');
  });

  // Review r1 P1-V7-RECAP-USES-NONCOMPLETION-DATE
  it('does not move an old course into the year when its certificate is re-generated', async () => {
    const { text } = await sentEmail([
      // Completed two years ago; certificate re-generated (re-stamped) last week.
      enrolment(APPROVED_OLD, { done: daysAgo(730), cert: daysAgo(7) }),
      enrolment(UNAPPROVED, { done: daysAgo(30) }),
    ]);
    expect(text).toContain('- Completed: 1 course');
    expect(text).toContain('- Certificates: 0 certificates');
    expect(text).not.toMatch(/CEC/);
  });

  it('does not date a course by a lesson revisit', async () => {
    h.progress = [
      {
        lessonId: `l-${APPROVED_A}`,
        completed: true,
        // A legacy row with no lesson completion time: the old summary fell back to the last
        // access, which a revisit this week moves into the year.
        completedAt: null,
        lastAccessedAt: daysAgo(2),
      },
    ];
    const { text } = await sentEmail([
      // Complete by lessons, but the enrolment carries no completion date of its own.
      enrolment(APPROVED_A, { done: null, status: 'active' }),
      enrolment(UNAPPROVED, { done: daysAgo(30) }),
    ]);
    expect(text).toContain('- Completed: 1 course');
    expect(text).not.toMatch(/CEC/);
  });

  // Review r3 P1-RECAP-EXPIRED-CEC. These approvals were granted 18/01/2024 and lapse at
  // 00:00 UTC on 18/01/2027 (data/seed/cec-approvals.json).
  describe('CEC credited only while the approval was in force', () => {
    const LATER = new Date('2027-03-01T00:00:00Z');

    beforeEach(() => {
      vi.setSystemTime(LATER);
    });

    it('credits a completion before expiry and not one after it', async () => {
      const { text } = await sentEmail([
        enrolment(APPROVED_A, { done: new Date('2027-01-10T00:00:00Z') }), // in force
        enrolment(APPROVED_B, { done: new Date('2027-01-19T00:00:00Z') }), // lapsed the day before
      ]);
      expect(text).toContain('- Completed: 2 courses');
      expect(text).toContain('- CEC hours earned: 1');
    });

    it('shows no CEC line when the only completion came after the approval lapsed', async () => {
      const { html, text } = await sentEmail([
        enrolment(APPROVED_B, { done: new Date('2027-01-19T00:00:00Z') }),
      ]);
      expect(text).toContain('- Completed: 1 course');
      expect(text).not.toMatch(/CEC/);
      expect(html).not.toMatch(/CEC hours/);
    });
  });

  it('credits nothing for a completion before the approval was granted', () => {
    expect(cecHoursInForceAt(APPROVED_A, new Date('2024-01-17T23:59:59Z'))).toBe(0);
    expect(cecHoursInForceAt(APPROVED_A, new Date('2024-01-18T00:00:00Z'))).toBe(1);
    expect(cecHoursInForceAt(APPROVED_A, new Date('2027-01-17T23:59:59Z'))).toBe(1);
    expect(cecHoursInForceAt(APPROVED_A, new Date('2027-01-18T00:00:00Z'))).toBe(0);
    expect(cecHoursInForceAt(UNAPPROVED, new Date('2026-06-01T00:00:00Z'))).toBe(0);
  });
});
