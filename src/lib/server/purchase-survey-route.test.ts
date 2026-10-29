/**
 * Route cover for `POST /api/lms/checkout/survey` (Authority Machine slice 1b).
 * Answers are written to the PaymentIntent metadata, once, only for a paid session.
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

const FLAG = 'PURCHASE_SURVEY_ENABLED';

function post(body: unknown): NextRequest {
  return new NextRequest('https://carsi.example.test/api/lms/checkout/survey', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const GOOD = { session_id: 'cs_test_paid', industry: 'commercial_cleaning', found_via: 'google_search' };

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env[FLAG] = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_synthetic';
  stripe.retrieveSession.mockReset();
  stripe.retrieveSession.mockResolvedValue({ id: 'cs_test_paid', payment_status: 'paid', payment_intent: 'pi_test_1' });
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

describe('POST /api/lms/checkout/survey', () => {
  it('saves allowlisted answers onto the PaymentIntent metadata', async () => {
    const res = await POST(post(GOOD));
    expect(res.status).toBe(200);
    expect(stripe.updatePI).toHaveBeenCalledTimes(1);
    const [id, params] = stripe.updatePI.mock.calls[0];
    expect(id).toBe('pi_test_1');
    expect(params.metadata).toMatchObject({ svy_ind: 'commercial_cleaning', svy_via: 'google_search' });
    expect(params.metadata.svy_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(JSON.stringify(params.metadata)).not.toMatch(/@|email|name/i);
  });

  it('accepts an expanded payment_intent object', async () => {
    stripe.retrieveSession.mockResolvedValue({
      id: 'cs_test_paid',
      payment_status: 'paid',
      payment_intent: { id: 'pi_obj', metadata: {} },
    });
    stripe.retrievePI.mockResolvedValue({ id: 'pi_obj', metadata: {} });
    const res = await POST(post(GOOD));
    expect(res.status).toBe(200);
    expect(stripe.updatePI.mock.calls[0][0]).toBe('pi_obj');
  });

  it('T1b-1: an unpaid session is refused with 400 and nothing is written', async () => {
    stripe.retrieveSession.mockResolvedValue({ id: 'cs_x', payment_status: 'unpaid', payment_intent: 'pi_x' });
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
    stripe.retrieveSession.mockResolvedValue({ id: 'cs_x', payment_status: 'paid', payment_intent: null });
    const res = await POST(post(GOOD));
    expect(res.status).toBe(409);
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it.each([
    ['missing session id', { industry: 'commercial_cleaning' }],
    ['industry off the allowlist', { ...GOOD, industry: 'astronaut' }],
    ['found_via off the allowlist', { ...GOOD, found_via: 'tiktok' }],
    ['nothing answered', { session_id: 'cs_test_paid' }],
  ])('T1b-2: %s -> 400 with no Stripe call', async (_label, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(stripe.retrieveSession).not.toHaveBeenCalled();
    expect(stripe.updatePI).not.toHaveBeenCalled();
  });

  it('T1b-3: other text with markup is stored cleaned, an email-shaped one is rejected', async () => {
    let res = await POST(post({ ...GOOD, industry: 'other', industry_other: '<i>Pest</i> control' }));
    expect(res.status).toBe(200);
    expect(stripe.updatePI.mock.calls[0][1].metadata.svy_ind_other).toBe('Pest control');

    stripe.updatePI.mockClear();
    res = await POST(post({ ...GOOD, industry: 'other', industry_other: 'jo.citizen@example.com' }));
    expect(res.status).toBe(400);
    expect(stripe.updatePI).not.toHaveBeenCalled();
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
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
