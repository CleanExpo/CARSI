import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CARSI_ABN_ENV, buildTaxInvoice } from '@/lib/billing/tax-invoice';
import {
  renderCarsiCoachingMonthlyWelcomeEmail,
  renderCcwRoadshowBookingConfirmationEmail,
  renderEnrollmentWelcomeEmail,
  renderOwnerCircleBookingConfirmationEmail,
} from '@/lib/server/email-templates';

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn(), findUser: vi.fn() }));
const storedLearner = {
  email: 'learner@example.test',
  fullName: 'Learner' as string | null,
  hashedPassword: '$2a$12$test',
};
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: mocks.findUser,
    },
    lmsCourse: { findUnique: async () => ({ title: 'Paid item' }) },
  },
}));
vi.mock('@/lib/server/email', () => ({
  isEmailConfigured: () => true,
  sendEmail: mocks.sendEmail,
}));
vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: async () => '/learn/paid-item',
}));

import { sendEnrollmentWelcomeEmail } from '@/lib/server/transactional-email';

// SYNTHETIC, TEST-ONLY ABN (checksum-valid). Never CARSI's ABN.
const taxInvoice = buildTaxInvoice(
  {
    item: 'Paid item',
    totalCents: 2900,
    issuedAt: new Date('2026-11-21T22:30:00.000Z'),
    buyer: { name: null, businessName: null, abn: null },
  },
  { [CARSI_ABN_ENV]: '10000000000' } as NodeJS.ProcessEnv
);

const enrolment = {
  appOrigin: 'https://carsi.example',
  name: 'Sam',
  courseTitle: 'Paid item',
  startUrl: 'https://carsi.example/learn',
  dashboardUrl: 'https://carsi.example/dashboard/student',
};

const paidEmails: Record<
  string,
  (inv: typeof taxInvoice | null) => { html: string; text: string }
> = {
  'course purchase': (inv) => renderEnrollmentWelcomeEmail({ ...enrolment, taxInvoice: inv }),
  'course purchase by a guest with no password yet': (inv) =>
    renderEnrollmentWelcomeEmail({
      ...enrolment,
      needsPasswordSetup: true,
      setPasswordUrl: 'https://carsi.example/forgot-password',
      taxInvoice: inv,
    }),
  'roadshow booking': (inv) =>
    renderCcwRoadshowBookingConfirmationEmail({
      appOrigin: 'https://carsi.example',
      attendeeName: 'Sam',
      eventCity: 'Brisbane',
      eventDates: '1-2 March',
      dateRangeLabel: '1-2 March 2027',
      timeLabel: '9am',
      venueName: 'Venue',
      venueAddress: '1 Street',
      ticketLabel: 'Standard',
      seatCount: 1,
      amountLabel: '$29',
      eventPageUrl: 'https://carsi.example/events',
      taxInvoice: inv,
    }),
  'Owner Circle booking': (inv) =>
    renderOwnerCircleBookingConfirmationEmail({
      appOrigin: 'https://carsi.example',
      name: 'Sam',
      sessionTitle: 'Session',
      dateLabel: '1 March',
      timeLabel: '9am',
      venueName: 'Venue',
      venueAddress: '1 Street',
      packageLabel: 'Seat',
      seatCount: 1,
      amountLabel: '$29',
      registrationStatus: 'confirmed',
      programUrl: 'https://carsi.example/owner-circle',
      taxInvoice: inv,
    }),
  'coaching monthly welcome': (inv) =>
    renderCarsiCoachingMonthlyWelcomeEmail({
      appOrigin: 'https://carsi.example',
      name: 'Sam',
      amountLabel: '$29',
      dashboardUrl: 'https://carsi.example/dashboard',
      coachingPageUrl: 'https://carsi.example/coaching',
      taxInvoice: inv,
    }),
};

