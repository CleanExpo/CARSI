import { describe, expect, it } from 'vitest';

import { scanMany, scanText } from './iicrc-phrases';

describe('scanText', () => {
  it('flags "get IICRC certified"', () => {
    expect(scanText('Get IICRC certified fast').length).toBeGreaterThan(0);
  });
  it('flags bare "IICRC course"', () => {
    expect(scanText('Enrol in our IICRC course').length).toBeGreaterThan(0);
  });
  it('allows the compliant "IICRC CEC course"', () => {
    expect(scanText('Enrol in our IICRC CEC course')).toEqual([]);
  });
  it('flags bare "IICRC Accredited" but allows "IICRC CEC Accredited"', () => {
    expect(scanText('IICRC Accredited provider').length).toBeGreaterThan(0);
    expect(scanText('IICRC CEC Accredited provider')).toEqual([]);
  });
  it('leaves ordinary restoration copy untouched', () => {
    expect(scanText('This WRT-aligned CEC training covers Category 1 water.')).toEqual([]);
  });
  it('flags IICRC endorsement claims', () => {
    expect(scanText('CARSI is endorsed by the IICRC').length).toBeGreaterThan(0);
    expect(scanText('an IICRC-endorsed provider').length).toBeGreaterThan(0);
  });
  it('flags IICRC partnership claims', () => {
    expect(scanText('our IICRC partnership').length).toBeGreaterThan(0);
    expect(scanText('CARSI, an IICRC partner').length).toBeGreaterThan(0);
  });
  it('flags "promoted by the IICRC"', () => {
    expect(scanText('training promoted by the IICRC').length).toBeGreaterThan(0);
  });
  it('flags IICRC Approved School/Instructor status claims but allows the third-person certification-route fact', () => {
    expect(scanText('CARSI is an IICRC Approved School').length).toBeGreaterThan(0);
    expect(scanText('delivered by an IICRC Approved Instructor').length).toBeGreaterThan(0);
    expect(
      scanText('IICRC certification is obtained through an IICRC-approved school and examination.')
    ).toEqual([]);
  });
  it('flags COACH8 (founder brand-exclusion rule)', () => {
    expect(scanText('brought to you by COACH8').length).toBeGreaterThan(0);
    expect(scanText('the COACH 8 masterclass').length).toBeGreaterThan(0);
  });
  it('carries the caller-supplied locator through', () => {
    const hits = scanText('Get IICRC certified', 'lesson-9');
    expect(hits[0].where).toBe('lesson-9');
  });
});

describe('scanMany', () => {
  it('aggregates hits across entries', () => {
    const hits = scanMany([
      { text: 'clean copy', where: 'a' },
      { text: 'Get IICRC certified', where: 'b' },
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0].where).toBe('b');
  });
});
