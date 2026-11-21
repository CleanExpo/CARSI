// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * GP-627 item 4: My Learning and Certificates were blank for a few seconds, then first showed
 * "In progress 0" (and "No certificates yet") before the real data arrived. While data is in
 * flight the pages must show placeholders and never a zero or an empty state.
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({
  auth: { user: { id: 'u' } as { id: string } | null, loading: false },
  pending: true,
}));

const enrolment = {
  id: 'e',
  course_id: 'c',
  course_slug: 'water',
  course_title: 'Water course',
  status: 'active',
  enrolled_at: '2026-10-01',
  completion_percentage: 13,
  lessons_total: 8,
  lessons_completed: 1,
};

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: (endpoint: string) =>
      h.pending
        ? new Promise(() => undefined) // never settles: the page is mid-load
        : Promise.resolve(endpoint.includes('enrollments') ? [enrolment] : endpoint.includes('credentials') ? [] : null),
  },
}));
vi.mock('@/hooks/use-renewal-summary', () => ({ useRenewalSummary: () => null }));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => h.auth }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: never }) =>
    createElement('a', { href }, children),
}));
vi.mock('@/components/lms/EnrolledCourseList', () => ({ EnrolledCourseList: () => null }));
vi.mock('@/components/lms/LinkedInShareButton', () => ({ LinkedInShareButton: () => null }));
vi.mock('@/components/lms/PushNotificationPrompt', () => ({ PushNotificationPrompt: () => null }));
vi.mock('@/components/lms/PathwayProgressCard', () => ({ PathwayProgressCard: () => null }));
vi.mock('@/components/onboarding/OnboardingProgramsStrip', () => ({
  OnboardingProgramsStrip: () => null,
  OnboardingQuickLink: () => null,
}));

import {
  isDashboardPageReady,
  resetDashboardPageReadyForTests,
} from '@/lib/onboarding/page-ready';

import Credentials from '../../../app/(dashboard)/dashboard/student/credentials/page';
import Student from '../../../app/(dashboard)/dashboard/student/page';

let root: ReturnType<typeof createRoot> | null = null;
beforeEach(() => {
  h.auth = { user: { id: 'u' }, loading: false };
  h.pending = true;
  resetDashboardPageReadyForTests();
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
});

async function mount(Page: () => unknown) {
  const div = document.createElement('div');
  root = createRoot(div);
  await act(async () => root!.render(createElement(Page as never)));
  return div;
}

function tab(div: HTMLElement, label: string): HTMLElement {
  const el = [...div.querySelectorAll('[role="tab"]')].find((n) => n.textContent?.startsWith(label));
  expect(el, `no tab ${label}`).toBeTruthy();
  return el as HTMLElement;
}

describe('My Learning while loading', () => {
  it('shows no "0" count on the tabs before the courses arrive', async () => {
    const div = await mount(Student);
    expect(tab(div, 'In progress').textContent).toBe('In progress');
    expect(tab(div, 'Completed').textContent).toBe('Completed');
    expect(div.querySelector('[data-testid="tab-count-loading"]')).toBeTruthy();
  });

  it('shows placeholders for the record and next lesson instead of a blank space', async () => {
    const div = await mount(Student);
    expect(div.querySelector('[aria-label="Loading your record"]')).toBeTruthy();
    expect(div.querySelector('[aria-label="Loading your next lesson"]')).toBeTruthy();
    expect(div.querySelector('[aria-label="Loading courses"]')).toBeTruthy();
  });

  it('does not let the onboarding wizard open before the first view has loaded', async () => {
    await mount(Student);
    expect(isDashboardPageReady()).toBe(false);
  });

  it('shows real counts and signals ready once the courses arrive (positive control)', async () => {
    h.pending = false;
    const div = await mount(Student);
    expect(tab(div, 'In progress').textContent).toBe('In progress1');
    expect(div.querySelector('[aria-label="Loading your record"]')).toBeNull();
    expect(isDashboardPageReady()).toBe(true);
  });
});

describe('Certificates while loading', () => {
  it('shows placeholders, not "No certificates yet", while the session is still resolving', async () => {
    h.auth = { user: null, loading: true };
    const div = await mount(Credentials);
    expect(div.textContent).not.toContain('No certificates yet');
    expect(div.querySelector('[aria-label="Loading certificates"]')).toBeTruthy();
    expect(isDashboardPageReady()).toBe(false);
  });

  it('shows placeholders while the certificates request is in flight', async () => {
    const div = await mount(Credentials);
    expect(div.textContent).not.toContain('No certificates yet');
    expect(div.querySelector('[aria-label="Loading your record"]')).toBeTruthy();
  });

  it('shows the empty state only after the list has loaded (positive control)', async () => {
    h.pending = false;
    const div = await mount(Credentials);
    expect(div.textContent).toContain('No certificates yet');
    expect(isDashboardPageReady()).toBe(true);
  });
});
