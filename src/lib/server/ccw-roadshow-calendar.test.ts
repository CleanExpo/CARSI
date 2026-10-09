import { afterEach, describe, expect, it, vi } from 'vitest';

import { addRegistrationToCalendar } from './ccw-roadshow-calendar';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('calendar occurrence target guard', () => {
  it.each([undefined, '', '   '])(
    'refuses missing target %s before reading credentials or calling Google',
    async (calendarEventId) => {
      const reads: string[] = [];
      const env = new Proxy(process.env, {
        get(target, key) {
          if (
            typeof key === 'string' &&
            [
              'GOOGLE_CALENDAR_CLIENT_ID',
              'GOOGLE_CALENDAR_CLIENT_SECRET',
              'GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN',
            ].includes(key)
          )
            reads.push(key);
          return Reflect.get(target, key);
        },
      });
      const provider = vi.fn();
      vi.stubGlobal('process', { ...process, env });
      vi.stubGlobal('fetch', provider);
      expect(
        await addRegistrationToCalendar({ calendarEventId, attendeeEmail: 'person@example.test' })
      ).toBe(false);
      expect(reads).toEqual([]);
      expect(provider).not.toHaveBeenCalled();
    }
  );

  it('preserves the configured historical target through refresh, read and guest update', async () => {
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_ID', 'synthetic-client');
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_SECRET', 'synthetic-secret');
    vi.stubEnv('GOOGLE_CALENDAR_OAUTH_REFRESH_TOKEN', 'synthetic-refresh');
    const provider = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'synthetic-access' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ attendees: [] }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', provider);
    expect(
      await addRegistrationToCalendar({
        calendarEventId: '1nnfc9hv164f4882q09krd1ies',
        attendeeEmail: 'person@example.test',
      })
    ).toBe(true);
    expect(provider).toHaveBeenCalledTimes(3);
    expect(provider.mock.calls[1][0]).toContain('/events/1nnfc9hv164f4882q09krd1ies');
    expect(provider.mock.calls[2][0]).toContain(
      '/events/1nnfc9hv164f4882q09krd1ies?sendUpdates=externalOnly'
    );
  });
});
