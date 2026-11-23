/**
 * GP-768: /admin/users and /admin/users/<id> threw React #418 (hydration text mismatch).
 * The admin date formatters used the runtime's default locale and timezone, so the server
 * render (UTC) and the browser's hydration render (the viewer's own zone) produced different
 * text. These tests render under several process timezones and require identical output.
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  formatAdminCount,
  formatAdminDate,
  formatAdminDateTime,
} from '@/components/admin/admin-learner-ui';
import type { AdminDashboardUserEntry } from '@/lib/admin/admin-dashboard-data';
import { matchesAdminUserSegment } from '@/lib/admin/admin-user-segments';

const ZONES = ['UTC', 'America/Los_Angeles', 'Australia/Perth', 'Australia/Sydney'];
const originalTz = process.env.TZ;

function underEachZone<T>(fn: () => T): T[] {
  return ZONES.map((zone) => {
    process.env.TZ = zone;
    return fn();
  });
}

afterEach(() => {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe('admin date formatters are stable across runtime timezones (GP-768)', () => {
  // 22:38 UTC on 21 Nov is 9:38 am on 22 Nov in Sydney (AEDT): a calendar-day boundary.
  const iso = '2026-11-21T22:38:06.000Z';

  it('the test harness really changes the runtime timezone', () => {
    // Guard against a silent pass: if TZ changes had no effect, the checks below prove nothing.
    const hours = underEachZone(() => new Date(iso).getHours());
    expect(new Set(hours).size).toBeGreaterThan(1);
  });

  it('formatAdminDate renders the same en-AU Sydney date in every zone', () => {
    const out = underEachZone(() => formatAdminDate(iso));
    expect(new Set(out)).toEqual(new Set(['22 Nov 2026']));
  });

  it('formatAdminDateTime renders the same en-AU Sydney date and time in every zone', () => {
    const out = underEachZone(() => formatAdminDateTime(iso));
    expect(new Set(out).size).toBe(1);
    expect(out[0]).toMatch(/^22 Nov 2026, 9:38\s?am$/);
  });

  it('keeps the empty-value dash', () => {
    expect(formatAdminDate(null)).toBe('—');
    expect(formatAdminDateTime(undefined)).toBe('—');
    expect(formatAdminDate('not a date')).toBe('—');
  });

  it('formatAdminCount groups digits the en-AU way', () => {
    expect(formatAdminCount(12345)).toBe('12,345');
  });
});

describe('"New this month" segment is stable across runtime timezones (GP-768)', () => {
  // 1 Nov 2026 01:00 in Sydney, but still 31 Oct in UTC.
  const user = { createdAt: '2026-10-31T14:00:00.000Z' } as AdminDashboardUserEntry;
  const now = new Date('2026-11-21T22:38:06.000Z');

  it('places a sign-up in the same Sydney calendar month on server and client', () => {
    const out = underEachZone(() => matchesAdminUserSegment(user, 'new', now));
    expect(out).toEqual(ZONES.map(() => true));
  });
});
