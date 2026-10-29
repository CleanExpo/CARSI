/**
 * Route cover for `POST /api/lms/checkout/survey` (Authority Machine slice 1b).
 * Answers are written to the PaymentIntent metadata, once, only for a paid session, and only
 * from the browser that started that checkout (signed `carsi_svy` cookie). A session id alone
 * is not enough: it appears in the success URL and could be shared or leaked.
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stripe = vi.hoisted(() => ({
  retrieveSession: vi.fn(),
  retrievePI: vi.fn(),
  updatePI: vi.fn(),
}));

vi.mock('@/lib/api/stripe', () => ({
  getStripeClient: () => ({
    checkout: { sessions: { retrieve: stripe.retrieveSession } },
    paymentIntents: { retrieve: stripe.retrievePI, update: stripe.updatePI },
  }),
}));

const { POST } = await import('../../../app/api/lms/checkout/survey/route');
const { PURCHASE_SURVEY_COOKIE_NAME, PURCHASE_SURVEY_TOKEN_TTL_SECONDS, signPurchaseSurveyToken } =
  await import('@/lib/server/purchase-survey-token');

const FLAG = 'PURCHASE_SURVEY_ENABLED';
const SESSION = 'cs_test_paid';

function post(body: unknown, cookie: string | null = validCookie()): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout/survey', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function validCookie(sessionId = SESSION, issuedAt = new Date()): string {
  return `${PURCHASE_SURVEY_COOKIE_NAME}=${signPurchaseSurveyToken(sessionId, issuedAt)}`;
}

const GOOD = { session_id: SESSION, industry: 'commercial_cleaning', found_via: 'google_search' };

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env[FLAG] = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  stripe.retrieveSession.mockReset();
  stripe.retrieveSession.mockResolvedValue({ id: SESSION, payment_status: 'paid', payment_intent: 'pi_test_1' });
  stripe.retrievePI.mockReset();
  stripe.retrievePI.mockResolvedValue({ id: 'pi_test_1', metadata: {} });
  stripe.updatePI.mockReset();
  stripe.updatePI.mockResolvedValue({ id: 'pi_test_1' });
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  delete process.env[FLAG];
  errorSpy.mockRestore();
});

describe('authorisation: the browser that started checkout', () => {
  it('valid cookie for this session -> 200 and saved', async () => {
    const res = await POST(post(GOOD));
    expect(res.status).toBe(200);
    expect(stripe.updatePI).toHaveBeenCalledTimes(1);
  });

  it('no cookie -> 403, no Stripe call', async () => {
    const res = await POST(post(GOOD, null));
    expect(res.status).toBe(403);
    expect(stripe.retrieveSession).not.toHaveBeenCalled();
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it('cookie issued for another session -> 403, no Stripe call', async () => {
    const res = await POST(post(GOOD, validCookie('cs_test_other')));
    expect(res.status).toBe(403);
    expect(stripe.retrieveSession).not.toHaveBeenCalled();
  });

  it('expired cookie -> 403, no Stripe call', async () => {
    const issued = new Date(Date.now() - (PURCHASE_SURVEY_TOKEN_TTL_SECONDS + 60) * 1000);
    const res = await POST(post(GOOD, validCookie(SESSION, issued)));
    expect(res.status).toBe(403);
    expect(stripe.retrieveSession).not.toHaveBeenCalled();
  });

  it('a cookie holding several checkouts authorises each of them', async () => {
    const { nextPurchaseSurveyCookie } = await import('@/lib/server/purchase-survey-token');
    const both = nextPurchaseSurveyCookie(nextPurchaseSurveyCookie(undefined, SESSION), 'cs_test_later');
    const res = await POST(post(GOOD, `${PURCHASE_SURVEY_COOKIE_NAME}=${encodeURIComponent(both)}`));
    expect(res.status).toBe(200);
  });

  it('forged cookie -> 403', async () => {
    const res = await POST(post(GOOD, `${PURCHASE_SURVEY_COOKIE_NAME}=9999999999.deadbeef`));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/lms/checkout/survey', () => {
  it('saves allowlisted answers onto the PaymentIntent metadata', async () => {
    const res = await POST(post(GOOD));
    expect(res.status).toBe(200);
    const [id, params] = stripe.updatePI.mock.calls[0];
    expect(id).toBe('pi_test_1');
    expect(params.metadata).toEqual({
      svy_ind: 'commercial_cleaning',
      svy_via: 'google_search',
      svy_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('accepts an expanded payment_intent object', async () => {
    stripe.retrieveSession.mockResolvedValue({
      id: SESSION,
      payment_status: 'paid',
      payment_intent: { id: 'pi_obj', metadata: {} },
    });
    stripe.retrievePI.mockResolvedValue({ id: 'pi_obj', metadata: {} });
    const res = await POST(post(GOOD));
    expect(res.status).toBe(200);
    expect(stripe.updatePI.mock.calls[0][0]).toBe('pi_obj');
  });

  it('T1b-1: an unpaid session is refused with 400 and nothing is written', async () => {
    stripe.retrieveSession.mockResolvedValue({ id: SESSION, payment_status: 'unpaid', payment_intent: 'pi_x' });
    const res = await POST(post(GOOD));
    expect(res.status).toBe(400);
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it('T1b-1: an unknown session id is refused with 400 and nothing is written', async () => {
    stripe.retrieveSession.mockRejectedValue(new Error('No such checkout.session'));
    const res = await POST(post(GOOD));
    expect(res.status).toBe(400);
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it('a paid session with no PaymentIntent is refused with 409 and nothing is written', async () => {
    stripe.retrieveSession.mockResolvedValue({ id: SESSION, payment_status: 'paid', payment_intent: null });
    const res = await POST(post(GOOD));
    expect(res.status).toBe(409);
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it.each([
    ['missing session id', { industry: 'commercial_cleaning' }],
    ['industry off the allowlist', { ...GOOD, industry: 'astronaut' }],
    ['found_via off the allowlist', { ...GOOD, found_via: 'tiktok' }],
    ['nothing answered', { session_id: SESSION }],
  ])('T1b-2: %s -> 400 with no Stripe call', async (_label, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(stripe.retrieveSession).not.toHaveBeenCalled();
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it('T1b-3: typed text never reaches metadata; Other stores only the word other', async () => {
    const res = await POST(
      post({
        ...GOOD,
        industry: 'other',
        industry_other: 'Jo Citizen 0412 345 678',
        found_via: 'other',
        found_via_other: 'jo@example.test',
        note: 'free text',
      })
    );
    expect(res.status).toBe(200);
    const md = stripe.updatePI.mock.calls[0][1].metadata as Record<string, string>;
    expect(md).toEqual({ svy_ind: 'other', svy_via: 'other', svy_at: expect.any(String) });
    expect(JSON.stringify(md)).not.toMatch(/Jo|0412|@|free/);
  });

  it('T1b-4: a second submit keeps the first answer and returns 200', async () => {
    stripe.retrievePI.mockResolvedValue({
      id: 'pi_test_1',
      metadata: { svy_ind: 'restoration_technician', svy_at: '2026-10-28' },
    });
    const res = await POST(post({ ...GOOD, industry: 'commercial_cleaning' }));
    expect(res.status).toBe(200);
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it('writes with an idempotency key derived from the PaymentIntent id', async () => {
    await POST(post(GOOD));
    expect(stripe.updatePI.mock.calls[0][2]).toEqual({ idempotencyKey: 'carsi-purchase-survey-pi_test_1' });
  });

  it('two concurrent submissions write once; the loser gets 200 without changing the answer', async () => {
    // Both read the intent before either writes, so both pass the svy_at check. Stripe's
    // idempotency key makes the second (different) request fail instead of overwriting.
    let calls = 0;
    stripe.updatePI.mockImplementation(async () => {
      calls += 1;
      if (calls === 1) return { id: 'pi_test_1' };
      const err = new Error('Keys for idempotent requests can only be used with the same parameters');
      Object.assign(err, { type: 'StripeIdempotencyError' });
      throw err;
    });
    const [a, b] = await Promise.all([
      POST(post(GOOD)),
      POST(post({ ...GOOD, industry: 'builder_trade' })),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(stripe.updatePI).toHaveBeenCalledTimes(2);
    const keys = stripe.updatePI.mock.calls.map((c) => c[2]?.idempotencyKey);
    expect(new Set(keys)).toEqual(new Set(['carsi-purchase-survey-pi_test_1']));
  });

  it('T1b-5: flag off -> 404 and no Stripe call', async () => {
    delete process.env[FLAG];
    const res = await POST(post(GOOD));
    expect(res.status).toBe(404);
    expect(stripe.retrieveSession).not.toHaveBeenCalled();
  });

  it('T1b-6: the Stripe update throwing becomes a soft 502, and no answer is logged', async () => {
    stripe.updatePI.mockRejectedValue(new Error('Stripe unavailable'));
    const res = await POST(post(GOOD));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { detail?: string };
    expect(body.detail).toBeTruthy();
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain('commercial_cleaning');
    expect(logged).not.toContain('google_search');
  });

  it('a malformed JSON body is 400', async () => {
    const req = new NextRequest('https://carsi.example.test/api/lms/checkout/survey', {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: validCookie() },
      body: '{not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
