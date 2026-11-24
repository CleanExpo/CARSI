import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CARSI_ABN_ENV, taxInvoiceBuyerFromCheckout } from '@/lib/billing/tax-invoice';
import { businessCoachingPackages, businessCoachingSessions } from '@/lib/marketing/business-coaching';
import { ccwRoadshowEvents, ccwRoadshowTicketPackages } from '@/lib/marketing/ccw-roadshow';
import { BUSINESS_COACHING_CHECKOUT_SOURCE } from '@/lib/server/business-coaching-checkout';
import { CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE } from '@/lib/server/carsi-coaching-monthly-checkout';

/**
 * GP-761 (review round 4 P1, founder ruling 23/11/2026): the Buyer on a tax invoice is the
 * person who paid, as Stripe Checkout recorded them, on every invoice path. An attendee,
 * a booking-form contact, a form business name or the learner's stored account name is
 * never shown as Buyer. Each case gives the Checkout customer a different name from the
 * other names the path holds, and drives the real fulfilment or send function; only the
 * boundaries (database, Stripe, mail send) are mocked.
 */

const mocks = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  findUser: vi.fn(),
  sessionsUpdate: vi.fn(),
  registration: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.findUser },
    lmsCourse: { findUnique: async () => ({ title: 'Paid item' }) },
    stripeWebhookEvent: {
      create: vi.fn(async ({ data }: { data: { id: string } }) => ({ ...data, processedAt: null })),
      update: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id })),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => ({ id: where.id })),
    },
  },
}));
vi.mock('@/lib/server/email', () => ({
  isEmailConfigured: () => true,
  sendEmail: mocks.sendEmail,
}));
vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: async () => '/learn/paid-item',
}));
vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { update: mocks.sessionsUpdate } },
    subscriptions: {
      retrieve: async () => {
        throw new Error('no live Stripe in tests');
      },
    },
  }),
}));
vi.mock('@/lib/server/business-coaching-registry', () => ({
  fulfillBusinessCoachingRegistration: mocks.registration,
}));
vi.mock('@/lib/server/business-coaching-notify', () => ({
  sendBusinessCoachingOrganizerNotificationEmail: async () => ({ sent: true }),
}));
vi.mock('@/lib/server/carsi-coaching-monthly-notify', () => ({
  sendCarsiCoachingMonthlyFounderNotificationEmail: async () => ({ sent: true }),
}));

import { processBusinessCoachingCheckoutCompleted } from '@/lib/server/business-coaching-fulfillment';
import { processCarsiCoachingMonthlyCheckoutCompleted } from '@/lib/server/carsi-coaching-monthly-fulfillment';
import { processCcwRoadshowBookingConfirmation } from '@/lib/server/ccw-roadshow-booking-email';
import { sendEnrollmentWelcomeEmail } from '@/lib/server/transactional-email';

const PAYER = 'Bob Payer';
const OPTS = { appOrigin: 'https://carsi.example' };

/** The Buyer rows of the tax invoice in the last email sent (text body). */
function invoiceBuyerRows(): string[] {
  const call = mocks.sendEmail.mock.calls.at(-1)?.[0] as { html: string; text: string };
  expect(call.text).toContain('Tax invoice');
  return call.text.split('\n').filter((line) => /^Buyer( ABN)?: /.test(line));
}

function stripeSession(fields: Record<string, unknown>): Stripe.Checkout.Session {
  return {
    id: 'cs_test_gp761_buyer',
    payment_status: 'paid',
    status: 'complete',
    amount_total: 2900,
    ...fields,
  } as unknown as Stripe.Checkout.Session;
}

beforeEach(() => {
  mocks.sendEmail.mockReset().mockResolvedValue({ sent: true });
  mocks.findUser.mockReset().mockResolvedValue({
    email: 'learner@example.test',
    fullName: 'Lee Learner',
    hashedPassword: '$2a$12$test',
  });
  mocks.sessionsUpdate.mockReset().mockResolvedValue({});
  mocks.registration.mockReset().mockResolvedValue({
    status: 'confirmed',
    seatCount: 1,
    registrationId: 'reg_1',
  });
  vi.stubEnv(CARSI_ABN_ENV, '10000000000'); // SYNTHETIC, TEST-ONLY ABN (checksum-valid).
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Owner Circle: the Buyer is the Checkout customer, never the attendee', () => {
  const ownerCircle = (metadata: Record<string, string>, customer: Record<string, unknown>) =>
    processBusinessCoachingCheckoutCompleted(
      stripeSession({
        customer_details: { email: 'payer@example.test', ...customer },
        metadata: {
          source: BUSINESS_COACHING_CHECKOUT_SOURCE,
          session_slug: businessCoachingSessions[0]!.slug,
          package_id: businessCoachingPackages[0]!.id,
          ...metadata,
        },
      }),
      OPTS
    );

  it('attendee_1 differs from the payer and no company was given', async () => {
    await ownerCircle({ attendee_1: 'Alice Attendee', company_name: '' }, { name: PAYER });
    expect(invoiceBuyerRows()).toEqual([`Buyer: ${PAYER}`]);
  });

  it('a booking-form company name is not the Checkout buyer', async () => {
    await ownerCircle({ attendee_1: 'Alice Attendee', company_name: 'Form Co' }, { name: PAYER });
    expect(invoiceBuyerRows()).toEqual([`Buyer: ${PAYER}`]);
  });

  it('with no Checkout name, the attendee is not named as Buyer', async () => {
    await ownerCircle({ attendee_1: 'Alice Attendee' }, { name: null });
    expect(invoiceBuyerRows()).toEqual([]);
  });
});

