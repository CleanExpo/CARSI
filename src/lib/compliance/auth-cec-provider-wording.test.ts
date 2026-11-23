import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The auth-page tagline names CARSI's standing as a provider (GP-704, from the approved-wording
// module) rather than calling its training accredited;
// per-course status lives on each course page.
const AUTH_PAGES = [
  'app/(auth)/login/page.tsx',
  'app/(auth)/register/page.tsx',
  'app/(auth)/forgot-password/page.tsx',
];

describe('auth page CEC tagline', () => {
  for (const page of AUTH_PAGES) {
    it(`${page} names CARSI's provider standing from the approved-wording module`, () => {
      const src = readFileSync(join(process.cwd(), page), 'utf8');
      expect(src).toContain('Restoration training {FROM_IICRC_APPROVED_CEC_PROVIDER}');
      expect(src).toContain("from '@/lib/iicrc/approved-wording'");
    });
  }
});
