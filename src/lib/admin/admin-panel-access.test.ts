import { afterEach, describe, expect, it } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

import { getAdminPanelAllowedEmails, isLmsClaimsAllowedAdminPanel } from './admin-panel-access';

function claims(email: string, role = 'student'): SessionClaims {
  return { sub: 'user-1', email, full_name: 'Test User', role };
}

/**
 * Regression: the founder admin accounts must reach /admin (and the admin⇄learner
 * view toggle) even when NO admin env vars are configured — the exact env-drift that
 * hid the toggle from phill.m@carsi.com.au (ADMIN_PANEL_EMAILS was never set in DO).
 */
describe('admin-panel-access — founder allowlist is env-independent', () => {
  const ORIG = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PANEL_EMAILS: process.env.ADMIN_PANEL_EMAILS,
  };
  afterEach(() => {
    process.env.ADMIN_EMAIL = ORIG.ADMIN_EMAIL;
    process.env.ADMIN_PANEL_EMAILS = ORIG.ADMIN_PANEL_EMAILS;
  });

  it('allows the founder account with NO admin env set (would have failed pre-fix)', () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PANEL_EMAILS;
    expect(isLmsClaimsAllowedAdminPanel(claims('phill.m@carsi.com.au'))).toBe(true);
    // trimmed + case-insensitive, matching isLmsClaimsAllowedAdminPanel's normalisation
    expect(isLmsClaimsAllowedAdminPanel(claims('  PHILL.M@CARSI.COM.AU '))).toBe(true);
  });

  it('does NOT hardcode the ADMIN_EMAIL/support bootstrap as admin (self-registration guard)', () => {
    // Security: support@ is the legacy admin-password bootstrap, not a hardcoded LMS
    // admin — it must only gain the panel via the ADMIN_EMAIL/ADMIN_PANEL_EMAILS env,
    // never by anyone self-registering the address.
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PANEL_EMAILS;
    expect(isLmsClaimsAllowedAdminPanel(claims('support@carsi.com.au'))).toBe(false);
    process.env.ADMIN_EMAIL = 'support@carsi.com.au';
    expect(isLmsClaimsAllowedAdminPanel(claims('support@carsi.com.au'))).toBe(true);
  });

  it('denies a non-admin email when no env allowlist is set', () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PANEL_EMAILS;
    expect(isLmsClaimsAllowedAdminPanel(claims('stranger@example.com'))).toBe(false);
  });

  it('honours JWT role `admin` regardless of email', () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PANEL_EMAILS;
    expect(isLmsClaimsAllowedAdminPanel(claims('someone@else.com', 'admin'))).toBe(true);
  });

  it('extends the allowlist via ADMIN_PANEL_EMAILS while preserving founders', () => {
    delete process.env.ADMIN_EMAIL;
    process.env.ADMIN_PANEL_EMAILS = 'ops@carsi.com.au, extra@carsi.com.au';
    const set = getAdminPanelAllowedEmails();
    expect(set.has('phill.m@carsi.com.au')).toBe(true); // founder preserved
    expect(set.has('ops@carsi.com.au')).toBe(true);
    expect(set.has('extra@carsi.com.au')).toBe(true);
  });
});
