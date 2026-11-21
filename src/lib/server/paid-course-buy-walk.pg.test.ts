/**
 * GP-638: a stranger buys a paid CARSI course, end to end, on a REAL PostgreSQL.
 *
 * The walk, through the real route handlers in the order a buyer hits them:
 *   1. POST /api/lms/checkout            guest email, no account -> Stripe Checkout in AUD
 *   2. POST /api/lms/webhooks/stripe     signed `checkout.session.completed` (paid) -> enrolment row
 *   3. POST /api/lms/enrollments/guest-complete   buyer sets a password -> session cookie + learn URL
 *   4. GET  /api/lms/lessons/:id         with that cookie -> the first lesson opens
 *
 * Only the network edges are faked: the Stripe API client (no live session, no charge), and the
 * outbound welcome email / CRM / GA4 / Sentry calls. Webhook signature checking is the real
 * Stripe verifier, fed a header signed with a test-only secret. Users, courses, enrolments, the
 * webhook idempotency claim and the lesson access gate are all real SQL.
 *
 * Controls in the same file: an unpaid session grants nothing, a replayed webhook makes no
 * second enrolment, and a learner who did not pay cannot open the lesson.
 *
 * Where it runs: CI's E2E job (`npm run test:pg`) against its migrated postgres:16 service. It
 * needs a disposable loopback database (src/test-utils/pg-disposable.ts); locally it skips.
 */
import { randomUUID } from 'node:crypto';

import { NextRequest } from 'next/server';
import pg from 'pg';
import Stripe from 'stripe';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { pgSuiteTarget } from '@/test-utils/pg-disposable';

const DB_URL = process.env.DATABASE_URL?.trim() ?? '';
const TARGET = pgSuiteTarget(process.env);
const RUNNABLE = TARGET.runnable;

// Test-only placeholders. Neither is a real credential: the Stripe client is replaced below, and
// the webhook secret only signs payloads this file builds itself.
const WEBHOOK_SECRET = 'whsec_gp638_test_only_placeholder';
const STRIPE_KEY_PLACEHOLDER = 'gp638-test-placeholder-not-a-stripe-key';

type CreatedSession = {
  id: string;
  url: string;
  mode: string;
  customer_email: string;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
  line_items: Array<{
    quantity: number;
    price_data: { currency: string; unit_amount: number; product_data: { name: string } };
  }>;
};

const stripeFake = vi.hoisted(() => {
  const sessions = new Map<string, Record<string, unknown>>();
  return {
    sessions,
    created: [] as Array<Record<string, unknown>>,
    paid: new Set<string>(),
  };
});

vi.mock('@/lib/api/stripe', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api/stripe')>();
  let n = 0;
  const client = {
    checkout: {
      sessions: {
        create: async (args: Record<string, unknown>) => {
          n += 1;
          const id = `cs_test_gp638_${n}`;
          const session = { ...args, id, url: `https://checkout.stripe.com/c/pay/${id}` };
          stripeFake.created.push(session);
          stripeFake.sessions.set(id, session);
          return session;
        },
        retrieve: async (id: string) => {
          const s = stripeFake.sessions.get(id);
          if (!s) throw new Error('No such checkout.session');
          return {
            ...s,
            object: 'checkout.session',
            payment_status: stripeFake.paid.has(id) ? 'paid' : 'unpaid',
            customer_details: { email: s.customer_email },
          };
        },
      },
    },
  };
  return { ...real, getStripeClient: () => client };
});

const sideEffects = vi.hoisted(() => ({ welcomeEmail: vi.fn(async () => undefined) }));
vi.mock('@/lib/server/enrollment-email', () => ({
  sendEnrollmentWelcomeEmail: sideEffects.welcomeEmail,
}));
vi.mock('@/lib/server/crm-enrollment-notify', () => ({ notifyCrmEnrollmentCreated: vi.fn() }));
vi.mock('@/lib/server/ga4-measurement-protocol', () => ({
  sendGa4PurchaseEvent: vi.fn(async () => undefined),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn(async () => undefined) }));

if (!RUNNABLE) {
  describe('paid course buy walk (real PostgreSQL)', () => {
    const refusal = TARGET.refusal;
    if (refusal) {
      it('refuses: needs a disposable loopback DATABASE_URL (CARSI_PG_DISPOSABLE=1)', () => {
        throw new Error(refusal);
      });
    } else {
      it.skip('runs in CI (E2E job, `npm run test:pg`): no local DATABASE_URL here', () => {});
    }
  });
}

