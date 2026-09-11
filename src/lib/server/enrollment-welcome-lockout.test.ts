/**
 * A guest who pays for a course is given an account with no password
 * (`provisional:<uuid>`). Every link in the enrolment welcome email used to lead
 * to a page requiring a login they could not perform, so they owned a course they
 * could not open — and some paid a second time believing the first had failed.
 *
 * These tests pin the recovery route: when the account has no password yet, the
 * email must lead with setting one, and must point at the /forgot-password PAGE
 * rather than a minted token (a token in this email would be an authenticating
 * credential issued automatically on the webhook path — the P0-A shape).
 */
import { describe, expect, it } from 'vitest';

import { renderEnrollmentWelcomeEmail } from '@/lib/server/email-templates';

const BASE = {
  appOrigin: 'https://carsi.com.au',
  name: 'Karanveer',
  courseTitle: 'Level 1 Mould Remediation',
  startUrl: 'https://carsi.com.au/learn/level-1-mould-remediation/lesson-1',
  dashboardUrl: 'https://carsi.com.au/dashboard/student',
};

describe('enrolment welcome email — buyer with no password yet', () => {
  const rendered = renderEnrollmentWelcomeEmail({
    ...BASE,
    needsPasswordSetup: true,
    setPasswordUrl: 'https://carsi.com.au/forgot-password',
  });

  it('leads with setting a password, not with starting the lesson', () => {
    // The primary call to action is the one thing they can actually complete.
    expect(rendered.html).toContain('Set your password');
    const ctaIndex = rendered.html.indexOf('https://carsi.com.au/forgot-password');
    const startIndex = rendered.html.indexOf(BASE.startUrl);
    expect(ctaIndex).toBeGreaterThan(-1);
    expect(ctaIndex).toBeLessThan(startIndex);
  });

  it('gives the recovery route in the plain-text part too', () => {
    // Plenty of trade users read mail as text; the route cannot be HTML-only.
    expect(rendered.text).toContain('https://carsi.com.au/forgot-password');
  });

  it('says the payment succeeded, so nobody pays twice', () => {
    expect(rendered.text.toLowerCase()).toContain('payment went through');
  });

  it('carries no authenticating token — the surface P0-A closed stays closed', () => {
    const tokenish = /[?&](token|t|auth|jwt|key|session)=/i;
    expect(tokenish.test(rendered.html)).toBe(false);
    expect(tokenish.test(rendered.text)).toBe(false);
  });
});

describe('enrolment welcome email — buyer who already has a password', () => {
  const rendered = renderEnrollmentWelcomeEmail(BASE);

  it('is unchanged: still leads straight into lesson 1', () => {
    expect(rendered.html).toContain(BASE.startUrl);
    expect(rendered.html).toContain('Start lesson 1');
  });

  it('does not nag an established account to reset its password', () => {
    expect(rendered.html).not.toContain('/forgot-password');
    expect(rendered.text).not.toContain('/forgot-password');
  });
});
