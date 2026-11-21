import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatAdminDate, formatAdminDateTime } from './admin-learner-ui';

// The admin learner page renders these dates on the server and again in the browser. With the
// runtime's default locale the two disagree (server "22 Nov 2026", an en-US browser
// "Nov 22, 2026"), React throws hydration error #418 and rebuilds the page. Pin the locale.
describe('admin learner dates use one fixed locale', () => {
  afterEach(() => vi.restoreAllMocks());

  it('formatAdminDate formats in en-AU, whatever the runtime default', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleDateString');
    formatAdminDate('2026-11-22T02:00:00.000Z');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.every((c) => c[0] === 'en-AU')).toBe(true);
  });

  it('formatAdminDateTime formats in en-AU, whatever the runtime default', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleString');
    formatAdminDateTime('2026-11-22T02:00:00.000Z');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.every((c) => c[0] === 'en-AU')).toBe(true);
  });

  it('gives the Australian day-month order', () => {
    expect(formatAdminDate('2026-11-22T02:00:00.000Z')).toMatch(/^2[23] Nov 2026$/);
  });

  it('keeps the empty and invalid cases', () => {
    expect(formatAdminDate(null)).toBe('—');
    expect(formatAdminDateTime(undefined)).toBe('—');
  });
});
