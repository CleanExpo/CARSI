import { describe, expect, it } from 'vitest';

import { buildUnsubscribeUrl } from './email-preferences';

describe('buildUnsubscribeUrl', () => {
  it('builds a public /unsubscribe URL with the token query-encoded', () => {
    expect(buildUnsubscribeUrl('https://carsi.com.au', 'abc.def')).toBe(
      'https://carsi.com.au/unsubscribe?token=abc.def'
    );
  });

  it('strips a trailing slash from the origin and encodes token specials', () => {
    expect(buildUnsubscribeUrl('https://carsi.com.au/', 'a+b/c=')).toBe(
      'https://carsi.com.au/unsubscribe?token=a%2Bb%2Fc%3D'
    );
  });
});
