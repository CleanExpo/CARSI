import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CARSI_ABN_ENV, buildTaxInvoice } from '@/lib/billing/tax-invoice';
import {
  renderCarsiCoachingMonthlyWelcomeEmail,
  renderCcwRoadshowBookingConfirmationEmail,
  renderEnrollmentWelcomeEmail,
  renderOwnerCircleBookingConfirmationEmail,
} from '@/lib/server/email-templates';

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: async () => ({
        email: 'learner@example.test',
        fullName: 'Learner',
        hashedPassword: '$2a$12$test',
      }),
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
  { item: 'Paid item', totalCents: 2900, issuedAt: new Date('2026-11-21T22:30:00.000Z') },
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
      payment: { amountTotalCents: 2900 },
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
      payment: { amountTotalCents: 2900 },
    });
    expect(result).toEqual({ sent: true });
    expect(sentBody()).not.toContain('Tax invoice');
    expect(sentBody()).not.toMatch(/\bABN\b/);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('CARSI_ABN'));
  });
});
