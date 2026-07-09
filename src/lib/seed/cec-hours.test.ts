import { describe, expect, it } from 'vitest';

import { resolveCatalogCecHours, resolveCecHours } from './cec-hours';

describe('CEC hours resolution — IICRC approval discipline (registry SSOT)', () => {
  it('explicit 0 is a hard opt-out: never derives from duration', () => {
    expect(
      resolveCecHours({ cec_hours: 0, duration_hours: 1, short_description: null, description: null })
    ).toBeNull();
  });

  it('explicit 0 is a hard opt-out: never derives from prose', () => {
    expect(
      resolveCecHours({
        cec_hours: 0,
        short_description: 'Continuing Education Credit (CEC) : 3 Hours',
        description: null,
      })
    ).toBeNull();
  });

  it('explicit 0 is a hard opt-out: never derives from meta', () => {
    expect(resolveCecHours({ cec_hours: 0, meta: { cec_hours: 2 } })).toBeNull();
  });

  it('catalog cecHours: 0 opts out even with a durationHours set', () => {
    expect(resolveCatalogCecHours({ cecHours: 0, durationHours: 1 })).toBeNull();
  });

  it('explicit positive values still pass through', () => {
    expect(resolveCecHours({ cec_hours: 3 })).toBe(3);
    expect(resolveCatalogCecHours({ cecHours: 2.5 })).toBe(2.5);
  });

  it('null cec_hours with only a duration never derives — fail-closed (root-cause fix)', () => {
    expect(resolveCecHours({ cec_hours: null, duration_hours: 4 })).toBeNull();
    expect(resolveCatalogCecHours({ cecHours: null, durationHours: 4 })).toBeNull();
  });

  it('prose CEC statements are NOT approval — derivation branch deleted (2026-07-09)', () => {
    expect(
      resolveCecHours({ short_description: 'Continuing Education Credit (CEC) : 3 Hours' })
    ).toBeNull();
    expect(
      resolveCecHours({ description: 'Approved for IICRC Continuing Education Credit (CEC) : 4 Hours' })
    ).toBeNull();
  });

  it('meta CEC keys are NOT approval — derivation branch deleted (2026-07-09)', () => {
    expect(resolveCecHours({ meta: { cec_hours: 2 } })).toBeNull();
    expect(resolveCecHours({ meta: [{ key: 'cec_hours', value: 3 }] })).toBeNull();
  });

  it('an unknown slug gets nothing from the (empty) approvals registry', () => {
    expect(resolveCecHours({ slug: 'no-such-course', cec_hours: null })).toBeNull();
    expect(resolveCatalogCecHours({ slug: 'no-such-course', cecHours: null })).toBeNull();
  });
});
