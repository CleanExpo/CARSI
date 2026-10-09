import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ registration: vi.fn(), sync: vi.fn(), markSynced: vi.fn() }));
vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: vi.fn().mockResolvedValue({ email: 'admin@example.test' }),
}));
vi.mock('@/lib/server/ccw-roadshow-registry', () => ({
  getRoadshowRegistrationForCalendarSync: mocks.registration,
  setRegistrationCalendarSynced: mocks.markSynced,
}));
vi.mock('@/lib/server/ccw-roadshow-calendar', () => ({ addRegistrationToCalendar: mocks.sync }));
const { POST } = await import('../../../app/api/admin/ccw-roadshow/sync-calendar/route');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sync.mockResolvedValue(true);
});

function request() {
  return new NextRequest('https://carsi.example.test/api/admin/ccw-roadshow/sync-calendar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ registrationId: 'synthetic-registration' }),
  });
}

describe('October calendar sync fails closed without a configured event ID', () => {
  it('refuses before the credentials/provider helper or success marker', async () => {
    mocks.registration.mockResolvedValue({
      eventSlug: 'brisbane-2026-10-09',
      status: 'confirmed',
      contactEmail: 'person@example.test',
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      detail: 'Google Calendar is not configured for this event.',
    });
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.markSynced).not.toHaveBeenCalled();
  });

  it('preserves the historical Brisbane calendar target as a positive control', async () => {
    mocks.registration.mockResolvedValue({
      eventSlug: 'brisbane',
      status: 'confirmed',
      contactEmail: 'person@example.test',
    });
    expect((await POST(request())).status).toBe(200);
    expect(mocks.sync).toHaveBeenCalledWith({
      calendarEventId: '1nnfc9hv164f4882q09krd1ies',
      attendeeEmail: 'person@example.test',
    });
    expect(mocks.markSynced).toHaveBeenCalledWith('synthetic-registration');
  });
});
