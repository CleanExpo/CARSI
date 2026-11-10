import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderRegistrationWelcomeEmail } from '@/lib/server/email-templates';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  sendWelcome: vi.fn(),
  signSession: vi.fn(),
  signVerify: vi.fn(),
}));

vi.mock('@/lib/server/lms-auth', () => ({
  registerUserWithPassword: mocks.register,
}));
vi.mock('@/lib/server/auth-email', () => ({
  sendRegistrationWelcomeEmail: mocks.sendWelcome,
}));
vi.mock('@/lib/auth/session-jwt', () => ({
  signSessionToken: mocks.signSession,
  signEmailVerificationToken: mocks.signVerify,
}));

const { POST } = await import('../../../app/api/auth/register/route');

const CONFIRM_URL = 'https://carsi.example.test/confirm-email?token=abc.def.ghi';

describe('registration welcome email template (GP-699)', () => {
  it('carries the confirm link in the HTML and the plain-text body', () => {
    const { html, text } = renderRegistrationWelcomeEmail({
      appOrigin: 'https://carsi.example.test',
      name: 'Sam',
      dashboardUrl: 'https://carsi.example.test/dashboard/student',
      confirmUrl: CONFIRM_URL,
    });

    expect(html).toContain(CONFIRM_URL);
    expect(html).toContain('Confirm my email');
    expect(text).toContain(CONFIRM_URL);
    expect(html).toContain('https://carsi.example.test/dashboard/student');
  });

  it('still renders the dashboard button when no confirm link is supplied', () => {
    const { html } = renderRegistrationWelcomeEmail({
      appOrigin: 'https://carsi.example.test',
      name: 'Sam',
      dashboardUrl: 'https://carsi.example.test/dashboard/student',
    });

    expect(html).toContain('Go to my dashboard');
    expect(html).not.toContain('Confirm my email');
  });
});

describe('POST /api/auth/register (GP-699)', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://configured';
    for (const m of Object.values(mocks)) m.mockReset();
    mocks.register.mockResolvedValue({
      ok: true,
      claims: { sub: 'user-1', email: 'student@example.test', full_name: 'Sam', role: 'student' },
    });
    mocks.sendWelcome.mockResolvedValue({ sent: true });
    mocks.signSession.mockResolvedValue('jwt-session');
    mocks.signVerify.mockResolvedValue('abc.def.ghi');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  function request(ip: string): NextRequest {
    return new NextRequest('https://carsi.example.test/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({
        email: 'student@example.test',
        password: 'A-strong-pass-9',
        full_name: 'Sam',
      }),
    });
  }

  it('sends the welcome email with a confirm link signed for the new account and address', async () => {
    const res = await POST(request('203.0.113.10'));

    expect(res.status).toBe(200);
    expect(mocks.signVerify).toHaveBeenCalledWith('user-1', 'student@example.test');
    expect(mocks.sendWelcome).toHaveBeenCalledTimes(1);
    expect(mocks.sendWelcome.mock.calls[0][0]).toMatchObject({
      to: 'student@example.test',
      confirmUrl: CONFIRM_URL,
    });
  });

  it('still registers the student when the confirm link cannot be signed', async () => {
    mocks.signVerify.mockRejectedValue(new Error('no secret'));

    const res = await POST(request('203.0.113.11'));

    expect(res.status).toBe(200);
    expect(mocks.sendWelcome).toHaveBeenCalledTimes(1);
    expect(mocks.sendWelcome.mock.calls[0][0].confirmUrl).toBeUndefined();
  });
});
