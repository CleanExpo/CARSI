// @vitest-environment jsdom
/**
 * GP-731: PostHog follows the same consent rule as Google Analytics. It does not start, and
 * captures nothing, without a stored yes; a "no" opts it out; and the addresses it would send are
 * scrubbed by the same rules.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ph = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  return {
    init: vi.fn(),
    capture: vi.fn(),
    opt_out_capturing: vi.fn(),
    opt_in_capturing: vi.fn(),
  };
});
vi.mock('posthog-js', () => ({ default: ph }));

import type { CaptureResult } from 'posthog-js';

import { saveAnalyticsChoice } from './consent-client';
import { scrubPostHogEvent, trackCourseView } from './posthog-client';

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/courses/water');
  for (const fn of Object.values(ph)) fn.mockClear();
});

function event(properties: Record<string, unknown>): CaptureResult {
  return { uuid: 'u', event: 'course_view', properties } as unknown as CaptureResult;
}

describe('PostHog waits for the visitor to say yes', () => {
  it('does not start or capture without a stored choice, or after a no', () => {
    trackCourseView({ name: 'course_view', course_slug: 'water' });
    saveAnalyticsChoice(false);
    trackCourseView({ name: 'course_view', course_slug: 'water' });
    expect(ph.init).not.toHaveBeenCalled();
    expect(ph.capture).not.toHaveBeenCalled();
  });

  it('starts with the scrubber after a yes, and opts out on a later no', () => {
    saveAnalyticsChoice(true);
    trackCourseView({ name: 'course_view', course_slug: 'water' });
    expect(ph.init).toHaveBeenCalledTimes(1);
    expect(ph.init.mock.calls[0][1]).toMatchObject({ before_send: scrubPostHogEvent });
    expect(ph.capture).toHaveBeenCalledWith('course_view', { course_slug: 'water' });

    saveAnalyticsChoice(false);
    expect(ph.opt_out_capturing).toHaveBeenCalledTimes(1);
    trackCourseView({ name: 'course_view', course_slug: 'water' });
    expect(ph.capture).toHaveBeenCalledTimes(1);
  });
});

describe('scrubPostHogEvent', () => {
  it('strips personal data from the addresses and keeps the campaign tags', () => {
    saveAnalyticsChoice(true);
    window.history.replaceState(
      null,
      '',
      '/courses/water?email=jane%40example.com&utm_source=news'
    );
    const scrubbed = scrubPostHogEvent(
      event({
        $current_url: `${window.location.origin}/courses/water?email=jane%40example.com&utm_source=news`,
        $referrer: 'https://www.google.com/search?q=jane',
      })
    );
    expect(scrubbed?.properties.$current_url).toBe(
      `${window.location.origin}/courses/water?utm_source=news`
    );
    expect(scrubbed?.properties.$referrer).toBe('https://www.google.com');
    expect(JSON.stringify(scrubbed)).not.toContain('jane');
  });

  it('drops anything about a private page, and anything without a yes', () => {
    saveAnalyticsChoice(true);
    window.history.replaceState(null, '', '/dashboard/student/profile');
    expect(scrubPostHogEvent(event({ $current_url: window.location.href }))).toBeNull();
    window.history.replaceState(null, '', '/courses/water');
    saveAnalyticsChoice(false);
    expect(scrubPostHogEvent(event({ $current_url: window.location.href }))).toBeNull();
  });
});
