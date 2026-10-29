/**
 * Route-level cover for `POST /api/lms/checkout`.
 *
 * The live double-charge (CleanExpo/CARSI#807) happened because this route
 * opened a Stripe session without asking whether the payer already owned the
 * course. A guard that ran *after* `checkout.sessions.create` would still
 * return a tidy 409 while having already opened the second charge.
 *
 * The check is keyed on course, not customer: buying a different course must
 * still reach Stripe.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveEmail: vi.fn(),
  createStripe: vi.fn(),
  verifySession: vi.fn(),
  publishedCourse: vi.fn(),
  entitlements: vi.fn(),
  dbCourse: vi.fn(),
  discount: vi.fn(),
  learnPath: vi.fn(),
  findUser: vi.fn(),
  findEnrollment: vi.fn(),
}));

vi.mock('@/lib/auth/session-jwt', () => ({
  verifySessionToken: mocks.verifySession,
}));

vi.mock('@/lib/server/local-course-checkout', () => ({
  resolveCheckoutEmail: mocks.resolveEmail,
  createStripeCheckoutForCourse: mocks.createStripe,
}));

vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: mocks.publishedCourse,
}));

vi.mock('@/lib/server/entitlements', () => ({
  getEntitlements: mocks.entitlements,
}));

vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: mocks.dbCourse,
}));

vi.mock('@/lib/server/user-discounts', () => ({
  findActiveUserDiscount: mocks.discount,
  audToUnitCents: (n: number) => Math.round(n * 100),
  computeDiscountedAud: (n: number) => n,
  STRIPE_MIN_UNIT_AMOUNT_CENTS: 50,
}));

vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: mocks.learnPath,
}));

vi.mock('@/lib/server/sentry', () => ({
  captureServerError: vi.fn(),
}));

vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: vi.fn().mockReturnValue(null),
  tryRecordAttributedStage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsUser: { findUnique: mocks.findUser },
    lmsEnrollment: { findUnique: mocks.findEnrollment },
  },
}));

const { POST } = await import('../../../app/api/lms/checkout/route');

const COURSE_SLUG = 'level-1-mould-remediation-2cc96b85';
const COURSE_ID = 'course-mould-1';
const LEARN = `/dashboard/learn/${COURSE_SLUG}`;

function request(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'postgres://configured';
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  mocks.resolveEmail.mockReset();
  mocks.resolveEmail.mockResolvedValue('brighttouchcleaner@gmail.com');
  mocks.createStripe.mockReset();
  mocks.createStripe.mockResolvedValue({
    checkout_url: 'https://checkout.stripe.test/cs_new',
    checkout_session_id: 'cs_new',
  });
  mocks.verifySession.mockReset();
  mocks.verifySession.mockResolvedValue(null);
  mocks.publishedCourse.mockReset();
  mocks.publishedCourse.mockResolvedValue({
    slug: COURSE_SLUG,
    title: 'Level 1 Mould Remediation',
    price_aud: 49,
    is_free: false,
  });
  mocks.entitlements.mockReset();
  mocks.entitlements.mockResolvedValue({ entitledCourseIds: null });
  mocks.dbCourse.mockReset();
  mocks.dbCourse.mockResolvedValue({ id: COURSE_ID, priceAud: 49, isFree: false });
  mocks.discount.mockReset();
  mocks.discount.mockResolvedValue(null);
  mocks.learnPath.mockReset();
  mocks.learnPath.mockResolvedValue(LEARN);
  mocks.findUser.mockReset();
  mocks.findEnrollment.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('a buyer who already has a paid enrolment for this course', () => {
  it('opens no Stripe session and tells them they already own it', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-1', hashedPassword: 'provisional:abc' });
    mocks.findEnrollment.mockResolvedValue({ status: 'active' });

    const res = await POST(
      request({
        slug: COURSE_SLUG,
        customer_email: 'brighttouchcleaner@gmail.com',
        guest_checkout: true,
      })
    );
    const body = (await res.json()) as {
      already_enrolled?: boolean;
      learn_path?: string;
      reset_path?: string;
      checkout_url?: string;
      detail?: string;
    };

    expect(res.status).toBe(409);
    expect(body.already_enrolled).toBe(true);
    expect(body.learn_path).toBe(LEARN);
    expect(body.reset_path?.startsWith('/forgot-password?')).toBe(true);
    expect(body.reset_path).toContain('paid=1');
    expect(body.reset_path).toContain('brighttouchcleaner');
    expect(body.checkout_url).toBeUndefined();
    expect(body.detail?.toLowerCase()).toContain('already own');
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });
});

describe('the same buyer buying a different course', () => {
  it('still reaches Stripe — the check is keyed on course, not customer', async () => {
    mocks.resolveEmail.mockResolvedValue('admin@cqldr.com.au');
    mocks.findUser.mockResolvedValue({ id: 'user-cqldr', hashedPassword: '$2a$12$x' });
    mocks.findEnrollment.mockResolvedValue(null);

    const res = await POST(
      request({
        slug: 'odour-control',
        customer_email: 'admin@cqldr.com.au',
        guest_checkout: true,
      })
    );
    const body = (await res.json()) as { checkout_url?: string };

    expect(res.status).toBe(200);
    expect(body.checkout_url).toBe('https://checkout.stripe.test/cs_new');
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
  });
});

describe('a team seat purchase', () => {
  it('is not blocked by the payer already owning the course', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-1', hashedPassword: '$2a$12$x' });
    mocks.findEnrollment.mockResolvedValue({ status: 'active' });

    const res = await POST(
      request({
        slug: COURSE_SLUG,
        customer_email: 'owner@example.test',
        purchase_mode: 'team',
        team_seat_count: 3,
      })
    );

    expect(res.status).toBe(200);
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
    expect(mocks.findEnrollment).not.toHaveBeenCalled();
  });
});

describe('a revoked enrolment', () => {
  it('may pay again — fulfilment reactivates the row', async () => {
    mocks.findUser.mockResolvedValue({ id: 'user-1', hashedPassword: '$2a$12$x' });
    mocks.findEnrollment.mockResolvedValue({ status: 'revoked' });

    const res = await POST(request({ slug: COURSE_SLUG, customer_email: 'refunded@example.test' }));

    expect(res.status).toBe(200);
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
  });
});

describe('the course row missing while the database is configured', () => {
  it('opens no Stripe session — ownership cannot be proven', async () => {
    mocks.dbCourse.mockRejectedValue(new Error('relation does not exist'));

    const res = await POST(request({ slug: COURSE_SLUG, customer_email: 'buyer@example.test' }));

    expect(res.status).toBe(503);
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });
});

describe('the ownership lookup throwing', () => {
  it('opens no Stripe session — a charge must not proceed on doubt', async () => {
    mocks.findUser.mockRejectedValue(new Error('connection refused'));

    const res = await POST(request({ slug: COURSE_SLUG, customer_email: 'buyer@example.test' }));

    expect(res.status).toBe(503);
    expect(mocks.createStripe).not.toHaveBeenCalled();
  });
});

describe('campaign attribution', () => {
  function requestWithCookie(body: Record<string, unknown>, cookie: string): NextRequest {
    return new NextRequest('https://carsi.example.test/api/lms/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body),
    });
  }

  it('copies the utm cookie into the Stripe session metadata', async () => {
    mocks.findUser.mockResolvedValue(null);
    const utm = encodeURIComponent(
      JSON.stringify({ utm_source: 'synthex', utm_campaign: 'carsi_oct', student_id: 'forged' })
    );

    const res = await POST(
      requestWithCookie({ slug: COURSE_SLUG, customer_email: 'new@example.test' }, `carsi_utm=${utm}`)
    );

    expect(res.status).toBe(200);
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
    expect(mocks.createStripe.mock.calls[0][0].extra_metadata).toEqual({
      utm_source: 'synthex',
      utm_campaign: 'carsi_oct',
    });
  });

  it('keeps the campaign on a discounted checkout, and the cookie cannot replace discount_id', async () => {
    mocks.verifySession.mockResolvedValue({ sub: 'user-disc' });
    mocks.findUser.mockResolvedValue({ id: 'user-disc', isActive: true });
    mocks.findEnrollment.mockResolvedValue(null);
    mocks.discount.mockResolvedValue({ id: 'disc-1', discountType: 'percent', value: 20 });
    const utm = encodeURIComponent(JSON.stringify({ utm_source: 'synthex', discount_id: 'forged' }));

    const res = await POST(
      requestWithCookie(
        { slug: COURSE_SLUG, customer_email: 'member@example.test' },
        `auth_token=tok; carsi_utm=${utm}`
      )
    );

    expect(res.status).toBe(200);
    expect(mocks.discount).toHaveBeenCalled();
    expect(mocks.createStripe).toHaveBeenCalledTimes(1);
    expect(mocks.createStripe.mock.calls[0][0].extra_metadata).toEqual({
      utm_source: 'synthex',
      discount_id: 'disc-1',
    });
  });

  it('adds no campaign metadata without the cookie', async () => {
    mocks.findUser.mockResolvedValue(null);

    const res = await POST(request({ slug: COURSE_SLUG, customer_email: 'new@example.test' }));

    expect(res.status).toBe(200);
    expect(mocks.createStripe.mock.calls[0][0].extra_metadata).toEqual({});
  });
});

describe('purchase survey capability cookie (Authority Machine slice 1b)', () => {
  const FLAG = 'PURCHASE_SURVEY_ENABLED';

  afterEach(() => {
    delete process.env[FLAG];
  });

  function surveyCookie(res: Response): string | undefined {
    return res.headers.getSetCookie().find((c) => c.startsWith('carsi_svy='));
  }

  it('flag off: the checkout response sets no cookie at all (unchanged)', async () => {
    delete process.env[FLAG];
    mocks.findUser.mockResolvedValue(null);
    const res = await POST(request({ slug: COURSE_SLUG, customer_email: 'new@example.test' }));
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it('flag on: sets an HttpOnly, Secure, SameSite=Lax 24 h cookie that verifies for the new session only', async () => {
    process.env[FLAG] = 'true';
    mocks.findUser.mockResolvedValue(null);
    const res = await POST(request({ slug: COURSE_SLUG, customer_email: 'new@example.test' }));
    expect(res.status).toBe(200);
    const header = surveyCookie(res);
    expect(header).toBeDefined();
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header?.toLowerCase()).toContain('samesite=lax');
    expect(header).toContain('Max-Age=86400');
    const { verifyPurchaseSurveyToken } = await import('@/lib/server/purchase-survey-token');
    const token = decodeURIComponent(header!.slice('carsi_svy='.length).split(';')[0]);
    expect(verifyPurchaseSurveyToken(token, 'cs_new', new Date())).toBe(true);
    expect(verifyPurchaseSurveyToken(token, 'cs_other', new Date())).toBe(false);
  });

  it('flag on: the discounted path sets it too', async () => {
    process.env[FLAG] = 'true';
    mocks.verifySession.mockResolvedValue({ sub: 'user-disc' });
    mocks.findUser.mockResolvedValue({ id: 'user-disc', isActive: true });
    mocks.findEnrollment.mockResolvedValue(null);
    mocks.discount.mockResolvedValue({ id: 'disc-1', discountType: 'percent', value: 20 });
    const res = await POST(
      new NextRequest('https://carsi.example.test/api/lms/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: 'auth_token=tok' },
        body: JSON.stringify({ slug: COURSE_SLUG, customer_email: 'member@example.test' }),
      })
    );
    expect(res.status).toBe(200);
    expect(surveyCookie(res)).toBeDefined();
  });
});

describe('first-touch attribution (Authority Machine slice 1a)', () => {
  const FLAG = 'ATTRIBUTION_CAPTURE_ENABLED';
  const FIRST_TOUCH = { ch: 'organic_search', ref: 'www.google.com', lp: '/courses/moisture', at: '2026-10-23' };
  const ftCookie = `carsi_ft=${encodeURIComponent(JSON.stringify(FIRST_TOUCH))}`;
  const utmCookie = `carsi_utm=${encodeURIComponent(JSON.stringify({ utm_source: 'synthex', utm_medium: 'social' }))}`;

  function requestWithCookie(body: Record<string, unknown>, cookie: string): NextRequest {
    return new NextRequest('https://carsi.example.test/api/lms/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body),
    });
  }

  function discountedMember() {
    mocks.verifySession.mockResolvedValue({ sub: 'user-disc' });
    mocks.findUser.mockResolvedValue({ id: 'user-disc', isActive: true });
    mocks.findEnrollment.mockResolvedValue(null);
    mocks.discount.mockResolvedValue({ id: 'disc-1', discountType: 'percent', value: 20 });
  }

  beforeEach(() => {
    delete process.env[FLAG];
  });

  afterEach(() => {
    delete process.env[FLAG];
  });

  it('T1a-1: flag on, guest checkout carries ft_ch, ft_ref, ft_lp and ft_at beside the utm keys', async () => {
    process.env[FLAG] = 'true';
    mocks.findUser.mockResolvedValue(null);

    const res = await POST(
      requestWithCookie(
        { slug: COURSE_SLUG, customer_email: 'new@example.test', guest_checkout: true },
        `${utmCookie}; ${ftCookie}`
      )
    );

    expect(res.status).toBe(200);
    expect(mocks.createStripe.mock.calls[0][0].extra_metadata).toEqual({
      utm_source: 'synthex',
      utm_medium: 'social',
      ft_ch: 'organic_search',
      ft_ref: 'www.google.com',
      ft_lp: '/courses/moisture',
      ft_at: '2026-10-23',
    });
  });

  it('T1a-2: flag on, the discounted path carries the first touch and keeps discount_id', async () => {
    process.env[FLAG] = '1';
    discountedMember();

    const res = await POST(
      requestWithCookie({ slug: COURSE_SLUG, customer_email: 'member@example.test' }, `auth_token=tok; ${ftCookie}`)
    );

    expect(res.status).toBe(200);
    expect(mocks.createStripe.mock.calls[0][0].extra_metadata).toEqual({
      ft_ch: 'organic_search',
      ft_ref: 'www.google.com',
      ft_lp: '/courses/moisture',
      ft_at: '2026-10-23',
      discount_id: 'disc-1',
    });
  });

  it('T1a-3: flag off, metadata is exactly what it is today (utm keys only) on both paths', async () => {
    mocks.findUser.mockResolvedValue(null);
    await POST(
      requestWithCookie(
        { slug: COURSE_SLUG, customer_email: 'new@example.test', guest_checkout: true },
        `${utmCookie}; ${ftCookie}`
      )
    );
    expect(mocks.createStripe.mock.calls[0][0].extra_metadata).toEqual({
      utm_source: 'synthex',
      utm_medium: 'social',
    });

    discountedMember();
    await POST(
      requestWithCookie(
        { slug: COURSE_SLUG, customer_email: 'member@example.test' },
        `auth_token=tok; ${utmCookie}; ${ftCookie}`
      )
    );
    expect(mocks.createStripe.mock.calls[1][0].extra_metadata).toEqual({
      utm_source: 'synthex',
      utm_medium: 'social',
      discount_id: 'disc-1',
    });
  });

  it.each([
    ['html', '<script>alert(1)</script>'],
    ['5 KB string', 'x'.repeat(5 * 1024)],
    ['wrong JSON shape', encodeURIComponent(JSON.stringify({ ch: 'evil', student_id: 'forged' }))],
    ['array', encodeURIComponent(JSON.stringify(['organic_search']))],
  ])('T1a-4: a hostile %s cookie adds no ft_* keys and checkout still succeeds', async (_label, raw) => {
    process.env[FLAG] = 'true';
    mocks.findUser.mockResolvedValue(null);

    const res = await POST(
      requestWithCookie({ slug: COURSE_SLUG, customer_email: 'new@example.test' }, `carsi_ft=${raw}`)
    );

    expect(res.status).toBe(200);
    const md = mocks.createStripe.mock.calls[0][0].extra_metadata as Record<string, string>;
    expect(Object.keys(md).filter((k) => k.startsWith('ft_'))).toEqual([]);
    expect(md.student_id).toBeUndefined();
  });

  it('T1a-5: a cookie carrying query text never puts it into metadata', async () => {
    process.env[FLAG] = 'true';
    mocks.findUser.mockResolvedValue(null);
    const smuggled = encodeURIComponent(
      JSON.stringify({
        ch: 'organic_search',
        ref: 'www.google.com/search?q=secret+name',
        lp: '/courses/moisture?email=jo@example.test',
        at: '2026-10-23',
      })
    );

    await POST(requestWithCookie({ slug: COURSE_SLUG, customer_email: 'new@example.test' }, `carsi_ft=${smuggled}`));

    const md = mocks.createStripe.mock.calls[0][0].extra_metadata as Record<string, string>;
    expect(md.ft_lp).toBe('/courses/moisture');
    expect(JSON.stringify(md)).not.toMatch(/secret|@|\?/);
    for (const [key, value] of Object.entries(md)) {
      expect(key.length).toBeLessThanOrEqual(40);
      expect(value.length).toBeLessThanOrEqual(500);
    }
  });
});
