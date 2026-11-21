/**
 * GP-767: a paid course checkout that carries `referral_partner=ccw` in its Stripe metadata is
 * stored as a CCW partner sale. No ref stores nothing; an unknown ref stores nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  construct: vi.fn(),
  markProcessed: vi.fn(),
  release: vi.fn(),
  fulfil: vi.fn(),
  claimsFor: vi.fn(),
  findUser: vi.fn(),
  welcome: vi.fn(),
  upsertSale: vi.fn(),
  recordStage: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  constructWebhookEvent: mocks.construct,
  resolveStripeWebhookSecret: () => 'whsec_test_webhook_secret',
  isVerifiedStripeEventShape: (event: { id?: string; object?: string }) =>
    typeof event.id === 'string' && event.id.startsWith('evt_') && event.object === 'event',
  webhookLivemodeMatchesApiKey: () => true,
  getStripeClient: () => ({}),
}));
vi.mock('@/lib/server/event-attribution', () => ({
  persistAttributedRevenueReversal: vi.fn(),
  recordAttributedStage: mocks.recordStage,
}));
vi.mock('@/lib/server/stripe-webhook-idempotency', () => ({
  claimStripeWebhookEvent: mocks.claim,
  markStripeWebhookEventProcessed: mocks.markProcessed,
  releaseStripeWebhookEventClaim: mocks.release,
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/lms-auth', () => ({
  sessionClaimsForUserId: mocks.claimsFor,
}));
vi.mock('@/lib/server/team-course-purchase', () => ({
  fulfillCourseCheckoutForUser: mocks.fulfil,
}));
vi.mock('@/lib/server/enrollment-email', () => ({ sendEnrollmentWelcomeEmail: mocks.welcome }));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/ga4-measurement-protocol', () => ({ sendGa4PurchaseEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    stripeWebhookEvent: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    partnerReferralSale: { upsert: mocks.upsertSale },
    lmsUser: { findUnique: mocks.findUser },
  },
}));

import { POST } from '../../../app/api/lms/webhooks/stripe/route';

const ORIGINAL_ENV = { ...process.env };

function completedSession(metadata: Record<string, string>) {
  return {
    id: 'evt_partner_sale',
    object: 'event',
    livemode: false,
    type: 'checkout.session.completed',
    created: 1_795_000_000,
    data: {
      object: {
        id: 'cs_test_partner_sale',
        payment_status: 'paid',
        amount_total: 9_900,
        currency: 'aud',
        customer_email: 'buyer@example.test',
        metadata: { course_slug: 'ccw-carsi-truckmount-operations', student_id: 'student-1', ...metadata },
      },
    },
  };
}

function deliver() {
  return POST(
    new Request('https://carsi.com.au/api/lms/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': `t=1710000000,v1=${'ab'.repeat(32)}`,
      },
      body: '{}',
    }) as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  mocks.claim.mockResolvedValue({ claimed: true });
  mocks.release.mockResolvedValue(undefined);
  mocks.markProcessed.mockResolvedValue(undefined);
  mocks.fulfil.mockResolvedValue({ alreadyEnrolled: true });
  mocks.recordStage.mockResolvedValue(undefined);
  mocks.upsertSale.mockResolvedValue({});
  mocks.claimsFor.mockResolvedValue({ sub: 'student-1', email: 'buyer@example.test' });
  mocks.findUser.mockResolvedValue(null);
  mocks.welcome.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('Stripe webhook partner referral sale (GP-767)', () => {
  it('a purchase that came through a ?ref=ccw link records a CCW sale', async () => {
    mocks.construct.mockReturnValue(completedSession({ referral_partner: 'ccw' }));

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.upsertSale).toHaveBeenCalledTimes(1);
    const args = mocks.upsertSale.mock.calls[0][0];
    expect(args.where).toEqual({ transactionId: 'cs_test_partner_sale' });
    expect(args.create).toEqual({
      partnerId: 'ccw',
      transactionId: 'cs_test_partner_sale',
      courseSlug: 'ccw-carsi-truckmount-operations',
      amountPaidCents: 9_900,
      currency: 'AUD',
      paidAt: new Date(1_795_000_000_000),
    });
    expect(args.update).toEqual({});
    expect(mocks.markProcessed).toHaveBeenCalled();
  });

  it('a purchase with no ref records no partner sale', async () => {
    mocks.construct.mockReturnValue(completedSession({}));

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.fulfil).toHaveBeenCalledTimes(1);
    expect(mocks.upsertSale).not.toHaveBeenCalled();
  });

  it('an unknown ref in the metadata is ignored', async () => {
    mocks.construct.mockReturnValue(completedSession({ referral_partner: 'someone-else' }));

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.fulfil).toHaveBeenCalledTimes(1);
    expect(mocks.upsertSale).not.toHaveBeenCalled();
  });

  it('a failed partner write returns 500 before fulfilment, so the retry still sends the welcome email', async () => {
    mocks.construct.mockReturnValue(completedSession({ referral_partner: 'ccw' }));
    mocks.upsertSale.mockRejectedValueOnce(new Error('connection refused'));
    mocks.fulfil.mockResolvedValue({ alreadyEnrolled: false, enrollmentId: 'enr-1', courseId: 'course-1' });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const first = await deliver();

    expect(first.status).toBe(500);
    expect(mocks.fulfil).not.toHaveBeenCalled();
    expect(mocks.release).toHaveBeenCalledWith(expect.anything(), 'evt_partner_sale');
    expect(mocks.markProcessed).not.toHaveBeenCalled();

    // Stripe's retry: the write succeeds and the first-time enrolment side effects still run.
    const retry = await deliver();

    expect(retry.status).toBe(200);
    expect(mocks.upsertSale).toHaveBeenCalledTimes(2);
    expect(mocks.fulfil).toHaveBeenCalledTimes(1);
    expect(mocks.welcome).toHaveBeenCalledTimes(1);
  });

  it('records the CCW sale even when the learner cannot be resolved', async () => {
    mocks.construct.mockReturnValue(completedSession({ referral_partner: 'ccw', student_id: '' }));
    mocks.claimsFor.mockResolvedValue(null);
    mocks.findUser.mockResolvedValue(null);
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.fulfil).not.toHaveBeenCalled();
    expect(mocks.upsertSale).toHaveBeenCalledTimes(1);
    expect(mocks.upsertSale.mock.calls[0][0].create.partnerId).toBe('ccw');
  });

  it('does not write a sale row without a verified amount, and does not block the enrolment', async () => {
    const event = completedSession({ referral_partner: 'ccw' });
    (event.data.object as { amount_total: number | null }).amount_total = null;
    mocks.construct.mockReturnValue(event);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await deliver();

    expect(response.status).toBe(200);
    expect(mocks.upsertSale).not.toHaveBeenCalled();
    expect(mocks.fulfil).toHaveBeenCalledTimes(1);
  });
});
