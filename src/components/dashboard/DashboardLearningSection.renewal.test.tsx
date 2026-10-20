import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { CecRenewalFigure, CecRenewalStatus } from '@/components/lms/CecRenewalStatus';
import { renewalProgress } from '@/lib/renewal-progress';
import type { LearnerDashboardSummary } from '@/lib/server/learner-dashboard-data';
import { RENEWAL_RULE_NOTE, type RenewalSummaryPayload } from '@/types/renewal';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: unknown }) =>
    createElement('a', { href }, children as never),
}));

import { DashboardLearningSection } from './DashboardLearningSection';

/**
 * GP-655, independent review of 7fd96456: the live home card said "Renewal target reached" from a
 * lifetime total of 33 CECs while the learner had 0 inside the 4-year renewal period.
 */
const lifetime33 = {
  enrollments: [],
  counts: { total: 0, active: 0, completed: 3 },
  cecHoursFromCompleted: 33,
  totalCatalogHours: 0,
} as unknown as LearnerDashboardSummary;

const periodSummary: RenewalSummaryPayload = {
  tracking_mode: 'cycle',
  has_renewal_expiry: true,
  renewal_expiry_date: '2028-12-31',
  cycle_start: '2024-12-31T00:00:00.000Z',
  cycle_end: '2028-12-31T23:59:59.999Z',
  cec_required: 14,
  cec_earned_in_cycle: 0,
  cec_earned_lifetime: 33,
  by_discipline: {},
  by_discipline_lifetime: {},
  days_until_expiry: 800,
  renewal_urgent: false,
  iicrc_member_number: null,
  some_cecs_estimated: false,
  suggested_courses: [],
};

function renderHome(renewal: RenewalSummaryPayload | null) {
  return renderToStaticMarkup(
    createElement(DashboardLearningSection, {
      claims: null,
      summary: lifetime33,
      resume: null,
      recommendations: [],
      dbConfigured: true,
      enrolmentQueryFailed: false,
      renewal,
    })
  );
}

describe('learner home CEC card counts the renewal period (GP-655)', () => {
  it('33 lifetime CECs with none in the period is not "reached"', () => {
    const html = renderHome(periodSummary);
    expect(html).not.toContain('Renewal target reached');
    expect(html).toContain('14 CECs remaining in the period ending 31 Dec 2028.');
    expect(html).toContain(RENEWAL_RULE_NOTE);
  });

  it('without a renewal summary the card is a labelled lifetime total, never "reached"', () => {
    const html = renderHome(null);
    expect(html).not.toContain('Renewal target reached');
    expect(html).toContain('Lifetime total.');
    expect(html).toContain(RENEWAL_RULE_NOTE);
  });

  it('14 CECs inside the period is reached', () => {
    const html = renderHome({ ...periodSummary, cec_earned_in_cycle: 14 });
    expect(html).toContain('Renewal target reached for the period ending 31 Dec 2028.');
  });
});

describe('shared card pieces used by My Learning and Certificates (GP-655)', () => {
  it('render the period status and rule; a lifetime figure carries no "/14"', () => {
    const inPeriod = renewalProgress(periodSummary, 33);
    const status = renderToStaticMarkup(
      createElement(CecRenewalStatus, { progress: inPeriod, textClassName: 'x' })
    );
    expect(status).toContain('14 CECs remaining in the period ending 31 Dec 2028.');
    expect(status).toContain(RENEWAL_RULE_NOTE);
    expect(
      renderToStaticMarkup(
        createElement(CecRenewalFigure, { progress: inPeriod, earnedLabel: '0' })
      )
    ).toContain('/14');
    const lifetime = renewalProgress(null, 33);
    const figure = renderToStaticMarkup(
      createElement(CecRenewalFigure, { progress: lifetime, earnedLabel: '33' })
    );
    expect(figure).not.toContain('/14');
    expect(figure).toContain('lifetime');
  });

  it('both client pages feed the period summary into the render-tested pieces', () => {
    for (const file of [
      'app/(dashboard)/dashboard/student/page.tsx',
      'app/(dashboard)/dashboard/student/credentials/page.tsx',
    ]) {
      // Comments stripped, so a commented-out mount does not count.
      const src = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');
      expect(src, file).toMatch(/const renewal = useRenewalSummary\(/);
      expect(src, file).toMatch(/const cecProgress = renewalProgress\(renewal, /);
      expect(src, file).toContain('<CecRenewalStatus progress={cecProgress}');
      expect(src, file).toContain('<CecRenewalFigure progress={cecProgress}');
      expect(src, file).not.toMatch(/Renewal target reached/);
    }
  });
});
