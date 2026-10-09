import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ONBOARDING_COOKIE } from '@/lib/auth/onboarding-cookie';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  authorization: vi.fn(),
  upstream: vi.fn(),
  update: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('@/lib/server/auth-from-request', () => ({
  getSessionClaimsFromRequest: mocks.claims,
  getBearerAuthorizationFromRequest: mocks.authorization,
}));
vi.mock('@/lib/server/upstream-api', () => ({ getUpstreamBaseUrl: mocks.upstream }));
vi.mock('@/lib/prisma', () => ({ prisma: { lmsUser: { update: mocks.update } } }));

const { POST } = await import('../../../app/api/lms/auth/onboarding/route');

function request(body = '{}', contentType = 'application/json') {
  return new NextRequest('http://localhost/api/lms/auth/onboarding', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('onboarding acknowledgement durability', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.claims.mockResolvedValue({ sub: 'authenticated-learner' });
    mocks.authorization.mockReturnValue('Bearer synthetic-token');
    mocks.upstream.mockReturnValue(null);
    mocks.update.mockResolvedValue({ id: 'authenticated-learner' });
    vi.stubEnv('DATABASE_URL', 'postgresql://synthetic.invalid/onboarding_unit_test');
    vi.stubGlobal('fetch', mocks.fetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('requires authenticated claims before parsing or writing', async () => {
    mocks.claims.mockResolvedValue(null);
    const response = await POST(request('{invalid'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ detail: 'Unauthorized' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each(['', '  ', '{invalid', 'null', '[]', '[{}]', '"answers"', '42', 'true'])(
    'rejects invalid local top-level JSON %j without persistence or cookie',
    async (body) => {
      const response = await POST(request(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ detail: 'Invalid onboarding answers' });
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(mocks.update).not.toHaveBeenCalled();
      expect(mocks.fetch).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', '   '])('fails closed when the local database is %j', async (url) => {
    vi.stubEnv('DATABASE_URL', url);
    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ detail: 'Onboarding unavailable' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('does not acknowledge a pending save and only sets a cookie after it resolves', async () => {
    const save = deferred<{ id: string }>();
    const started = deferred<void>();
    mocks.update.mockImplementation(() => {
      started.resolve();
      return save.promise;
    });
    let acknowledged = false;
    const result = POST(request()).then((response) => {
      acknowledged = true;
      return response;
    });

    await started.promise;
    await Promise.resolve();
    expect(acknowledged).toBe(false);

    save.resolve({ id: 'authenticated-learner' });
    const response = await result;
    expect(response.status).toBe(200);
    expect(response.cookies.get(ONBOARDING_COOKIE)?.value).toBe('authenticated-learner');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it.each([
    new Error('private database connection information'),
    Object.assign(new Error('private missing user details'), { code: 'P2025' }),
  ])('returns a generic failure with no cookie when persistence rejects', async (error) => {
    mocks.update.mockRejectedValue(error);
    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ detail: 'Onboarding unavailable' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('persists normalised answers only for the authenticated identity', async () => {
    const response = await POST(
      request(JSON.stringify({
        user_id: 'another-user',
        id: 'another-user',
        sub: 'another-user',
        industry: 'healthcare',
        role: 7,
        iicrc_experience: 'experienced',
        primary_goal: 'cec_renewal',
        disciplines_held: [' amrt ', '', 7],
        renewal_date: '2026-11-01',
        resume_reminder_opt_in: 'email',
      })),
    );

    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'authenticated-learner' },
      data: {
        onboardingCompletedAt: expect.any(Date),
        onboarding: {
          industry: 'healthcare',
          role: '7',
          iicrc_experience: 'experienced',
          primary_goal: 'cec_renewal',
          disciplines_held: ['amrt', '7'],
          renewal_date: '2026-11-01',
          resume_reminder_opt_in: 'email',
        },
        resumeReminderOptIn: 'email',
        iicrcExpiryDate: new Date('2026-11-01T12:00:00.000Z'),
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      recommended_pathway: 'AMRT',
      pathway_label: 'Microbial remediation',
      pathway_description: expect.any(String),
      suggested_courses_url: '/dashboard/courses?discipline=AMRT',
    });
    expect(response.cookies.get(ONBOARDING_COOKIE)?.value).toBe('authenticated-learner');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each(['sms', 'unknown'])('preserves reminder normalisation for %s', async (reminder) => {
    await POST(request(JSON.stringify({
      disciplines_held: 'not-an-array',
      renewal_date: 'invalid-date',
      resume_reminder_opt_in: reminder,
    })));

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'authenticated-learner' },
      data: expect.objectContaining({
        resumeReminderOptIn: reminder === 'sms' ? 'sms' : 'none',
        onboarding: expect.objectContaining({ disciplines_held: [] }),
      }),
    });
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty('iicrcExpiryDate');
  });

  it('preserves upstream payload, status and content type without requiring a local database', async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    mocks.upstream.mockReturnValue('https://synthetic-upstream.invalid/');
    mocks.fetch.mockResolvedValue(new Response('upstream-result', {
      status: 201,
      headers: { 'content-type': 'text/plain' },
    }));
    const response = await POST(request('{upstream-owns-validation', 'application/custom'));

    expect(mocks.fetch).toHaveBeenCalledExactlyOnceWith(
      'https://synthetic-upstream.invalid/api/lms/auth/onboarding',
      {
        method: 'POST',
        headers: { authorization: 'Bearer synthetic-token', 'content-type': 'application/custom' },
        body: '{upstream-owns-validation',
        cache: 'no-store',
      },
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(await response.text()).toBe('upstream-result');
    expect(response.cookies.get(ONBOARDING_COOKIE)?.value).toBe('authenticated-learner');
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('preserves upstream rejection without a completion cookie', async () => {
    mocks.upstream.mockReturnValue('https://synthetic-upstream.invalid');
    mocks.authorization.mockReturnValue(null);
    mocks.fetch.mockResolvedValue(new Response('{"detail":"invalid answers"}', {
      status: 422,
      headers: { 'content-type': 'application/json' },
    }));
    const response = await POST(request(''));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ detail: 'invalid answers' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.fetch.mock.calls[0][1]).toMatchObject({
      body: undefined,
      headers: { authorization: '' },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('returns a generic 503 without a cookie when upstream fetch rejects', async () => {
    mocks.upstream.mockReturnValue('https://synthetic-upstream.invalid');
    mocks.fetch.mockRejectedValue(new Error('private upstream connection details'));
    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ detail: 'Onboarding unavailable' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
