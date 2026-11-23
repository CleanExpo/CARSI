// @vitest-environment jsdom
/**
 * GP-704 + GP-748 guard for the learner Certificates page, mounted with real data shapes.
 *
 * - A credential with approved CEC hours uses the approved wording ("Approved for IICRC CECs")
 *   and never the retired provider phrase.
 * - A learner whose credentials carry no approved CEC hours, or who has no credentials yet, sees
 *   no IICRC name anywhere on the page (founder ruling 21/11/2026, "Drop IICRC entirely").
 *
 * The source scan in approved-provider-wording.test.tsx covers this file's text; this test covers
 * what the page actually renders for each kind of learner.
 */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatCecHoursForCertificate } from '@/lib/cec-display';

import { APPROVED_FOR_IICRC_CECS, APPROVED_FOR_IICRC_CECS_LABEL } from './approved-wording';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const h = vi.hoisted(() => ({ credentials: [] as unknown[], user: { id: 'u' } }));

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: async () => h.credentials,
    post: async () => ({ url: 'https://carsi.com.au/x', expires_in_days: 30 }),
  },
}));
vi.mock('@/hooks/use-renewal-summary', () => ({ useRenewalSummary: () => null }));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: never }) =>
    createElement('a', { href }, children),
}));
vi.mock('@/components/lms/LinkedInShareButton', () => ({ LinkedInShareButton: () => null }));

import Credentials from '../../../app/(dashboard)/dashboard/student/credentials/page';

const credential = (cec_hours: number) => ({
  credential_id: `c-${cec_hours}`,
  course_title: 'A CARSI course',
  course_slug: 'a-course',
  iicrc_discipline: null,
  cec_hours,
  cppp40421_unit_code: null,
  issued_date: '2026-06-01',
  verification_url: '/verify/c',
  status: 'active',
});

let root: ReturnType<typeof createRoot> | null = null;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = null;
});

async function pageText(credentials: unknown[]): Promise<string> {
  h.credentials = credentials;
  const div = document.createElement('div');
  root = createRoot(div);
  await act(async () => root!.render(createElement(Credentials as never)));
  return (div.textContent ?? '').replace(/\s+/g, ' ');
}

// Stricter than the GP-704 pattern: no form of "accredit" belongs anywhere on this page.
const retired = (text: string) => text.match(/accredit\w*/gi) ?? [];

describe('Certificates page wording (GP-704, GP-748)', () => {
  it('an approved credential uses the approved wording, never the retired phrase', async () => {
    const text = await pageText([credential(2)]);
    expect(text).toContain('A CARSI course'); // the card rendered (the test can see it)
    expect(text).toContain(APPROVED_FOR_IICRC_CECS_LABEL);
    expect(text).toContain(formatCecHoursForCertificate(2));
    expect(text).toContain(`CEC totals for courses ${APPROVED_FOR_IICRC_CECS}`);
    expect(retired(text)).toEqual([]);
  });

  it('a learner with no approved course sees no IICRC name', async () => {
    const text = await pageText([credential(0)]);
    expect(text).toContain('A CARSI course');
    expect(text).toContain('CARSI certificate');
    expect(text).not.toMatch(/iicrc/i);
    expect(text).not.toMatch(/\bCECs?\b/);
  });

  it('a learner with no certificates yet sees no IICRC name', async () => {
    const text = await pageText([]);
    expect(text).toContain('No certificates yet');
    expect(text).not.toMatch(/iicrc/i);
  });

  it('the pattern this test relies on can fail (positive control)', () => {
    expect(retired('IICRC CEC ' + 'Accredited')).not.toHaveLength(0);
  });
});
