import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Runtime test of the ONLY path that mints a CCW-FREE entry token.
 *
 * This is round 3 on the same defect class, and the two earlier attempts both
 * failed for the same underlying reason — they inferred the guard rather than
 * observing it:
 *
 *   Round 1: the guard function was unit-tested; the route's use of it was not.
 *            A mutant deleting the whole guard block from the route left the
 *            suite green.
 *   Round 2: a source-text check asserted the route mentions the guard before it
 *            mints. The reviewer defeated it by renaming the import and declaring
 *            a local `function allowsFreeEntryRegistration() { return true }` that
 *            shadows the real one. The text still read correctly; the behaviour
 *            was gone.
 *
 * So this test stops reading the source and invokes the route. The property is
 * "no token is minted for a paid city", and the only place that is decidable is
 * the response the handler actually returns.
 */

const applyRateLimit = vi.fn(() => ({ ok: true, resetAt: Date.now() + 60_000 }));
const verifyTurnstileToken = vi.fn(async () => ({ ok: true }));
const createRoadshowRegistration = vi.fn(async () => ({
  status: 'confirmed' as const,
  id: 'should-never-be-reached',
}));

vi.mock('@/lib/rate-limit', () => ({
  applyRateLimit: (...args: unknown[]) => applyRateLimit(...(args as [])),
  clientIpFrom: () => '203.0.113.7',
}));

vi.mock('@/lib/server/turnstile', () => ({
  verifyTurnstileToken: (...args: unknown[]) => verifyTurnstileToken(...(args as [])),
}));

vi.mock('@/lib/server/ccw-roadshow-registry', () => ({
  createRoadshowRegistration: (...args: unknown[]) =>
    createRoadshowRegistration(...(args as [])),
  setRegistrationCalendarSynced: vi.fn(async () => undefined),
}));

// Everything below here is only reached AFTER a successful registration. Stubbed so
// a green Melbourne path cannot fail for an unrelated reason.
vi.mock('@/lib/server/ccw-roadshow-calendar', () => ({
  addRegistrationToCalendar: vi.fn(async () => ({ ok: false })),
}));
vi.mock('@/lib/server/crm-sync', () => ({ emitCrmEvent: vi.fn(async () => undefined) }));
vi.mock('@/lib/server/transactional-email', () => ({
  sendCcwRoadshowOrganizerNotificationEmail: vi.fn(async () => undefined),
}));
vi.mock('@/lib/server/ccw-roadshow-email-log', () => ({
  sendAndLogRoadshowEmail: vi.fn(async () => undefined),
}));

const { POST } = await import('../../../app/api/events/ccw-roadshow/checkout/route');

function checkoutRequest(eventSlug: string) {
  return new Request('https://carsi.com.au/api/events/ccw-roadshow/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventSlug,
      packageId: 'single',
      turnstileToken: 'test-token',
      contactEmail: 'operator@example.com',
      // Field names and the experience band must match what the route actually
      // validates (fullName / yearsExperience / goals, band from
      // ccwRoadshowExperienceBands). The first version of this used name /
      // experienceBand / goal and band '1-3', so Melbourne was rejected at 400 for
      // a malformed payload and the "not 409" positive control passed without ever
      // reaching the registration guard - a vacuous control.
      attendees: [
        { fullName: 'Test Operator', yearsExperience: '2-5', goals: 'Improve quoting' },
      ],
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;
}

describe('ccw roadshow checkout route refuses to mint for paid cities', () => {
  beforeEach(() => {
    createRoadshowRegistration.mockClear();
    applyRateLimit.mockClear();
    verifyTurnstileToken.mockClear();
  });

  it.each(['brisbane', 'sydney'])(
    'refuses %s with 409 and never reaches registration',
    async (slug) => {
      const response = await POST(checkoutRequest(slug));
      expect(response.status).toBe(409);
      // The decisive assertion: no registration row, therefore no token minted.
      expect(createRoadshowRegistration).not.toHaveBeenCalled();
    },
  );

  it('positive control: melbourne passes the guard and DOES reach registration', async () => {
    // Without this, a route that refused everything - or rejected every payload at
    // 400 - would satisfy the assertions above while proving nothing. Asserting the
    // registry was reached is the strong form: a mere "not 409" passes on a 400.
    const response = await POST(checkoutRequest('melbourne'));
    expect(response.status).not.toBe(409);
    expect(response.status).not.toBe(400);
    expect(createRoadshowRegistration).toHaveBeenCalled();
  });

  it('positive control: the mocks are actually wired in', async () => {
    await POST(checkoutRequest('brisbane'));
    expect(verifyTurnstileToken).toHaveBeenCalled();
    expect(applyRateLimit).toHaveBeenCalled();
  });
});