describe('Roadshow: the Buyer is the Checkout customer, never the attendee or form business', () => {
  const roadshow = (metadata: Record<string, string>, customer: Record<string, unknown>) =>
    processCcwRoadshowBookingConfirmation(
      stripeSession({
        customer_details: { email: 'payer@example.test', ...customer },
        metadata: {
          source: 'carsi-ccw-roadshow',
          event_slug: ccwRoadshowEvents[0]!.slug,
          ticket_package: ccwRoadshowTicketPackages[0]!.id,
          ...metadata,
        },
      }),
      OPTS
    );

  it('attendee_name differs from the payer', async () => {
    await roadshow({ attendee_name: 'Alice Attendee' }, { name: PAYER });
    expect(invoiceBuyerRows()).toEqual([`Buyer: ${PAYER}`]);
  });

  it('a booking-form business name is not the Checkout buyer', async () => {
    await roadshow({ attendee_name: 'Alice Attendee', business_name: 'Form Co' }, { name: PAYER });
    expect(invoiceBuyerRows()).toEqual([`Buyer: ${PAYER}`]);
  });

  it('with no Checkout name, the attendee is not named as Buyer', async () => {
    await roadshow({ attendee_name: 'Alice Attendee' }, { name: null });
    expect(invoiceBuyerRows()).toEqual([]);
  });
});

describe('Coaching monthly: the Buyer is the Checkout customer, never the form contact or account', () => {
  const monthly = (metadata: Record<string, string>, customer: Record<string, unknown>) =>
    processCarsiCoachingMonthlyCheckoutCompleted(
      stripeSession({
        mode: 'subscription',
        amount_total: 9900,
        customer_details: { email: 'payer@example.test', ...customer },
        metadata: { source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE, ...metadata },
      }),
      OPTS
    );

  it('contact_name differs from the payer', async () => {
    await monthly({ contact_name: 'Carol Contact' }, { name: PAYER });
    expect(invoiceBuyerRows()).toEqual([`Buyer: ${PAYER}`]);
  });

  it("with no Checkout name, the signed-in account's name is not named as Buyer", async () => {
    await monthly({ carsi_user_id: 'u1' }, { name: null });
    expect(invoiceBuyerRows()).toEqual([]);
  });
});

describe('Course purchase (confirm, guest-complete and webhook all send through here)', () => {
  // The routes pass the Stripe Checkout session itself. `buyer` is the field the routes
  // passed before this change; it is kept here only so the same call drives the old code.
  const course = (customer: Record<string, unknown>, amountTotal = 2900, seatCount?: number) => {
    const checkout = stripeSession({ amount_total: amountTotal, customer_details: customer });
    return sendEnrollmentWelcomeEmail({
      studentId: 'u1',
      courseSlug: 'paid-item',
      appOrigin: 'https://carsi.example',
      payment: {
        checkout,
        seatCount,
        buyer: taxInvoiceBuyerFromCheckout(customer),
      },
    } as unknown as Parameters<typeof sendEnrollmentWelcomeEmail>[0]);
  };

  it('the payer differs from the learner account', async () => {
    await course({ name: PAYER });
    expect(invoiceBuyerRows()).toEqual([`Buyer: ${PAYER}`]);
  });

  it("with no Checkout name, the learner account's name is not named as Buyer", async () => {
    await course({ name: null });
    expect(invoiceBuyerRows()).toEqual([]);
  });

  it('a Checkout business name and AU ABN are the Buyer and Buyer ABN', async () => {
    await course({
      name: PAYER,
      business_name: 'Payer Pty Ltd',
      tax_ids: [{ type: 'au_abn', value: '20000000190' }],
    });
    expect(invoiceBuyerRows()).toEqual(['Buyer: Payer Pty Ltd', 'Buyer ABN: 20 000 000 190']);
  });
});
