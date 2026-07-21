import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findAdmin: vi.fn(),
  recordAdminCheckIn: vi.fn(),
}));

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: vi.fn().mockResolvedValue({ email: 'admin@example.test' }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { adminUser: { findUnique: mocks.findAdmin } },
}));

vi.mock('@/lib/server/ccw-attendance/flag', () => ({
  isCcwAttendanceEnabled: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/server/ccw-attendance/admin-ops', () => ({
  applyCheckInCorrection: vi.fn(),
  findMergeCandidates: vi.fn(),
  listSignInsForEvent: vi.fn(),
  mergeDuplicateSignIns: vi.fn(),
  recordAdminCheckIn: mocks.recordAdminCheckIn,
}));

const { POST } = await import('../../../../app/api/admin/ccw-roadshow/sign-ins/route');

function assistedRequest(dayIndex: 1 | 2): NextRequest {
  return new NextRequest('https://carsi.example.test/api/admin/ccw-roadshow/sign-ins', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'admin_checkin',
      eventSlug: 'melbourne',
      dayIndex,
      fullName: 'Synthetic Attendee',
      email: 'attendee@example.test',
    }),
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  process.env.DATABASE_URL = 'configured';
  mocks.findAdmin.mockReset().mockResolvedValue({ id: 'admin-1' });
  mocks.recordAdminCheckIn.mockReset().mockResolvedValue({
    status: 'checked_in',
    signInId: 'sign-in-1',
    dayIndex: 1,
    created: true,
    isWalkIn: true,
    reconciledRegistration: false,
  });
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.DATABASE_URL;
});

describe('admin assisted attendance event-day boundary', () => {
  it.each([
    ['before Day 1 opens', '2026-07-21T13:59:59.999Z', 1],
    ['wrong configured day', '2026-07-21T14:00:00.000Z', 2],
    ['after Day 1 closes', '2026-07-22T14:00:00.000Z', 1],
  ] as const)(
    'denies %s before admin lookup or attendance write',
    async (_label, now, dayIndex) => {
      vi.setSystemTime(new Date(now));

      const response = await POST(assistedRequest(dayIndex));

      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ code: 'wrong_event_day' });
      expect(mocks.findAdmin).not.toHaveBeenCalled();
      expect(mocks.recordAdminCheckIn).not.toHaveBeenCalled();
    }
  );

  it('allows the Australia/Sydney midnight boundary for configured Day 1', async () => {
    vi.setSystemTime(new Date('2026-07-21T14:00:00.000Z'));

    const response = await POST(assistedRequest(1));

    expect(response.status).toBe(200);
    expect(mocks.findAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.recordAdminCheckIn).toHaveBeenCalledTimes(1);
  });
});
