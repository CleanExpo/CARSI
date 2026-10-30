import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The auth-page tagline names CARSI's standing as a provider rather than calling
// all of its training accredited; per-course status lives on each course page.
const AUTH_PAGES = [
  'app/(auth)/login/page.tsx',
  'app/(auth)/register/page.tsx',
  'app/(auth)/forgot-password/page.tsx',
];

describe('auth page CEC tagline', () => {
  for (const page of AUTH_PAGES) {
    it(`${page} names CARSI as an IICRC CEC Accredited provider`, () => {
      const src = readFileSync(join(process.cwd(), page), 'utf8');
      expect(src).not.toMatch(/IICRC CEC Accredited restoration (training|courses)/i);
      expect(src).toContain('Restoration training from an IICRC CEC Accredited provider');
    });
  }
});
