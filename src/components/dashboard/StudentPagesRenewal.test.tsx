// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RENEWAL_RULE_NOTE, type RenewalSummaryPayload } from '@/types/renewal';

/**
 * GP-655 / GP-657: My Learning and Certificates, mounted. Adapted from the independent reviewer's
 * probe of 4bcff7cf. The source-text wiring check could not see that both pages' lifetime record
 * figure had been switched to the period total (CodeRabbit on PR #939).
 */
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ summary: null as unknown, user: { id: 'u' } }));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: async (endpoint: string) =>
      endpoint.includes('enrollments') || endpoint.includes('credentials')
        ? [
            {
              id: 'e',
              course_slug: 'old',
              course_title: 'Old course',
              status: 'completed',
              cec_hours: 33,
              credential_id: 'c',
              issued_date: '2024-06-01',
              verification_url: '/verify/c',
            },
          ]
        : null,
  },
}));
vi.mock('@/hooks/use-renewal-summary', () => ({ useRenewalSummary: () => h.summary }));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => ({ user: h.user }) }));
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

import Credentials from '../../../app/(dashboard)/dashboard/student/credentials/page';
import Student from '../../../app/(dashboard)/dashboard/student/page';

const inPeriod = (earned: number) =>
  ({
    tracking_mode: 'cycle',
    renewal_expiry_date: '2028-12-31',
    cec_required: 14,
    cec_earned_in_cycle: earned,
    cec_earned_lifetime: 33,
  }) as unknown as RenewalSummaryPayload;

/** The lifetime record figure: the element holding `label`, read through its parent. */
function recordFigure(root: HTMLElement, label: string): string {
  const el = [...root.querySelectorAll('*')].find((n) => n.textContent?.trim() === label);
  expect(el, `no element labelled ${label}`).toBeTruthy();
  return el!.parentElement!.textContent ?? '';
}

let root: ReturnType<typeof createRoot> | null = null;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
});

async function mount(Page: () => unknown, summary: RenewalSummaryPayload | null) {
  h.summary = summary;
  const div = document.createElement('div');
  root = createRoot(div);
  await act(async () => root!.render(createElement(Page as never)));
  return div;
}

describe.each([
  ['My Learning', Student, 'Approved CEC'],
  ['Certificates', Credentials, 'Approved IICRC CEC hours'],
] as const)('%s CEC card, mounted (GP-655)', (_name, Page, recordLabel) => {
  it('33 lifetime / 0 in the period: not "reached", 14 remaining, record still shows 33', async () => {
    const div = await mount(Page, inPeriod(0));
    const text = div.textContent ?? '';
    expect(text).not.toContain('Renewal target reached');
    expect(text).toContain('14 CECs remaining in the period ending 31 Dec 2028.');
    expect(text).toContain(RENEWAL_RULE_NOTE);
    expect(text).toContain('/14');
    expect(recordFigure(div, recordLabel)).toContain('33');
  });

  it('no summary (loading or failed): a labelled lifetime total, never "reached"', async () => {
    const div = await mount(Page, null);
    const text = div.textContent ?? '';
    expect(text).not.toContain('Renewal target reached');
    expect(text).toContain('Lifetime total.');
    expect(text).toContain(RENEWAL_RULE_NOTE);
    expect(recordFigure(div, recordLabel)).toContain('33');
  });

  it('14 CECs in the period is reached', async () => {
    const div = await mount(Page, inPeriod(14));
    expect(div.textContent).toContain('Renewal target reached for the period ending 31 Dec 2028.');
  });
});
