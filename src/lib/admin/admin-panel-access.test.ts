import { afterEach, describe, expect, it } from 'vitest';

import type { SessionClaims } from '@/lib/auth/session-jwt';

import {
  getReservedStaffEmails,
  isLmsClaimsAllowedAdminPanel,
  isReservedStaffEmail,
} from './admin-panel-access';

function claims(email: string, role = 'student'): SessionClaims {
  return { sub: 'user-1', email, full_name: 'Test User', role };
}

/**
 * LMS admin is the database role only (founder decision 19/10/2026). The staff-email list
 * survives solely so unverified account creation can refuse those addresses (PR #907); the
 * end-to-end grant matrix lives in lms-admin-db-role-only.test.ts.
 */
describe('admin-panel-access', () => {
  const ORIG = {
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PANEL_EMAILS: process.env.ADMIN_PANEL_EMAILS,
  };
  afterEach(() => {
    process.env.ADMIN_EMAIL = ORIG.ADMIN_EMAIL;
    process.env.ADMIN_PANEL_EMAILS = ORIG.ADMIN_PANEL_EMAILS;
  });

  it('honours session role `admin` whatever its case or spacing, and nothing else', () => {
    expect(isLmsClaimsAllowedAdminPanel(claims('someone@else.com', 'admin'))).toBe(true);
    expect(isLmsClaimsAllowedAdminPanel(claims('someone@else.com', ' Admin '))).toBe(true);
    expect(isLmsClaimsAllowedAdminPanel(claims('someone@else.com', 'instructor'))).toBe(false);
    expect(isLmsClaimsAllowedAdminPanel(claims('someone@else.com', ''))).toBe(false);
  });

  it('reserves founder accounts with NO admin env set', () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PANEL_EMAILS;
    expect(isReservedStaffEmail('  PHILL.M@CARSI.COM.AU ')).toBe(true);
    // The support@ bootstrap is reserved only when configured, never hardcoded.
    expect(isReservedStaffEmail('support@carsi.com.au')).toBe(false);
    expect(isReservedStaffEmail('stranger@example.com')).toBe(false);
  });

  it('reserves founder and env addresses whatever their case or spacing', () => {
    process.env.ADMIN_EMAIL = 'support@carsi.com.au';
    process.env.ADMIN_PANEL_EMAILS = 'ops@carsi.com.au, extra@carsi.com.au';
    expect(isReservedStaffEmail('  PHILL.M@carsi.com.au ')).toBe(true);
    expect(isReservedStaffEmail('Support@CARSI.com.au')).toBe(true);
    expect(isReservedStaffEmail(' ops@CARSI.COM.AU')).toBe(true);
    expect(isReservedStaffEmail('learner@example.com')).toBe(false);
    const set = getReservedStaffEmails();
    expect(set.has('phill.m@carsi.com.au')).toBe(true);
    expect(set.has('extra@carsi.com.au')).toBe(true);
  });
});
