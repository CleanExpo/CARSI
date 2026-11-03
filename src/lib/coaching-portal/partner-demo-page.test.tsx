// Renders the real public walkthrough page and checks what a visitor actually sees
// (review r3: a source-text check passed while the page showed a different member).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PARTNER_DEMO_WALKTHROUGH_STEPS } from '@/lib/coaching-portal/partner-demo';
import { buildPartnerDemoSeedPlan, PARTNER_DEMO_COACH_LABEL } from '@/lib/coaching-portal/partner-demo-seed';

import CoachingPartnerDemoPage from '../../../app/(public)/ccw-training/partner-demo/page';

const plan = buildPartnerDemoSeedPlan(new Date('2026-11-04T00:00:00.000Z'));

function visibleText(): string {
  const html = renderToStaticMarkup(createElement(CoachingPartnerDemoPage));
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

describe('/ccw-training/partner-demo page (rendered)', () => {
  const text = visibleText();

  it('shows the seeded member, business and coach, and no other sample', () => {
    expect(text).toContain(plan.user.fullName);
    expect(text).toContain(plan.profile.businessName);
    expect(text).toContain(`coached by ${PARTNER_DEMO_COACH_LABEL}`);
    expect(text).toContain(plan.subscription.horizontalSummary);
    expect(text).toContain(plan.subscription.directionSummary);
    expect(text).toContain(plan.profile.onboardingProblemStatement);
    // The retired static sample and the default coach must not appear.
    for (const stale of ['Alex Demo', 'Perth', 'Demo Carpet & Restoration', 'Phill McGurk']) {
      expect(text).not.toContain(stale);
    }
  });

  it('lists all ten steps, with coming steps labelled and not linked', () => {
    PARTNER_DEMO_WALKTHROUGH_STEPS.forEach((step) => expect(text).toContain(step.title));
    const html = renderToStaticMarkup(createElement(CoachingPartnerDemoPage));
    for (const [i, step] of PARTNER_DEMO_WALKTHROUGH_STEPS.entries()) {
      const li = html.match(new RegExp(`data-testid="partner-demo-step-${i + 1}"[\\s\\S]*?</li>`))?.[0] ?? '';
      expect(li, step.title).not.toBe('');
      if (step.status === 'coming') {
        expect(li).toContain(`Coming (${step.ticket})`);
        expect(li).not.toContain('href=');
      } else {
        expect(li).toContain('Open in portal');
      }
    }
  });
});
