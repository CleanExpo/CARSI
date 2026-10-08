import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  stripe: vi.fn(),
  courseCheckout: vi.fn(),
  onboardingCheckout: vi.fn(),
  portal: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({ checkout: { sessions: { create: mocks.stripe } } }),
  createPortalSession: mocks.portal,
}));
vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: async () => ({ sub: 'user-1', email: 'learner@example.test' }),
}));
vi.mock('@/lib/server/membership-checkout-guard', () => ({
  membershipCheckoutDecisionFor: async () => ({ allowed: true }),
}));
vi.mock('@/lib/server/membership-checkout-reservation', () => ({
  reserveMembershipCheckout: async () => 'reserved',
  reserveTeamCheckout: async () => 'reserved',
  releaseMembershipCheckout: vi.fn(),
  checkoutSessionExpiresAt: () => 1900000000,
  checkoutSessionIdempotencyKey: () => 'test-reservation',
}));
vi.mock('@/lib/server/subscription-price', () => ({
  resolveProAnnualPriceId: async () => 'price_test_annual',
}));
vi.mock('@/lib/server/team-subscription-price', () => ({
  resolveTeamTierPriceId: async () => 'price_test_team',
}));
vi.mock('@/lib/server/org-subscription-price', () => ({
  resolveOrgMonthlyPriceId: async () => 'price_test_org',
}));
vi.mock('@/lib/server/org-subscription-provision', () => ({
  provisionOrgSubscriptionContainer: async () => ({ ok: true, result: { teamId: 'team-1' } }),
}));
vi.mock('@/lib/server/teams', () => ({
  getTeamForUser: async () => ({ id: 'team-1', ownerId: 'user-1' }),
  ensureContainerTeamForOwner: vi.fn(),
}));
vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: () => null,
  tryRecordAttributedStage: async () => {},
}));
vi.mock('@/lib/server/local-course-checkout', () => ({
  resolveCheckoutEmail: async () => 'learner@example.test',
  createStripeCheckoutForCourse: mocks.courseCheckout,
}));
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseForCheckout: async () => ({
    title: 'Test course',
    price_aud: 49,
    is_free: false,
  }),
}));
vi.mock('@/lib/server/course-catalog-sync', () => ({
  getOrCreateCourseBySlug: async () => ({ id: 'course-1', priceAud: 49, isFree: false }),
}));
vi.mock('@/lib/server/first-lesson', () => ({
  getFirstLessonLearnPath: async () => '/dashboard/learn/test-course/first-lesson',
}));
vi.mock('@/lib/server/onboarding-programs', () => ({
  getOnboardingCourseBySlug: async () => ({
    id: 'course-1',
    title: 'Test onboarding',
    shortDescription: '',
    meta: null,
  }),
}));
// Keep the real URL builder: only payment delivery is mocked.
vi.mock('@/lib/server/onboarding-checkout', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./onboarding-checkout')>()),
  createOnboardingStripeCheckout: mocks.onboardingCheckout,
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsEnrollment: { findUnique: async () => null },
    lmsSubscription: { findUnique: async () => ({ stripeCustomerId: 'cus_test' }) },
    lmsUser: {
      findUnique: async () => ({
        email: 'learner@example.test',
        fullName: 'Learner',
        hashedPassword: '$2a$12$test',
      }),
    },
    lmsCourse: { findUnique: async () => ({ title: 'Test course' }) },
  },
}));
vi.mock('@/lib/server/email', () => ({
  isEmailConfigured: () => true,
  sendEmail: mocks.sendEmail,
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));

import { POST as individual } from '../../../app/api/lms/subscription/checkout/route';
import { POST as teams } from '../../../app/api/lms/subscription/teams/checkout/route';
import { POST as org } from '../../../app/api/lms/subscription/org/checkout/route';
import { POST as course } from '../../../app/api/lms/checkout/route';
import { POST as onboarding } from '../../../app/api/lms/onboarding/[slug]/checkout/route';
import { POST as portal } from '../../../app/api/lms/subscription/portal/route';
import { GET as logoutGet, POST as logoutPost } from '../../../app/api/auth/logout/route';
import { sendEnrollmentWelcomeEmail } from './transactional-email';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://carsi.com.au');
  vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:8080');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_synthetic');
  vi.stubEnv('DATABASE_URL', 'postgres://configured');
  vi.stubEnv('SUBSCRIPTIONS_ENABLED', 'true');
  vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'true');
  mocks.stripe.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.example.test/session' });
  mocks.courseCheckout.mockResolvedValue({ checkout_url: 'https://checkout.example.test/course' });
  mocks.onboardingCheckout.mockResolvedValue({
    checkout_url: 'https://checkout.example.test/onboarding',
  });
  mocks.portal.mockResolvedValue({ url: 'https://billing.example.test/session' });
  mocks.sendEmail.mockResolvedValue({ sent: true });
});
afterEach(() => vi.unstubAllEnvs());

