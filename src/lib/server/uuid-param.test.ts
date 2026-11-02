import { describe, expect, it } from 'vitest';

import { isUuidParam } from './uuid-param';

describe('isUuidParam', () => {
  it('accepts canonical UUIDs', () => {
    expect(isUuidParam('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects garbage that used to 500 Prisma', () => {
    expect(isUuidParam('not-a-uuid')).toBe(false);
    expect(isUuidParam('../../../etc/passwd')).toBe(false);
    expect(isUuidParam('')).toBe(false);
  });
});
