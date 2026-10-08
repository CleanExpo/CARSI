import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ record: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  UNKNOWN_IP: 'unknown',
  applyRateLimit: vi.fn(() => ({ ok: true })),
  clientIpFrom: () => '192.0.2.1',
}));
vi.mock('@/lib/server/ccw-attendance/flag', () => ({ isCcwAttendanceEnabled: () => true }));
vi.mock('@/lib/server/ccw-attendance/checkin-service', () => ({ recordCheckIn: mocks.record }));
vi.mock('@/lib/server/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/server/sentry', () => ({ captureServerError: vi.fn() }));

const { mintCheckInToken } = await import('./checkin-token');
const { POST } = await import('../../../../app/api/events/ccw-roadshow/checkin/route');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
  vi.stubEnv('DATABASE_URL', 'synthetic-not-connected');
  mocks.record.mockReset().mockResolvedValue({ status: 'checked_in' });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function request(token: string, dayIndex = 1) {
  return new NextRequest('https://carsi.example.test/api/events/ccw-roadshow/checkin', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token,
      dayIndex,
      eventSlug: 'brisbane',
      timeZone: 'Australia/Sydney',
      fullName: 'Synthetic Person',
      email: 'person@example.test',
      turnstileToken: 'synthetic',
    }),
  });
}

describe('public October check-in uses only the authenticated occurrence and day', () => {
  it('cannot be redirected to September by client event/timezone fields', async () => {
    const token = await mintCheckInToken({ eventSlug: 'brisbane-2026-10-09', dayIndex: 1 });
    vi.setSystemTime(new Date('2026-10-09T13:30:00Z'));
    expect((await POST(request(token))).status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith(
      expect.objectContaining({ eventSlug: 'brisbane-2026-10-09', dayIndex: 1 })
    );
  });

  it('rejects a conflicting day before any attendance write', async () => {
    const token = await mintCheckInToken({ eventSlug: 'brisbane-2026-10-09', dayIndex: 1 });
    const response = await POST(request(token, 2));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'day_mismatch' });
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('rejects a real September QR at October attendance without writes', async () => {
    vi.setSystemTime(new Date('2026-09-11T02:00:00Z'));
    const token = await mintCheckInToken({ eventSlug: 'brisbane', dayIndex: 1 });
    vi.setSystemTime(new Date('2026-10-09T02:00:00Z'));
    expect((await POST(request(token))).status).toBe(403);
    expect(mocks.record).not.toHaveBeenCalled();
  });
});
