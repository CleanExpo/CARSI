import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
  readJourney: vi.fn(),
  recordStage: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: mocks.applyRateLimit,
  clientIpFrom: vi.fn(() => '203.0.113.7'),
}));

vi.mock('@/lib/server/event-attribution', () => ({
  readAttributionJourneyId: mocks.readJourney,
  tryRecordAttributedStage: mocks.recordStage,
}));

import { POST } from '../../../app/api/analytics/attribution/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readJourney.mockReturnValue('44444444-4444-4444-8444-444444444444');
  mocks.applyRateLimit.mockReturnValue({ ok: true, remaining: 19, resetAt: Date.now() + 60_000 });
  mocks.recordStage.mockResolvedValue(true);
});

describe('POST /api/analytics/attribution', () => {
  it('rate-limits repeated ingestion before parsing or writing', async () => {
    mocks.applyRateLimit.mockReturnValue({ ok: false, remaining: 0, resetAt: Date.now() + 60_000 });
    const request = new NextRequest('https://carsi.com.au/api/analytics/attribution', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ courseSlug: 'course-a' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(429);
    expect(mocks.recordStage).not.toHaveBeenCalled();
  });

  it('rejects non-JSON cross-site form submissions', async () => {
    const request = new NextRequest('https://carsi.com.au/api/analytics/attribution', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'courseSlug=course-a',
    });

    const response = await POST(request);

    expect(response.status).toBe(415);
    expect(mocks.recordStage).not.toHaveBeenCalled();
  });
});
