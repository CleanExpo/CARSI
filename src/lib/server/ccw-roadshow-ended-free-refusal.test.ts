import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  sync: vi.fn(),
  email: vi.fn(),
  crm: vi.fn(),
  attribution: vi.fn(),
  token: vi.fn(),
}));
vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:crypto')>()),
  randomBytes: mocks.token,
}));
vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: vi.fn(() => ({ ok: true })),
  clientIpFrom: () => '192.0.2.1',
}));
vi.mock('@/lib/server/turnstile', () => ({
  verifyTurnstileToken: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/lib/server/ccw-roadshow-registry', () => ({
  createRoadshowRegistration: mocks.create,
  setRegistrationCalendarSynced: vi.fn(),
}));
vi.mock('@/lib/server/ccw-roadshow-calendar', () => ({ addRegistrationToCalendar: mocks.sync }));
vi.mock('@/lib/server/ccw-roadshow-email-log', () => ({ sendAndLogRoadshowEmail: mocks.email }));
vi.mock('@/lib/server/transactional-email', () => ({
  sendCcwRoadshowOrganizerNotificationEmail: mocks.email,
}));
vi.mock('@/lib/server/crm-sync', () => ({ emitCrmEvent: mocks.crm }));
vi.mock('@/lib/server/event-attribution', () => ({
  tryStartAttributionJourney: mocks.attribution,
  setAttributionJourneyCookie: vi.fn(),
}));
const { POST } = await import('../../../app/api/events/ccw-roadshow/checkout/route');

function melbourneCheckout() {
  return POST(
    new NextRequest('https://carsi.example.test/api/events/ccw-roadshow/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        eventSlug: 'melbourne',
        packageId: 'single',
        turnstileToken: 'synthetic',
        contactEmail: 'person@example.test',
        attendees: [
          { fullName: 'Synthetic Person', yearsExperience: '2-5', goals: 'Improve quoting' },
        ],
      }),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.token.mockReturnValue(Buffer.from([0xab, 0xcd, 0xef, 0x01]));
  mocks.create.mockResolvedValue({
    registrationId: 'reg-1',
    status: 'confirmed',
    seatCount: 1,
    remaining: 19,
  });
  mocks.sync.mockResolvedValue(false);
  mocks.attribution.mockResolvedValue(null);
});
afterEach(() => vi.useRealTimers());

describe('an ended free sitting cannot mint a free-entry token', () => {
  it('issues a token while the Melbourne sitting is open (positive control)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-01T00:00:00.000Z'));
    const response = await melbourneCheckout();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ free_entry_token: 'CCW-FREE-MEL-ABCDEF01' });
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it.each(['2026-07-23T06:30:00.000Z', '2026-10-19T00:00:00.000Z'])(
    'refuses a stale form or direct POST at %s with no token, write, email, calendar, CRM or attribution',
    async (instant) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(instant));
      const response = await melbourneCheckout();
      expect(response.status).toBe(409);
      const payload = await response.json();
      expect(payload.free_entry_token).toBeUndefined();
      expect(payload.booking_url).toBeUndefined();
      expect(payload.detail).toMatch(/ended/i);
      expect(payload.detail).not.toMatch(/free/i);
      for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
    }
  );
});
