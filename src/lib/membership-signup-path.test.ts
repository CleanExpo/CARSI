import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  isMembershipCheckoutResume,
  loginPathWithNext,
  membershipSignupPath,
  safeNextPath,
} from './membership-signup-path';

describe('membership signup path', () => {
  it('sends a logged-out buyer to register, returning to /subscribe', () => {
    expect(membershipSignupPath()).toBe('/register?next=%2Fsubscribe');
  });

  it('resumes checkout only for the /subscribe target', () => {
    expect(isMembershipCheckoutResume('/subscribe')).toBe(true);
    expect(isMembershipCheckoutResume('/subscribe?checkout=cancelled')).toBe(true);
    expect(isMembershipCheckoutResume('/subscribe#faq')).toBe(true);
    expect(isMembershipCheckoutResume('/subscriber')).toBe(false);
    expect(isMembershipCheckoutResume('/dashboard')).toBe(false);
    expect(isMembershipCheckoutResume('/courses/water-damage-essentials')).toBe(false);
    expect(isMembershipCheckoutResume(null)).toBe(false);
  });

  it('never treats an off-site target as safe', () => {
    for (const bad of ['//evil.example/subscribe', '/\\evil.example', 'https://evil.example/subscribe']) {
      expect(safeNextPath(bad)).toBeNull();
      expect(isMembershipCheckoutResume(bad)).toBe(false);
      expect(loginPathWithNext(bad)).toBe('/login');
    }
  });

  it('keeps next on the sign-in link so an existing customer returns to /subscribe', () => {
    expect(loginPathWithNext('/subscribe')).toBe('/login?next=%2Fsubscribe');
    expect(loginPathWithNext(undefined)).toBe('/login');
  });

  it('the membership CTA no longer routes a 401 to /login', () => {
    const cta = readFileSync(
      join(process.cwd(), 'app/(public)/subscribe/SubscribeCta.tsx'),
      'utf8'
    );
    expect(cta).toContain('membershipSignupPath()');
    expect(cta).not.toMatch(/\/login\?next=/);
  });
});
