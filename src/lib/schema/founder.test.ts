import { describe, expect, it } from 'vitest';

import {
  CARSI_FOUNDER_ID,
  CARSI_FOUNDER_SAME_AS,
  CARSI_ORG_ID,
  buildFounderPersonSchema,
} from './founder';

describe('buildFounderPersonSchema', () => {
  const schema = buildFounderPersonSchema();

  it('is a Person identifying the founder by name + role', () => {
    expect(schema['@type']).toBe('Person');
    expect(schema['@id']).toBe(CARSI_FOUNDER_ID);
    expect(schema.name).toBe('Phill McGurk');
    expect(schema.jobTitle).toBe('Founder & Lead Instructor');
  });

  it('links the founder to the CARSI organization', () => {
    expect(schema.worksFor).toEqual({ '@id': CARSI_ORG_ID });
  });

  it('carries verified personal profiles as sameAs — and never an email or brand-only string', () => {
    expect(schema.sameAs).toEqual(CARSI_FOUNDER_SAME_AS);
    expect(CARSI_FOUNDER_SAME_AS.length).toBeGreaterThan(0);
    for (const url of CARSI_FOUNDER_SAME_AS as string[]) {
      expect(url).toMatch(/^https:\/\//);
      expect(url).not.toContain('@'); // never an email-derived profile
    }
  });

  it('declares topical authority via knowsAbout', () => {
    expect(Array.isArray(schema.knowsAbout)).toBe(true);
    expect((schema.knowsAbout as string[]).join(' ').toLowerCase()).toContain('iicrc');
  });
});
