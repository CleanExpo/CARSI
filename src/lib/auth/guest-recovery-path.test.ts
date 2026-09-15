import { describe, expect, it } from 'vitest';

import {
  buildGuestPasswordSetupPath,
  isSafeInternalPath,
  isUsableRecoveryEmail,
} from './guest-recovery-path';

describe('isSafeInternalPath', () => {
  it('allows app paths and query strings', () => {
    expect(isSafeInternalPath('/forgot-password')).toBe(true);
    expect(isSafeInternalPath('/login?next=%2Fdashboard%2Flearn%2Fx')).toBe(true);
  });

  it('rejects off-site and protocol-relative URLs', () => {
    expect(isSafeInternalPath('https://evil.example/reset')).toBe(false);
    expect(isSafeInternalPath('//evil.example/reset')).toBe(false);
  });
});

describe('buildGuestPasswordSetupPath', () => {
  it('prefills a sane email and keeps the course next=', () => {
    const path = buildGuestPasswordSetupPath({
      email: '  BrightTouch@gmail.com ',
      next: '/dashboard/learn/level-1-mould-remediation-2cc96b85',
    });
    expect(path.startsWith('/forgot-password?')).toBe(true);
    const query = new URLSearchParams(path.slice(path.indexOf('?')));
    expect(query.get('paid')).toBe('1');
    expect(query.get('email')).toBe('brighttouch@gmail.com');
    expect(query.get('next')).toBe('/dashboard/learn/level-1-mould-remediation-2cc96b85');
  });

  it('drops a junk email and an off-site next', () => {
    const path = buildGuestPasswordSetupPath({
      email: 'not-an-email',
      next: 'https://evil.example/phish',
    });
    const query = new URLSearchParams(path.slice(path.indexOf('?')));
    expect(query.get('paid')).toBe('1');
    expect(query.get('email')).toBeNull();
    expect(query.get('next')).toBeNull();
  });
});

describe('isUsableRecoveryEmail', () => {
  it('rejects empty and spaced values', () => {
    expect(isUsableRecoveryEmail('')).toBe(false);
    expect(isUsableRecoveryEmail('a b@carsi.com.au')).toBe(false);
    expect(isUsableRecoveryEmail('buyer@carsi.com.au')).toBe(true);
  });
});
