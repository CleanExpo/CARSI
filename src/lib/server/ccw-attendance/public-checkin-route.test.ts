import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  recordCheckIn: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  UNKNOWN_IP: 'unknown',
  applyRateLimit: vi
    .fn()
    .mockReturnValue({ ok: true, remaining: 19, resetAt: Date.now() + 60_000 }),
  clientIpFrom: vi.fn().mockReturnValue('192.0.2.1'),
}));

vi.mock('@/lib/server/ccw-attendance/flag', () => ({
  isCcwAttendanceEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/server/ccw-attendance/checkin-service', () => ({
  recordCheckIn: mocks.recordCheckIn,
}));

vi.mock('@/lib/server/ccw-attendance/checkin-token', () => ({
  verifyCheckInToken: vi.fn().mockResolvedValue({
    ok: true,
    scope: { eventSlug: 'melbourne', dayIndex: 1, dateStamp: '2026-07-22' },
  }),
}));

vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));
vi.mock('@/lib/server/turnstile', () => ({
  verifyTurnstileToken: vi.fn().mockResolvedValue({ ok: true }),
}));

const { POST } = await import('../../../../app/api/events/ccw-roadshow/checkin/route');

function request(): NextRequest {
  return new NextRequest('https://carsi.example.test/api/events/ccw-roadshow/checkin', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1' },
    body: JSON.stringify({
      token: 'synthetic-token',
      dayIndex: 1,
      fullName: 'Synthetic Attendee',
      email: 'attendee@example.test',
      turnstileToken: 'synthetic-turnstile',
    }),
  });
}

beforeEach(() => {
  process.env.DATABASE_URL = 'configured';
  mocks.recordCheckIn.mockReset();
});

describe('public CCW check-in receipt privacy', () => {
  it('returns pairwise byte-equivalent receipts for new, retry, and different-name collision outcomes', async () => {
    const outcomes = [
      {
        status: 'checked_in',
        signInId: 'sign-in-1',
        dayIndex: 1,
        created: true,
        isWalkIn: true,
        reconciledRegistration: false,
      },
      { status: 'already_checked_in', signInId: 'sign-in-1', dayIndex: 1, isWalkIn: true },
      { status: 'email_collision_different_name' },
    ] as const;

    const receipts: Array<{ status: number; body: string }> = [];
    for (const outcome of outcomes) {
      mocks.recordCheckIn.mockResolvedValueOnce(outcome);
      const response = await POST(request());
      receipts.push({ status: response.status, body: await response.text() });
    }

    expect(receipts[0]).toEqual(receipts[1]);
    expect(receipts[1]).toEqual(receipts[2]);
    expect(receipts[0].status).toBe(200);
    expect(receipts[0].body).not.toMatch(
      /checked_in|already_checked_in|email_in_use|dayIndex|attendee@example\.test|Synthetic Attendee/i
    );
    expect(mocks.recordCheckIn).toHaveBeenCalledTimes(3);
  });
});
