import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  PARTNER_DEMO_EMAIL_DOMAIN,
  PARTNER_DEMO_WALKTHROUGH_STEPS,
  isPartnerDemoEmail,
} from '@/lib/coaching-portal/partner-demo';

const ROOT = resolve(__dirname, '../../..');
const PORTAL_DIR = join(ROOT, 'app', '(coaching-portal)', 'dashboard', 'coaching');

describe('partner demo walkthrough (GP-637)', () => {
  it('has ten steps that fit in ten minutes', () => {
    expect(PARTNER_DEMO_WALKTHROUGH_STEPS).toHaveLength(10);
    const total = PARTNER_DEMO_WALKTHROUGH_STEPS.reduce((n, s) => n + s.minutes, 0);
    expect(total).toBeLessThanOrEqual(10);
  });

  it('every live step opens a portal page that exists', () => {
    const live = PARTNER_DEMO_WALKTHROUGH_STEPS.filter((s) => s.status === 'live');
    expect(live.length).toBeGreaterThan(0);
    for (const step of live) {
      expect(step.segment, step.title).not.toBeNull();
      const page = join(PORTAL_DIR, ...(step.segment ?? '').split('/').filter(Boolean), 'page.tsx');
      expect(existsSync(page), `${step.title}: ${page}`).toBe(true);
    }
  });

  it('every step names the advantage it proves, and coming steps link nowhere', () => {
    for (const step of PARTNER_DEMO_WALKTHROUGH_STEPS) {
      expect(step.advantage.trim(), step.title).not.toBe('');
      expect(step.shows.trim(), step.title).not.toBe('');
      if (step.status === 'coming') {
        expect(step.segment, step.title).toBeNull();
        expect(step.ticket, step.title).toMatch(/^GP-\d+$/);
      }
    }
  });

  it('the run sheet lists the same ten steps in the same order', () => {
    const sheet = readFileSync(join(ROOT, 'docs', 'coaching', 'partner-demo-runsheet.md'), 'utf8');
    let from = 0;
    for (const [i, step] of PARTNER_DEMO_WALKTHROUGH_STEPS.entries()) {
      const heading = `## ${i + 1}. ${step.title}`;
      const at = sheet.indexOf(heading, from);
      expect(at, heading).toBeGreaterThanOrEqual(0);
      from = at + heading.length;
    }
  });
});

describe('one demo member everywhere (review r2 P1)', () => {
  it('the public walkthrough shows exactly the member, business and coach the seed creates', async () => {
    const demo = await import('@/lib/coaching-portal/partner-demo');
    const { buildPartnerDemoSeedPlan, PARTNER_DEMO_COACH_LABEL } = await import(
      '@/lib/coaching-portal/partner-demo-seed'
    );
    const plan = buildPartnerDemoSeedPlan(new Date('2026-11-04T00:00:00.000Z'));
    const snap = demo.PARTNER_DEMO_ONBOARDING_SNAPSHOT;

    expect(demo.PARTNER_DEMO_MEMBER.fullName).toBe(plan.user.fullName);
    expect(demo.PARTNER_DEMO_MEMBER.email).toBe(plan.user.email);
    expect(snap.member).toEqual({ fullName: plan.user.fullName, email: plan.user.email });
    expect(snap.profile.businessName).toBe(plan.profile.businessName);
    expect(snap.profile.location).toBe(plan.profile.location);
    expect(snap.statements.problemStatement).toBe(plan.profile.onboardingProblemStatement);
    expect(snap.statements.goalStatement).toBe(plan.profile.onboardingGoalStatement);
    expect(demo.PARTNER_DEMO_WORKSPACE.horizontalSummary).toBe(plan.subscription.horizontalSummary);
    expect(demo.PARTNER_DEMO_WORKSPACE.directionSummary).toBe(plan.subscription.directionSummary);
    expect(demo.PARTNER_DEMO_COACH_NAME).toBe(PARTNER_DEMO_COACH_LABEL);
    for (const s of plan.sessions) expect(s.coachName).toBe(demo.PARTNER_DEMO_COACH_NAME);
  });

  it('the public page renders the shared demo member, not a second sample', () => {
    const page = readFileSync(
      join(ROOT, 'app', '(public)', 'ccw-training', 'partner-demo', 'page.tsx'),
      'utf8'
    );
    expect(page).toContain('PARTNER_DEMO_COACH_NAME');
    expect(page).not.toContain('PARTNER_DEMO_COACH.displayName');
  });
});

describe('isPartnerDemoEmail', () => {
  it('matches only the reserved demo domain', () => {
    expect(isPartnerDemoEmail(`a@${PARTNER_DEMO_EMAIL_DOMAIN}`)).toBe(true);
    expect(isPartnerDemoEmail(`  A@${PARTNER_DEMO_EMAIL_DOMAIN.toUpperCase()} `)).toBe(true);
    expect(isPartnerDemoEmail('a@carsi.com.au')).toBe(false);
    expect(isPartnerDemoEmail(`a@x${PARTNER_DEMO_EMAIL_DOMAIN}`)).toBe(false);
    expect(isPartnerDemoEmail(`a@${PARTNER_DEMO_EMAIL_DOMAIN}.com`)).toBe(false);
    expect(isPartnerDemoEmail(null)).toBe(false);
  });
});
