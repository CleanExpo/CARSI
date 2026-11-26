import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-759 (a): a refund or chargeback that revoked a course enrolment must stick.
 *
 * Stripe keeps `payment_status: 'paid'` on a checkout session after its payment is refunded
 * (the refund is recorded on the charge, not the session). The success-page routes only check
 * `payment_status`, and the shared enrolment writer reactivates a revoked row on any fulfilment,
 * so replaying the same refunded `session_id` gave the course back. These tests drive the real
 * confirm and guest-complete routes and the real enrolment writer; only the database, Stripe
 * and the outbound side effects are faked.
 *
 * Controls: a NEW paid session still reactivates a revoked enrolment (re-purchase after a
 * refund is legitimate), and a refunded session with no enrolment row yet is refused too.
 */

type Row = {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  paymentReference: string | null;
  revokedReason: string | null;
};

const state = vi.hoisted(() => ({
  enrollment: null as Row | null,
  ledger: new Map<string, { id: string; type: string; processedAt: Date | null }>(),
  sessions: new Map<string, Record<string, unknown>>(),
  creates: 0,
}));

const BUYER = vi.hoisted(() => ({
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'buyer@refund-test.invalid',
  role: null,
}));
const COURSE = vi.hoisted(() => ({
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'refund-sticky-course',
  meta: null,
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    checkout: {
      sessions: {
        retrieve: vi.fn(async (id: string) => {
          const s = state.sessions.get(id);
          if (!s) throw new Error('No such checkout.session');
          return s;
        }),
      },
    },
  }),
}));

vi.mock('@/lib/prisma', () => {
  const client: Record<string, unknown> = {
    // GP-759: fulfilment runs in the seat step (one transaction over this same fake).
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
    lmsTeam: { findUnique: vi.fn(async () => null) },
    lmsUser: { findUnique: vi.fn(async () => ({ email: BUYER.email })) },
    lmsEnrollment: {
      findUnique: vi.fn(async () => state.enrollment),
      update: vi.fn(async (args: { data: Partial<Row> }) => {
        state.enrollment = { ...(state.enrollment as Row), ...args.data };
        return state.enrollment;
      }),
      create: vi.fn(async (args: { data: Row }) => {
        state.creates += 1;
        state.enrollment = { revokedReason: null, ...args.data };
        return state.enrollment;
      }),
    },
    stripeWebhookEvent: {
      findUnique: vi.fn(
        async (args: { where: { id: string } }) => state.ledger.get(args.where.id) ?? null,
      ),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    // GP-764: a paid fulfilment records the session's amount once.
    lmsCheckoutPayment: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => args.data),
    },
  };
  return { prisma: client };
});

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: vi.fn(async () => BUYER),
}));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: vi.fn(async () => COURSE),
}));
vi.mock('@/lib/server/lms-user-sync', () => ({ ensureLmsUserFromClaims: vi.fn(async () => {}) }));
vi.mock('@/lib/server/course-prerequisites', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/course-prerequisites')>()),
  findCoursePrerequisiteBlock: vi.fn(async () => null),
}));
vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: vi.fn(async () => `/dashboard/learn/${COURSE.slug}`),
}));
vi.mock('@/lib/server/guest-checkout', () => ({
  findOrCreateGuestUser: vi.fn(async () => ({ status: 'claimed', claims: BUYER })),
}));
vi.mock('@/lib/server/enrollment-email', () => ({
  sendEnrollmentWelcomeEmail: vi.fn(async () => {}),
}));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn(async () => {}) }));
vi.mock('@/lib/auth/session-jwt', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/session-jwt')>()),
  signSessionToken: vi.fn(async () => 'test-session-token'),
}));

const { POST: confirmPOST } = await import('../../../app/api/lms/enrollments/confirm/route');
const { POST: guestCompletePOST } = await import(
  '../../../app/api/lms/enrollments/guest-complete/route'
);
const { shouldRetryWebhookFulfillment } = await import('./stripe-webhook-policy');

function paidSession(id: string) {
  state.sessions.set(id, {
    id,
    object: 'checkout.session',
    // What Stripe returns for a session whose payment was later refunded in full.
    payment_status: 'paid',
    customer_email: BUYER.email,
    customer_details: { email: BUYER.email },
    metadata: { course_slug: COURSE.slug, purchase_mode: 'self' },
  });
}

function revokedRow(paymentReference: string, revokedReason: 'refunded' | 'disputed'): Row {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    studentId: BUYER.sub,
    courseId: COURSE.id,
    status: 'revoked',
    paymentReference,
    revokedReason,
  };
}

