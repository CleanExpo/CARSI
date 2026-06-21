import { describe, expect, it } from 'vitest';

import { clientIpFrom, UNKNOWN_IP } from './rate-limit';

describe('clientIpFrom', () => {
  it('takes the first x-forwarded-for hop', () => {
    expect(clientIpFrom('1.2.3.4, 5.6.7.8', null)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when there is no forwarded-for', () => {
    expect(clientIpFrom(null, '9.9.9.9')).toBe('9.9.9.9');
  });

  it('falls back to UNKNOWN_IP when no headers are present', () => {
    expect(clientIpFrom(null, null)).toBe(UNKNOWN_IP);
  });

  it('ignores a blank forwarded-for and uses real-ip', () => {
    expect(clientIpFrom('   ', '8.8.8.8')).toBe('8.8.8.8');
  });
});