function request(body: Record<string, unknown> = {}, host = 'localhost:8080') {
  return new NextRequest(`http://${host}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const routes = [
  {
    name: 'individual membership',
    run: individual,
    body: {},
    mock: mocks.stripe,
    success: '/dashboard/courses?membership=active',
    cancel: '/subscribe?checkout=cancelled',
  },
  {
    name: 'Teams membership',
    run: teams,
    body: { tier: 'starter' },
    mock: mocks.stripe,
    success: '/dashboard/team?membership=active',
    cancel: '/pricing?checkout=cancelled',
  },
  {
    name: 'organisation membership',
    run: org,
    body: { organisation_name: 'Test organisation' },
    mock: mocks.stripe,
    success: '/dashboard/team?org_subscription=active',
    cancel: '/pricing?checkout=cancelled',
  },
  {
    name: 'one-off course',
    run: course,
    body: { slug: 'test-course' },
    mock: mocks.courseCheckout,
    success:
      '/courses/test-course/payment-success?session_id={CHECKOUT_SESSION_ID}&next=%2Fdashboard%2Flearn%2Ftest-course%2Ffirst-lesson',
    cancel: '/courses/test-course',
  },
  {
    name: 'one-off team seats',
    run: course,
    body: { slug: 'test-course', purchase_mode: 'team', team_seat_count: 3 },
    mock: mocks.courseCheckout,
    success:
      '/dashboard/team?session_id={CHECKOUT_SESSION_ID}&from_purchase=1&course=test-course&seats=3',
    cancel: '/courses/test-course',
  },
  {
    name: 'onboarding organisation subscription',
    run: (req: NextRequest) =>
      onboarding(req, { params: Promise.resolve({ slug: 'test-course' }) }),
    body: {},
    mock: mocks.stripe,
    success: '/dashboard/onboarding/test-course?session_id={CHECKOUT_SESSION_ID}',
    cancel: '/dashboard/onboarding/test-course?checkout=cancelled',
  },
  {
    name: 'one-off onboarding',
    run: (req: NextRequest) =>
      onboarding(req, { params: Promise.resolve({ slug: 'test-course' }) }),
    body: {},
    mock: mocks.onboardingCheckout,
    oneOff: true,
    success: '/dashboard/onboarding/test-course?session_id={CHECKOUT_SESSION_ID}',
    cancel: '/dashboard/onboarding/test-course?checkout=cancelled',
  },
];

describe.each(routes)('$name production checkout returns', (route) => {
  it.each([
    {
      name: 'configured public URL',
      appUrl: 'https://carsi.com.au',
      host: 'localhost:8080',
      overrides: {},
    },
    { name: 'no public URL', appUrl: '', host: '0.0.0.0:8080', overrides: {} },
    {
      name: 'configured localhost',
      appUrl: 'https://localhost:8080',
      host: 'localhost:8080',
      overrides: {},
    },
    {
      name: 'client localhost overrides',
      appUrl: 'https://carsi.com.au',
      host: 'localhost:8080',
      overrides: {
        success_url: 'https://localhost:8080/success',
        cancel_url: 'http://127.0.0.1:8080/cancel',
      },
    },
  ])('uses public success and cancel URLs with $name', async ({ appUrl, host, overrides }) => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', appUrl);
    if (route.oneOff) vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'false');
    const response = await route.run(request({ ...route.body, ...overrides }, host));
    expect(response.status).toBe(200);
    expect(route.mock).toHaveBeenCalledTimes(1);
    const params = route.mock.mock.calls[0][0];
    const success = params.success_url ?? params.successUrl;
    const cancel = params.cancel_url ?? params.cancelUrl;
    expect(success).toBe(`https://carsi.com.au${route.success}`);
    expect(cancel).toBe(`https://carsi.com.au${route.cancel}`);
    for (const value of [success, cancel]) expect(new URL(value).hostname).toBe('carsi.com.au');
  });

  it('preserves public client return paths and the literal Stripe placeholder', async () => {
    if (route.oneOff) vi.stubEnv('TEAMS_SUBSCRIPTIONS_ENABLED', 'false');
    const success = 'https://carsi.com.au/custom-success?session_id={CHECKOUT_SESSION_ID}';
    const cancel = 'https://carsi.com.au/custom-cancel';
    expect(
      (await route.run(request({ ...route.body, success_url: success, cancel_url: cancel }))).status
    ).toBe(200);
    const params = route.mock.mock.calls[0][0];
    expect(params.success_url ?? params.successUrl).toBe(success);
    expect(params.cancel_url ?? params.cancelUrl).toBe(cancel);
  });
});

it.each(['GET', 'POST'])(
  'logout %s redirects HTML callers to the public login and clears session cookies',
  async (method) => {
    const req = new NextRequest('http://localhost:8080/api/auth/logout', {
      method,
      headers: { accept: 'text/html' },
    });
    const response = await (method === 'GET' ? logoutGet : logoutPost)(req);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://carsi.com.au/login');
    expect(response.cookies.get('auth_token')?.value).toBe('');
    expect(response.cookies.get('carsi_token')?.value).toBe('');
  }
);

it('logout still returns JSON to API callers', async () => {
  const response = await logoutPost(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ success: true });
});

it('billing portal returns to the public dashboard even with a localhost override', async () => {
  expect((await portal(request({ return_url: 'http://localhost:8080/dashboard' }))).status).toBe(
    200
  );
  expect(mocks.portal.mock.calls[0][0].return_url).toBe('https://carsi.com.au/dashboard/courses');
});

it.each(['https://carsi.com.au', '', 'http://localhost:8080'])(
  'enrolment email uses public Start and dashboard links with app URL %s',
  async (appUrl) => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', appUrl);
    await sendEnrollmentWelcomeEmail({
      studentId: 'user-1',
      courseSlug: 'test-course',
      appOrigin: 'https://localhost:8080',
    });
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const email = mocks.sendEmail.mock.calls[0][0];
    for (const content of [email.html, email.text]) {
      expect(content).toContain('https://carsi.com.au/dashboard/learn/test-course/first-lesson');
      expect(content).toContain('https://carsi.com.au/dashboard/student');
      expect(content).not.toContain('localhost');
    }
  }
);
