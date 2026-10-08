import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

beforeEach(() => vi.clearAllMocks());

describe('October paid occurrence does not use the free registration rail', () => {
  it('rejects a stale free checkout request before tokens, writes, email, calendar or attribution', async () => {
    const response = await POST(
      new NextRequest('https://carsi.example.test/api/events/ccw-roadshow/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventSlug: 'brisbane-2026-10-09',
          packageId: 'single',
          turnstileToken: 'synthetic',
          contactEmail: 'person@example.test',
          attendees: [
            { fullName: 'Synthetic Person', yearsExperience: '2-5', goals: 'Improve quoting' },
          ],
        }),
      })
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      detail:
        'Seats for this event are booked through Carpet Cleaners Warehouse, not on this page.',
    });
    for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
  });
});
