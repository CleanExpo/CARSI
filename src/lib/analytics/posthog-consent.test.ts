// @vitest-environment jsdom
/**
 * GP-731: PostHog follows the same consent rule as Google Analytics. It does not start, and
 * captures nothing, without a stored yes; a "no" opts it out; and the addresses it would send are
 * scrubbed by the same rules.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ph = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
  const state: { config?: Record<string, unknown> } = {};
  return {
    state,
    init: vi.fn((_key: string, config: Record<string, unknown>) => {
      state.config = config;
    }),
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
  for (const fn of [ph.init, ph.capture, ph.opt_out_capturing, ph.opt_in_capturing]) fn.mockClear();
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
      `${window.location.origin}/courses/:slug?utm_source=news`
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

describe('PostHog receives no personal data in any shape (GP-731 round 4)', () => {
  it('drops phone numbers and names from campaign values, the address, the path and the title', () => {
    saveAnalyticsChoice(true);
    window.history.replaceState(null, '', '/courses/0412-345-678?utm_campaign=0412-345-678');
    const scrubbed = scrubPostHogEvent({
      uuid: 'u',
      event: 'course_view',
      properties: {
        $current_url: window.location.href,
        $pathname: window.location.pathname,
        utm_campaign: '0412-345-678',
        title: 'Call 0412 345 678 | CARSI',
        $referrer: `${window.location.origin}/courses/jane-smith?email=jane%40example.com`,
        course_slug: 'water',
      },
      $set_once: {
        $initial_utm_campaign: '0412 345 678',
        $initial_pathname: '/courses/jane-smith',
      },
    } as unknown as CaptureResult);
    const text = JSON.stringify(scrubbed);
    for (const bit of ['0412', 'jane', '@']) expect(text).not.toContain(bit);
    expect(scrubbed?.properties.course_slug).toBe('water');
  });

  it('starts with campaign and referrer collection switched off at the source', () => {
    saveAnalyticsChoice(true);
    trackCourseView({ course_slug: 'water' });
    const config = ph.state.config;
    expect(config).toBeDefined();
    expect(config?.save_campaign_params).toBe(false);
    expect(config?.save_referrer).toBe(false);
  });
});