function post(url: string, body: unknown) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const confirm = (sessionId: string) =>
  confirmPOST(post('https://carsi.com.au/api/lms/enrollments/confirm', { session_id: sessionId }));
const guestComplete = (sessionId: string) =>
  guestCompletePOST(
    post('https://carsi.com.au/api/lms/enrollments/guest-complete', {
      session_id: sessionId,
      password: 'refund-sticky-password',
    }),
  );

beforeEach(() => {
  state.enrollment = null;
  state.ledger.clear();
  state.sessions.clear();
  state.creates = 0;
  process.env.DATABASE_URL = 'postgresql://offline.invalid/test';
  process.env.STRIPE_SECRET_KEY = 'gp759-test-placeholder-not-a-key';
});

describe('GP-759 (a): a refunded checkout session never re-grants its course', () => {
  it('confirm refuses the refunded session and the enrolment stays revoked', async () => {
    paidSession('cs_test_refunded');
    state.enrollment = revokedRow('cs_test_refunded', 'refunded');

    const res = await confirm('cs_test_refunded');

    expect(res.status).toBe(403);
    expect(state.enrollment?.status).toBe('revoked');
  });

  it('guest-complete refuses the refunded session, signs nobody in, and keeps it revoked', async () => {
    paidSession('cs_test_refunded');
    state.enrollment = revokedRow('cs_test_refunded', 'refunded');

    const res = await guestComplete('cs_test_refunded');

    expect(res.status).toBe(403);
    expect(res.cookies.get('auth_token')).toBeUndefined();
    expect(state.enrollment?.status).toBe('revoked');
  });

  it('a chargeback-revoked session is refused the same way', async () => {
    paidSession('cs_test_disputed');
    state.enrollment = revokedRow('cs_test_disputed', 'disputed');

    const res = await confirm('cs_test_disputed');

    expect(res.status).toBe(403);
    expect(state.enrollment?.status).toBe('revoked');
  });

  it('a session refunded before any enrolment row existed is refused and creates nothing', async () => {
    paidSession('cs_test_refunded_early');
    state.ledger.set('payment-reversed:cs_test_refunded_early', {
      id: 'payment-reversed:cs_test_refunded_early',
      type: 'payment_reversed:refunded',
      processedAt: null,
    });

    const res = await confirm('cs_test_refunded_early');

    expect(res.status).toBe(403);
    expect(state.creates).toBe(0);
    expect(state.enrollment).toBeNull();
  });

  it('control: a NEW paid session after a refund still reactivates the enrolment', async () => {
    paidSession('cs_test_repurchase');
    state.enrollment = revokedRow('cs_test_refunded', 'refunded');

    const res = await confirm('cs_test_repurchase');

    expect(res.status).toBe(200);
    expect(state.enrollment).toMatchObject({
      status: 'active',
      paymentReference: 'cs_test_repurchase',
    });
  });

  // GP-790: was "not an error" (200). A reversed session now answers PAYMENT_REVERSED on every
  // path, as the team path already did; the access held through the other payment is untouched.
  it('replaying a refunded session while access is live through another payment is refused, and that access is kept', async () => {
    paidSession('cs_test_refunded');
    state.ledger.set('payment-reversed:cs_test_refunded', {
      id: 'payment-reversed:cs_test_refunded',
      type: 'payment_reversed:refunded',
      processedAt: null,
    });
    state.enrollment = {
      ...revokedRow('cs_test_repurchase', 'refunded'),
      status: 'active',
      revokedReason: null,
    };

    const res = await confirm('cs_test_refunded');

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'PAYMENT_REVERSED' });
    expect(state.enrollment).toMatchObject({ status: 'active', paymentReference: 'cs_test_repurchase' });
  });

  it('a refunded TEAM session never provisions seats, even when the buyer already holds the course', async () => {
    paidSession('cs_test_team_refunded');
    state.sessions.set('cs_test_team_refunded', {
      ...state.sessions.get('cs_test_team_refunded'),
      metadata: { course_slug: COURSE.slug, purchase_mode: 'team', team_seat_count: '5' },
    });
    state.ledger.set('payment-reversed:cs_test_team_refunded', {
      id: 'payment-reversed:cs_test_team_refunded',
      type: 'payment_reversed:refunded',
      processedAt: null,
    });
    state.enrollment = {
      ...revokedRow('cs_test_other', 'refunded'),
      status: 'active',
      revokedReason: null,
    };

    const res = await confirm('cs_test_team_refunded');

    expect(res.status).toBe(403);
  });

  it('the webhook treats a reversed payment as terminal, so Stripe does not retry it for days', () => {
    expect(shouldRetryWebhookFulfillment('PAYMENT_REVERSED')).toBe(false);
  });
});
