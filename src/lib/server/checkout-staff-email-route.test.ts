import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * POST /api/lms/checkout must refuse, before any Stripe session, an unauthenticated purchase
 * for an admin-allowlisted email that has no active account. The webhook can never provision
 * or authenticate that address, so the payment could never be fulfilled. The refusal must not
 * depend on the client-controlled guest_checkout flag or the purchase mode.
 */

const db = vi.hoisted(() => ({
  users: [] as { id: string; email: string; isActive: boolean }[],
}));

const stripe = vi.hoisted(() => ({
  create: vi.fn(async () => ({
    checkout_url: 'https://stripe.test/x',
    checkout_session_id: 'cs_test',
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: {
      findUnique: vi.fn(
        async ({ where }: { where: { email?: string; id?: string } }) =>
          db.users.find((u) => (where.id ? u.id === where.id : u.email === where.email)) ?? null
      ),
    },
  },
}));

vi.mock('@/lib/server/local-course-checkout', () => ({
  // A Bearer "email:<address>" header resolves to that address, as a verified Bearer JWT would.
  resolveCheckoutEmail: vi.fn(
    async ({
      bodyEmail,
      authorizationHeader,
    }: {
      bodyEmail?: string;
      authorizationHeader?: string;
    }) =>
      authorizationHeader?.startsWith('Bearer email:')
        ? authorizationHeader.slice('Bearer email:'.length)
        : bodyEmail?.trim().toLowerCase() || null
  ),
  createStripeCheckoutForCourse: stripe.create,
}));

// A cookie token "valid:<id>" verifies as that learner, whatever the database now says.
vi.mock('@/lib/auth/session-jwt', () => ({
  verifySessionToken: vi.fn(async (token: string) =>
    token.startsWith('valid:')
      ? { sub: token.slice(6), email: 'x@example.com', full_name: 'X', role: 'student' }
      : null
  ),
}));

vi.mock('@/lib/server/first-lesson', () => ({ getFirstLessonLearnPath: vi.fn(async () => null) }));

// Past the staff check the route looks the course up; returning none (404) proves the request
// got beyond the refusal without needing the rest of the checkout stack.
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: vi.fn(async () => null),
}));

const { POST } = await import('../../../app/api/lms/checkout/route');

const ORIG = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PANEL_EMAILS: process.env.ADMIN_PANEL_EMAILS,
};

function post(
  body: Record<string, unknown>,
  cookie?: string,
  authorization?: string
): Promise<Response> {
  return POST(
    new NextRequest('https://carsi.com.au/api/lms/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(authorization ? { authorization } : {}),
      },
    })
  );
}

beforeEach(() => {
  db.users = [];
  stripe.create.mockClear();
  process.env.ADMIN_EMAIL = 'support@carsi.com.au';
  process.env.ADMIN_PANEL_EMAILS = 'ops@carsi.com.au';
});

afterEach(() => {
  process.env.ADMIN_EMAIL = ORIG.ADMIN_EMAIL;
  process.env.ADMIN_PANEL_EMAILS = ORIG.ADMIN_PANEL_EMAILS;
});

describe('POST /api/lms/checkout — unclaimed staff email', () => {
  it.each([
    ['guest flag set', { guest_checkout: true }],
    ['guest flag omitted', {}],
    ['guest flag false', { guest_checkout: false }],
    ['team purchase', { purchase_mode: 'team', team_seat_count: 5 }],
  ])('refuses with 409 and no Stripe session (%s)', async (_label, extra) => {
    const res = await post({
      slug: 'water-damage-essentials',
      customer_email: ' Support@CARSI.com.au ',
      ...extra,
    });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('reserved_staff_email');
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it('refuses an inactive staff account the webhook could not authenticate', async () => {
    db.users.push({ id: 'staff-1', email: 'ops@carsi.com.au', isActive: false });
    const res = await post({ slug: 'water-damage-essentials', customer_email: 'ops@carsi.com.au' });
    expect(res.status).toBe(409);
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it('lets an active staff account and an ordinary email past the refusal', async () => {
    db.users.push({ id: 'staff-2', email: 'ops@carsi.com.au', isActive: true });
    for (const email of ['ops@carsi.com.au', 'learner@example.com']) {
      const res = await post({
        slug: 'water-damage-essentials',
        customer_email: email,
        guest_checkout: true,
      });
      expect(res.status).toBe(404);
    }
  });

  it.each([
    ['self', {}],
    ['team', { purchase_mode: 'team', team_seat_count: 5 }],
  ])(
    'refuses a still-valid cookie for a deactivated learner (%s) before Stripe',
    async (_l, extra) => {
      db.users.push({ id: 'staff-3', email: 'ops@carsi.com.au', isActive: false });
      const res = await post(
        { slug: 'water-damage-essentials', ...extra },
        'auth_token=valid:staff-3'
      );
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('inactive_account');
      expect(stripe.create).not.toHaveBeenCalled();
    }
  );

  it('refuses a cookie whose learner row is gone, and lets an active one through', async () => {
    const gone = await post({ slug: 'water-damage-essentials' }, 'auth_token=valid:deleted-1');
    expect(gone.status).toBe(401);
    expect((await gone.json()).code).toBe('inactive_account');
    db.users.push({ id: 'learner-9', email: 'learner9@example.com', isActive: true });
    const ok = await post(
      { slug: 'water-damage-essentials', customer_email: 'learner9@example.com' },
      'auth_token=valid:learner-9'
    );
    expect(ok.status).toBe(404);
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it('answers 503 and opens no Stripe session when the account lookup fails', async () => {
    const { prisma } = await import('@/lib/prisma');
    vi.mocked(prisma.lmsUser.findUnique).mockRejectedValueOnce(new Error('connection refused'));
    const res = await post({
      slug: 'water-damage-essentials',
      customer_email: 'support@carsi.com.au',
    });
    expect(res.status).toBe(503);
    expect(stripe.create).not.toHaveBeenCalled();
  });

  it('refuses a deactivated account reached by Bearer token or typed email, with no cookie', async () => {
    db.users.push({ id: 'learner-7', email: 'gone@example.com', isActive: false });
    const bearer = await post(
      { slug: 'water-damage-essentials', guest_checkout: true },
      undefined,
      'Bearer email:gone@example.com'
    );
    expect(bearer.status).toBe(401);
    expect((await bearer.json()).code).toBe('inactive_account');
    const typed = await post({
      slug: 'water-damage-essentials',
      customer_email: 'Gone@Example.com',
    });
    expect(typed.status).toBe(401);
    expect(stripe.create).not.toHaveBeenCalled();
  });
});
