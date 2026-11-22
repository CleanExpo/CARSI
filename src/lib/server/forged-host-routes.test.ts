/**
 * GP-700: a request whose Host (or X-Forwarded-Host) names another site must never put that
 * site into an email link, a redirect or a Stripe return URL. Each route below is called with
 * a request for https://evil.example and must answer with the configured canonical origin.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CANONICAL = 'https://carsi.com.au';
const FORGED = 'https://evil.example';

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  sendReset: vi.fn(),
  sendWelcome: vi.fn(),
  register: vi.fn(),
  claimsFromRequest: vi.fn(),
  createCoachingCheckout: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsUser: { findUnique: mocks.findUser } },
}));

vi.mock('@/lib/auth/session-jwt', () => ({
  signPasswordResetToken: vi.fn().mockResolvedValue('reset-token'),
  signEmailVerificationToken: vi.fn().mockResolvedValue('verify-token'),
  signSessionToken: vi.fn().mockResolvedValue('session-token'),
}));

vi.mock('@/lib/server/auth-email', () => ({
  isEmailConfigured: () => true,
  sendPasswordResetEmail: mocks.sendReset,
  sendRegistrationWelcomeEmail: mocks.sendWelcome,
}));

vi.mock('@/lib/server/lms-auth', () => ({
  registerUserWithPassword: mocks.register,
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: mocks.claimsFromRequest,
}));

vi.mock('@/lib/server/carsi-coaching-monthly-flag', () => ({
  isCarsiCoachingMonthlyEnabled: () => true,
}));

vi.mock('@/lib/server/carsi-coaching-monthly-checkout', () => ({
  createCarsiCoachingMonthlyCheckoutSession: mocks.createCoachingCheckout,
}));

const logout = await import('../../../app/api/auth/logout/route');
const forgot = await import('../../../app/api/auth/forgot-password/route');
const register = await import('../../../app/api/auth/register/route');
const coaching = await import('../../../app/api/coaching/monthly/checkout/route');

function forgedRequest(path: string, init?: { method?: string; body?: unknown; accept?: string }) {
  return new NextRequest(`${FORGED}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      host: 'evil.example',
      'x-forwarded-host': 'evil.example',
      'x-forwarded-proto': 'https',
      'content-type': 'application/json',
      // A unique address per request keeps the in-memory rate limiter out of the way.
      'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 250) + 1}`,
      ...(init?.accept ? { accept: init.accept } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  vi.stubEnv('NEXT_PUBLIC_FRONTEND_URL', '');
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('VERCEL_URL', 'carsi-abc123.vercel.app');
  vi.stubEnv('VERCEL_BRANCH_URL', '');
  vi.stubEnv('DATABASE_URL', 'postgres://test');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_placeholder');
  mocks.findUser.mockReset();
  mocks.sendReset.mockReset().mockResolvedValue({ sent: true });
  mocks.sendWelcome.mockReset().mockResolvedValue({ sent: true });
  mocks.register.mockReset();
  mocks.claimsFromRequest.mockReset();
  mocks.createCoachingCheckout
    .mockReset()
    .mockResolvedValue({ checkout_url: 'https://checkout.stripe.com/c/pay/cs_test' });
});
afterEach(() => vi.unstubAllEnvs());

describe('GP-700 forged Host header', () => {
  it('logout redirects to the canonical origin (GET and POST)', async () => {
    const get = await logout.GET(forgedRequest('/api/auth/logout'));
    expect(get.headers.get('location')).toBe(`${CANONICAL}/login`);
    const post = await logout.POST(
      forgedRequest('/api/auth/logout', { method: 'POST', accept: 'text/html' })
    );
    expect(post.headers.get('location')).toBe(`${CANONICAL}/login`);
  });

  it('password-reset email links use the canonical origin', async () => {
    mocks.findUser.mockResolvedValue({ id: 'u1', isActive: true, fullName: 'Test Person' });
    const res = await forgot.POST(
      forgedRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email: 'person@example.com' },
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.sendReset).toHaveBeenCalledTimes(1);
    const arg = mocks.sendReset.mock.calls[0][0] as { resetLink: string; appOrigin: string };
    expect(arg.resetLink.startsWith(`${CANONICAL}/reset-password?token=`)).toBe(true);
    expect(arg.appOrigin).toBe(CANONICAL);
  });

  it('registration welcome and email-verification links use the canonical origin', async () => {
    mocks.register.mockResolvedValue({
      ok: true,
      claims: { sub: 'u2', email: 'new@example.com', full_name: 'New Person', role: 'student' },
    });
    const res = await register.POST(
      forgedRequest('/api/auth/register', {
        method: 'POST',
        body: { email: 'new@example.com', password: 'A-long-Passw0rd!x', full_name: 'New Person' },
      })
    );
    expect(res.status).toBe(200);
    expect(mocks.sendWelcome).toHaveBeenCalledTimes(1);
    const arg = mocks.sendWelcome.mock.calls[0][0] as {
      dashboardUrl: string;
      appOrigin: string;
      confirmUrl?: string;
    };
    expect(arg.appOrigin).toBe(CANONICAL);
    expect(arg.dashboardUrl).toBe(`${CANONICAL}/dashboard/student`);
    expect(arg.confirmUrl?.startsWith(`${CANONICAL}/confirm-email?token=`)).toBe(true);
  });

  it('Stripe success and cancel URLs use the canonical origin, ignoring a foreign return URL', async () => {
    mocks.claimsFromRequest.mockResolvedValue({ sub: 'u3', email: 'c@example.com', full_name: 'C' });
    const res = await coaching.POST(
      forgedRequest('/api/coaching/monthly/checkout', {
        method: 'POST',
        body: { success_url: `${FORGED}/paid`, cancel_url: `${FORGED}/cancelled` },
      })
    );
    expect(res.status).toBe(200);
    const arg = mocks.createCoachingCheckout.mock.calls[0][0] as {
      appOrigin: string;
      successUrl: string;
      cancelUrl: string;
    };
    expect(arg.appOrigin).toBe(CANONICAL);
    expect(new URL(arg.successUrl).origin).toBe(CANONICAL);
    expect(new URL(arg.cancelUrl).origin).toBe(CANONICAL);
  });

  it('Stripe default success and cancel URLs use the canonical origin', async () => {
    mocks.claimsFromRequest.mockResolvedValue({ sub: 'u4', email: 'd@example.com', full_name: 'D' });
    await coaching.POST(forgedRequest('/api/coaching/monthly/checkout', { method: 'POST', body: {} }));
    const arg = mocks.createCoachingCheckout.mock.calls[0][0] as {
      successUrl: string;
      cancelUrl: string;
    };
    expect(arg.successUrl.startsWith(`${CANONICAL}/`)).toBe(true);
    expect(arg.cancelUrl.startsWith(`${CANONICAL}/`)).toBe(true);
  });
});
