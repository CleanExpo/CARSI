import { describe, expect, it } from 'vitest';

import { checkCecHours } from './cec-guard';

describe('checkCecHours', () => {
  it('REFUSES when cecHours is absent (undefined)', () => {
    const r = checkCecHours(undefined);
    expect(r.level).toBe('refuse');
    expect(r.message).toMatch(/ABSENT/);
  });

  it('WARNS loudly on the legacy null (duration-derived) value', () => {
    const r = checkCecHours(null);
    expect(r.level).toBe('warn');
    expect(r.message).toMatch(/null/);
  });

  it('is OK for an explicit 0 (the "not CEC-approved" opt-out)', () => {
    const r = checkCecHours(0);
    expect(r.level).toBe('ok');
    expect(r.message).toMatch(/not CEC-approved/);
  });

  it('is OK for a positive founder-set value', () => {
    const r = checkCecHours(4);
    expect(r.level).toBe('ok');
    expect(r.message).toMatch(/4/);
  });

  it('REFUSES a negative or NaN value', () => {
    expect(checkCecHours(-1).level).toBe('refuse');
    expect(checkCecHours(Number.NaN).level).toBe('refuse');
  });
});
