import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  startJourney: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  clientIpFrom: vi.fn(() => '203.0.113.7'),
}));

vi.mock('@/lib/server/event-attribution', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server/event-attribution')>();
  return { ...actual, tryStartAttributionJourney: mocks.startJourney };
});

vi.mock('@/lib/server/turnstile', () => ({
  verifyTurnstileToken: mocks.verifyTurnstile,
}));

import { POST } from '../../../app/api/events/ccw-roadshow/checkout/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.applyRateLimit.mockReturnValue({ ok: false, remaining: 0, resetAt: Date.now() + 60_000 });
  mocks.verifyTurnstile.mockResolvedValue({ ok: true });
});

describe('CCW public registration attribution abuse control', () => {
  it('rejects an exhausted client-IP window before parsing or minting a fresh journey', async () => {
    const request = new NextRequest('https://carsi.com.au/api/events/ccw-roadshow/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: '{not-json',
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mocks.applyRateLimit).toHaveBeenCalledWith('203.0.113.7', 5, 60 * 60 * 1000);
    expect(mocks.startJourney).not.toHaveBeenCalled();
  });

  it('fails closed on an invalid Turnstile proof before registration or journey writes', async () => {
    mocks.applyRateLimit.mockReturnValue({ ok: true, remaining: 4, resetAt: Date.now() + 60_000 });
    mocks.verifyTurnstile.mockResolvedValue({ ok: false });
    const request = new NextRequest('https://carsi.com.au/api/events/ccw-roadshow/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7' },
      body: JSON.stringify({ turnstileToken: 'invalid-proof' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith('invalid-proof', '203.0.113.7');
    expect(mocks.startJourney).not.toHaveBeenCalled();
  });
});