describe('paid purchase confirmation emails carry the tax invoice (GP-761)', () => {
  for (const [label, renderEmail] of Object.entries(paidEmails)) {
    it(`${label}: html and text show the tax invoice`, () => {
      const { html, text } = renderEmail(taxInvoice);
      for (const body of [html, text]) {
        expect(body).toContain('Tax invoice');
        expect(body).toContain('CARSI Pty Ltd');
        expect(body).toContain('ABN 10 000 000 000');
        expect(body).toContain('22 November 2026');
        expect(body).toContain('$29.00');
        expect(body).toContain('$2.64');
      }
    });

    it(`${label}: without an invoice there is no tax invoice and no ABN line`, () => {
      const { html, text } = renderEmail(null);
      for (const body of [html, text]) {
        expect(body).not.toContain('Tax invoice');
        expect(body).not.toMatch(/\bABN\b/);
      }
    });
  }
});

describe('sendEnrollmentWelcomeEmail adds the tax invoice only for a charge (GP-761)', () => {
  const sentBody = () => {
    const call = mocks.sendEmail.mock.calls.at(-1)?.[0] as { html: string; text: string };
    return `${call.html}\n${call.text}`;
  };

  beforeEach(() => {
    mocks.sendEmail.mockReset().mockResolvedValue({ sent: true });
    mocks.findUser.mockReset().mockResolvedValue(storedLearner);
    vi.stubEnv(CARSI_ABN_ENV, '10000000000');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('a paid purchase email is a tax invoice for the amount charged', async () => {
    await sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
      payment: { amountTotalCents: 2900, buyer: { name: null, businessName: null, abn: null } },
    });
    const body = sentBody();
    expect(body).toContain('Tax invoice');
    expect(body).toContain('ABN 10 000 000 000');
    expect(body).toContain('$2.64');
  });

  it('a free or membership enrolment email is not a tax invoice', async () => {
    await sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
    });
    expect(sentBody()).not.toContain('Tax invoice');
  });

  it('with no ABN configured the email still sends, without an invoice, and logs loudly', async () => {
    vi.stubEnv(CARSI_ABN_ENV, '');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
      payment: { amountTotalCents: 2900, buyer: { name: null, businessName: null, abn: null } },
    });
    expect(result).toEqual({ sent: true });
    expect(sentBody()).not.toContain('Tax invoice');
    expect(sentBody()).not.toMatch(/\bABN\b/);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('CARSI_ABN'));
  });

  // GP-761 review P1: a team order of $1,000 or more must name the buyer (ATO).
  // 35 seats x $29 = $1,015.00.
  it('a team order of $1,000 or more names the buyer from the Stripe session, not a stored first name', async () => {
    mocks.findUser.mockResolvedValue({ ...storedLearner, fullName: 'Sam' });
    await sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
      payment: {
        amountTotalCents: 101500,
        seatCount: 35,
        buyer: { name: 'Sam Lee', businessName: null, abn: null },
      },
    });
    const body = sentBody();
    expect(body).toContain('Tax invoice');
    expect(body).toContain('team purchase (35 seats)');
    expect(body).toContain('$1,015.00');
    expect(body).toContain('Buyer: Sam Lee');
  });

  it('a team order at exactly $1,000.00 with no Stripe name falls back to the stored full name', async () => {
    mocks.findUser.mockResolvedValue({ ...storedLearner, fullName: 'Alex Chen' });
    await sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
      payment: {
        amountTotalCents: 100000,
        seatCount: 20,
        buyer: { name: null, businessName: null, abn: null },
      },
    });
    expect(sentBody()).toContain('Buyer: Alex Chen');
  });

  it('a team order of $1,000 or more with no buyer identity sends without an invoice and logs NOT ISSUED', async () => {
    mocks.findUser.mockResolvedValue({ ...storedLearner, fullName: null });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
      payment: {
        amountTotalCents: 101500,
        seatCount: 35,
        buyer: { name: null, businessName: null, abn: null },
      },
    });
    expect(result).toEqual({ sent: true });
    const body = sentBody();
    expect(body).not.toContain('Tax invoice');
    expect(body).not.toContain('Buyer');
    expect(err).toHaveBeenCalledWith(expect.stringContaining('NOT ISSUED'));
  });
});
