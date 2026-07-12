import { describe, expect, it } from 'vitest';

import { buildApiCorsHeaders } from './api-cors';

/**
 * WS5 — the /api/* CORS grant must FAIL CLOSED. The bug: next.config emitted
 * `Access-Control-Allow-Credentials: true` with `Access-Control-Allow-Origin:
 * NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'`, so an unset prod env
 * advertised a credentialed cross-origin grant to http://localhost:3000.
 */
function keys(hs: { key: string; value: string }[]): string[] {
  return hs.map((h) => h.key);
}

describe('buildApiCorsHeaders', () => {
  it('omits Allow-Origin + Allow-Credentials when the frontend URL is unset', () => {
    for (const unset of [undefined, '', '   ']) {
      const hs = buildApiCorsHeaders(unset);
      expect(keys(hs)).not.toContain('Access-Control-Allow-Origin');
      expect(keys(hs)).not.toContain('Access-Control-Allow-Credentials');
      // Methods/Headers are still present (they carry no credential risk).
      expect(keys(hs)).toContain('Access-Control-Allow-Methods');
    }
  });

  it('echoes exactly the configured origin with credentials when set', () => {
    const hs = buildApiCorsHeaders('https://carsi.com.au');
    const map = Object.fromEntries(hs.map((h) => [h.key, h.value]));
    expect(map['Access-Control-Allow-Origin']).toBe('https://carsi.com.au');
    expect(map['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('never falls back to localhost with credentials', () => {
    const hs = buildApiCorsHeaders(undefined);
    expect(hs.some((h) => h.value === 'http://localhost:3000')).toBe(false);
  });
});
