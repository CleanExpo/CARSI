import { describe, expect, it } from 'vitest';

import { buildContentSecurityPolicy, isStrictCspPath } from './csp';

const BASE = { nonce: 'n0nce123', isDev: false, appOrigin: 'https://carsi.com.au' };

function scriptSrc(policy: string): string {
  return policy.split('; ').find((directive) => directive.startsWith('script-src ')) ?? '';
}

describe('the strict Content-Security-Policy on the signed-in app', () => {
  it('allows own-origin scripts and the nonce, and never unsafe-inline', () => {
    const directive = scriptSrc(buildContentSecurityPolicy({ ...BASE, strict: true }));
    expect(directive).toContain("'self'");
    expect(directive).toContain("'nonce-n0nce123'");
    expect(directive).toContain('https://www.googletagmanager.com');
    expect(directive).not.toContain("'unsafe-inline'");
    expect(directive).not.toMatch(/sha256-/);
  });

  it('keeps the relaxed policy for the static public pages unchanged', () => {
    const directive = scriptSrc(buildContentSecurityPolicy({ ...BASE, strict: false }));
    expect(directive).toContain("'self'");
    expect(directive).toContain("'unsafe-inline'");
    expect(directive).not.toContain("'nonce-");
  });

  it('applies the strict policy to the dashboard and not to the public pages', () => {
    expect(isStrictCspPath('/dashboard')).toBe(true);
    expect(isStrictCspPath('/dashboard/courses')).toBe(true);
    expect(isStrictCspPath('/dashboard/learn/some-course')).toBe(true);
    expect(isStrictCspPath('/')).toBe(false);
    expect(isStrictCspPath('/courses')).toBe(false);
    expect(isStrictCspPath('/dashboards-of-others')).toBe(false);
  });
});
