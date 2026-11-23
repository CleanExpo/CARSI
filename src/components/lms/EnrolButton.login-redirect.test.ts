/**
 * GP-745 — the logged-out Enrol redirect goes to /login on the same origin and carries the page
 * to return to.
 */
import { describe, expect, it } from 'vitest';

import { loginRedirectHref } from './EnrolButton';

describe('GP-745 Enrol login redirect', () => {
  it('stays on the current origin and carries next', () => {
    const dest = new URL(
      loginRedirectHref('/courses/mould-remediation-fundamentals', 'https://carsi.example')
    );
    expect(dest.origin).toBe('https://carsi.example');
    expect(dest.pathname).toBe('/login');
    expect(dest.searchParams.get('next')).toBe('/courses/mould-remediation-fundamentals');
  });

  it('cannot be pushed to another origin by a crafted return path', () => {
    const dest = new URL(loginRedirectHref('//evil.example/x', 'https://carsi.example'));
    expect(dest.origin).toBe('https://carsi.example');
    expect(dest.searchParams.get('next')).toBe('//evil.example/x');
  });

  it('keeps a return path with its own query string intact', () => {
    const next = '/courses/x?ref=email&utm=a';
    const dest = new URL(loginRedirectHref(next, 'https://carsi.example'));
    expect(dest.searchParams.get('next')).toBe(next);
    expect([...dest.searchParams.keys()]).toEqual(['next']);
  });
});