describe.runIf(RUNNABLE)('GP-638 paid course buy walk (real PostgreSQL)', () => {
  const db = new pg.Client({ connectionString: DB_URL });
  const run = randomUUID().slice(0, 8);
  const ids = {
    instructor: randomUUID(),
    course: randomUUID(),
    module1: randomUUID(),
    lesson1: randomUUID(),
    lesson2: randomUUID(),
    nonPayer: randomUUID(),
  };
  const slug = `gp638-buy-walk-${run}`;
  const buyerEmail = `stranger-${run}@buy-walk.invalid`;
  const unpaidEmail = `unpaid-${run}@buy-walk.invalid`;
  const PRICE_AUD = 149;
  const firstLessonPath = () =>
    `/dashboard/learn/${slug}?lesson=${encodeURIComponent(ids.lesson1)}`;

  let checkoutPOST: typeof import('../../../app/api/lms/checkout/route').POST;
  let webhookPOST: typeof import('../../../app/api/lms/webhooks/stripe/route').POST;
  let guestCompletePOST: typeof import('../../../app/api/lms/enrollments/guest-complete/route').POST;
  let lessonGET: typeof import('../../../app/api/lms/lessons/[lessonId]/route').GET;
  let signSessionToken: typeof import('@/lib/auth/session-jwt').signSessionToken;
  let prisma: typeof import('@/lib/prisma').prisma;

  beforeAll(async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', STRIPE_KEY_PLACEHOLDER);
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET);
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.com.au');
    if (!process.env.JWT_SECRET?.trim()) {
      vi.stubEnv('JWT_SECRET', 'gp638-test-only-jwt-placeholder-0123456789abcdef');
    }

    await db.connect();
    await db.query(
      "INSERT INTO lms_users (id, email, hashed_password, role) VALUES ($1, $2, 'x', NULL), ($3, $4, 'x', NULL)",
      [
        ids.instructor,
        `inst-${run}@buy-walk.invalid`,
        ids.nonPayer,
        `nonpayer-${run}@buy-walk.invalid`,
      ]
    );
    await db.query(
      "INSERT INTO lms_courses (id, slug, title, instructor_id, status, price_aud, is_free) VALUES ($1, $2, 'Buy walk paid course', $3, 'published', $4, false)",
      [ids.course, slug, ids.instructor, PRICE_AUD]
    );
    await db.query(
      "INSERT INTO lms_modules (id, course_id, title, order_index) VALUES ($1, $2, 'Module one', 0)",
      [ids.module1, ids.course]
    );
    await db.query(
      "INSERT INTO lms_lessons (id, module_id, title, content_type, content_body, order_index) VALUES ($1, $3, 'Lesson one', 'text', 'First lesson body', 0), ($2, $3, 'Lesson two', 'text', 'Second lesson body', 1)",
      [ids.lesson1, ids.lesson2, ids.module1]
    );

    ({ POST: checkoutPOST } = await import('../../../app/api/lms/checkout/route'));
    ({ POST: webhookPOST } = await import('../../../app/api/lms/webhooks/stripe/route'));
    ({ POST: guestCompletePOST } = await import(
      '../../../app/api/lms/enrollments/guest-complete/route'
    ));
    ({ GET: lessonGET } = await import('../../../app/api/lms/lessons/[lessonId]/route'));
    ({ signSessionToken } = await import('@/lib/auth/session-jwt'));
    ({ prisma } = await import('@/lib/prisma'));
  });

  afterAll(async () => {
    // Leave the shared CI database empty for the suites that need it empty.
    const emails = [buyerEmail, unpaidEmail];
    await db
      .query('DELETE FROM stripe_webhook_events WHERE id LIKE $1', [`evt_gp638_${run}%`])
      .catch(() => {});
    await db.query('DELETE FROM lms_enrollments WHERE course_id = $1', [ids.course]);
    await db.query('DELETE FROM lms_courses WHERE id = $1', [ids.course]);
    await db.query(
      'DELETE FROM lms_users WHERE id = ANY($1::uuid[]) OR lower(email) = ANY($2::text[])',
      [[ids.instructor, ids.nonPayer], emails]
    );
    await prisma?.$disconnect().catch(() => {});
    await db.end().catch(() => {});
    vi.unstubAllEnvs();
  });

  function json(url: string, body: unknown, init: { headers?: Record<string, string> } = {}) {
    return new NextRequest(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
      body: JSON.stringify(body),
    });
  }

  async function startCheckout(email: string): Promise<CreatedSession> {
    const res = await checkoutPOST(
      json('https://carsi.com.au/api/lms/checkout', {
        slug,
        customer_email: email,
        guest_checkout: true,
        full_name: 'Buy Walk Stranger',
      })
    );
    const body = (await res.json()) as { checkout_url?: string; detail?: string };
    expect(res.status, body.detail).toBe(200);
    const session = stripeFake.created.at(-1) as unknown as CreatedSession;
    expect(body.checkout_url).toBe(session.url);
    return session;
  }

  async function deliverCompleted(session: CreatedSession, eventId: string) {
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      livemode: false,
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: session.id,
          object: 'checkout.session',
          mode: 'payment',
          payment_status: stripeFake.paid.has(session.id) ? 'paid' : 'unpaid',
          customer_email: session.customer_email,
          customer_details: { email: session.customer_email },
          amount_total: session.line_items[0]!.price_data.unit_amount,
          currency: 'aud',
          metadata: session.metadata,
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    return webhookPOST(
      new NextRequest('https://carsi.com.au/api/lms/webhooks/stripe', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'stripe-signature': signature },
        body: payload,
      })
    );
  }

  async function enrolmentsFor(email: string) {
    const r = await db.query<{ status: string; payment_reference: string | null }>(
      'SELECT e.status, e.payment_reference FROM lms_enrollments e JOIN lms_users u ON u.id = e.student_id WHERE lower(u.email) = $1 AND e.course_id = $2',
      [email, ids.course]
    );
    return r.rows;
  }

  async function openLesson(cookieHeader: string) {
    return lessonGET(
      new NextRequest(`https://carsi.com.au/api/lms/lessons/${ids.lesson1}`, {
        headers: { cookie: cookieHeader },
      }),
      { params: Promise.resolve({ lessonId: ids.lesson1 }) }
    );
  }

  it('a stranger pays for a course and opens its first lesson', async () => {
    // 1. Course page -> checkout: a Stripe Checkout session in AUD at the catalogue price.
    const session = await startCheckout(buyerEmail);
    expect(session.mode).toBe('payment');
    expect(session.customer_email).toBe(buyerEmail);
    expect(session.line_items).toHaveLength(1);
    expect(session.line_items[0]!.quantity).toBe(1);
    expect(session.line_items[0]!.price_data.currency).toBe('aud');
    expect(session.line_items[0]!.price_data.unit_amount).toBe(PRICE_AUD * 100);
    expect(session.metadata).toMatchObject({
      course_slug: slug,
      guest_checkout: 'true',
      purchase_mode: 'self',
    });
    const success = new URL(session.success_url.replace('{CHECKOUT_SESSION_ID}', session.id));
    expect(success.origin).toBe('https://carsi.com.au');
    expect(success.pathname).toBe(`/courses/${slug}/payment-success`);
    expect(success.searchParams.get('next')).toBe(firstLessonPath());
    expect(new URL(session.cancel_url).pathname).toBe(`/courses/${slug}`);

    // Nothing is granted before payment.
    expect(await enrolmentsFor(buyerEmail)).toEqual([]);

    // 2. Stripe reports the session paid -> the signed webhook enrols the buyer.
    stripeFake.paid.add(session.id);
    const hook = await deliverCompleted(session, `evt_gp638_${run}_paid`);
    expect(hook.status).toBe(200);
    expect(await enrolmentsFor(buyerEmail)).toEqual([
      { status: 'active', payment_reference: session.id },
    ]);
    expect(sideEffects.welcomeEmail).toHaveBeenCalledTimes(1);

    // Stripe delivers at least once: the same event again must not enrol twice or re-email.
    const replay = await deliverCompleted(session, `evt_gp638_${run}_paid`);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toMatchObject({ status: 'duplicate' });
    expect(await enrolmentsFor(buyerEmail)).toHaveLength(1);
    expect(sideEffects.welcomeEmail).toHaveBeenCalledTimes(1);

    // 3. Payment-success page: the buyer sets a password and is signed in.
    const done = await guestCompletePOST(
      json('https://carsi.com.au/api/lms/enrollments/guest-complete', {
        session_id: session.id,
        password: 'buy-walk-password-1',
        full_name: 'Buy Walk Stranger',
      })
    );
    const doneBody = (await done.json()) as {
      ok?: boolean;
      learn_url?: string;
      requires_sign_in?: boolean;
      detail?: string;
    };
    expect(done.status, doneBody.detail).toBe(200);
    expect(doneBody.requires_sign_in).toBeUndefined();
    expect(doneBody.learn_url).toBe(firstLessonPath());
    const cookie = done.cookies.get('auth_token')?.value;
    expect(cookie, 'guest-complete must sign the buyer in').toBeTruthy();
    expect(await enrolmentsFor(buyerEmail)).toHaveLength(1);

    // 4. The learn URL's lesson opens for the buyer.
    const lesson = await openLesson(`auth_token=${cookie}`);
    const lessonBody = (await lesson.json()) as { lesson?: { id?: string; title?: string } };
    expect(lesson.status).toBe(200);
    expect(lessonBody.lesson).toMatchObject({ id: ids.lesson1, title: 'Lesson one' });
  });

  it('a learner who did not pay cannot open the paid lesson', async () => {
    const token = await signSessionToken({
      sub: ids.nonPayer,
      email: `nonpayer-${run}@buy-walk.invalid`,
      role: null,
    } as never);
    const lesson = await openLesson(`auth_token=${token}`);
    expect(lesson.status).toBe(404);
  });

  it('an unpaid checkout session grants nothing', async () => {
    const session = await startCheckout(unpaidEmail);
    const hook = await deliverCompleted(session, `evt_gp638_${run}_unpaid`);
    expect(hook.status).toBe(200);
    expect(await enrolmentsFor(unpaidEmail)).toEqual([]);

    const done = await guestCompletePOST(
      json('https://carsi.com.au/api/lms/enrollments/guest-complete', {
        session_id: session.id,
        password: 'buy-walk-password-2',
      })
    );
    expect(done.status).toBe(400);
    expect(done.cookies.get('auth_token')).toBeUndefined();
    expect(await enrolmentsFor(unpaidEmail)).toEqual([]);
  });
});
