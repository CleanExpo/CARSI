import { describe, expect, it } from 'vitest';

import { marketingPackErrorFromResponse } from '@/lib/coaching-portal/marketing-pack/api-messages';

describe('marketingPackErrorFromResponse', () => {
  it('prefers server detail', () => {
    expect(marketingPackErrorFromResponse(500, { detail: 'Custom.' })).toBe('Custom.');
  });

  it('maps common statuses when detail is missing', () => {
    expect(marketingPackErrorFromResponse(401, {})).toMatch(/Sign in/i);
    expect(marketingPackErrorFromResponse(429, null)).toMatch(/recently/i);
    expect(marketingPackErrorFromResponse(404, {})).toMatch(/No marketing pack/i);
  });
});
