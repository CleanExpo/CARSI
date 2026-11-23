import { describe, expect, it } from 'vitest';

import { isEnrollmentCompleted } from './enrollment-completion';

describe('isEnrollmentCompleted (GP-769)', () => {
  it.each(['completed', 'Completed', ' complete '])('treats %j as completed', (status) => {
    expect(isEnrollmentCompleted(status)).toBe(true);
  });

  it.each(['active', 'revoked', 'refunded', '', null, undefined])(
    'treats %j as not completed',
    (status) => {
      expect(isEnrollmentCompleted(status)).toBe(false);
    },
  );
});
