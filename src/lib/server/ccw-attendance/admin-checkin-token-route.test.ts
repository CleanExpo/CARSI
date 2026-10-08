import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeJwt } from 'jose';

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: vi.fn().mockResolvedValue({ email: 'admin@example.test' }),
}));
vi.mock('@/lib/server/ccw-attendance/flag', () => ({
  isCcwAttendanceEnabled: vi.fn().mockReturnValue(true),
}));

const { POST } = await import('../../../../app/api/admin/ccw-roadshow/checkin-token/route');

afterEach(() => vi.useRealTimers());

function request(eventSlug: string, dayIndex: 1 | 2) {
  return new NextRequest('https://carsi.example.test/api/admin/ccw-roadshow/checkin-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventSlug,
      dayIndex,
      timeZone: 'Australia/Sydney',
      dateStamp: '2026-10-10',
    }),
  });
}

describe('admin October QR mint', () => {
  it('ignores client zone/date overrides and mints the canonical Brisbane day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T13:30:00Z'));
    const response = await POST(request('brisbane-2026-10-09', 1));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dateStamp).toBe('2026-10-09');
    expect(body.eventSlug).toBe('brisbane-2026-10-09');
    expect(decodeJwt(body.token)).toMatchObject({
      sub: 'brisbane-2026-10-09',
      dateStamp: '2026-10-09',
      dayIndex: 1,
    });
  });

  it.each([
    ['brisbane-2026-10-09', 1, '2026-10-09T14:00:00Z'],
    ['brisbane-2026-10-09', 2, '2026-10-09T13:30:00Z'],
    ['brisbane', 1, '2026-10-09T13:30:00Z'],
  ] as const)(
    'denies the wrong day or historical occurrence (%s, Day %s)',
    async (eventSlug, dayIndex, now) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(now));
      const response = await POST(request(eventSlug, dayIndex));
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: 'wrong_event_day' });
    }
  );
});
