import { describe, expect, it } from 'vitest';

import {
  GOV_GUIDE_DOWNLOAD_PATH,
  GOV_GUIDE_LEAD_STATUS,
  buildGovGuideLeadMessage,
  isValidLeadEmail,
  normaliseLeadEmail,
  sanitiseLeadContext,
} from './lead-magnet-capture';

describe('lead-magnet-capture', () => {
  describe('isValidLeadEmail', () => {
    it('accepts a well-formed address', () => {
      expect(isValidLeadEmail('jane@example.com.au')).toBe(true);
    });
    it('rejects malformed / non-string input', () => {
      expect(isValidLeadEmail('nope')).toBe(false);
      expect(isValidLeadEmail('a@b')).toBe(false);
      expect(isValidLeadEmail('')).toBe(false);
      expect(isValidLeadEmail(undefined)).toBe(false);
      expect(isValidLeadEmail(42)).toBe(false);
    });
  });

  it('normaliseLeadEmail lower-cases and trims', () => {
    expect(normaliseLeadEmail('  Jane@Example.COM  ')).toBe('jane@example.com');
  });

  describe('sanitiseLeadContext', () => {
    it('strips angle brackets and caps length', () => {
      const out = sanitiseLeadContext({
        source: '<script>x</script>',
        topic: 'a'.repeat(500),
        intent: 'download',
        pageUrl: 'https://carsi.com.au/resources/government-restoration-panels',
      });
      expect(out.source).not.toContain('<');
      expect(out.source).not.toContain('>');
      expect((out.topic ?? '').length).toBeLessThanOrEqual(160);
      expect(out.intent).toBe('download');
    });
    it('returns undefined fields for missing input', () => {
      expect(sanitiseLeadContext(undefined)).toEqual({
        source: undefined,
        topic: undefined,
        intent: undefined,
        pageUrl: undefined,
      });
    });
  });

  describe('buildGovGuideLeadMessage', () => {
    it('always records the lead magnet and includes provided context', () => {
      const msg = buildGovGuideLeadMessage({ source: 'landing', topic: 'Gov guide', intent: 'download' });
      expect(msg).toContain('GP-199');
      expect(msg).toContain('Lead source: landing');
      expect(msg).toContain('Lead topic: Gov guide');
      expect(msg).toContain('Lead intent: download');
    });
    it('omits empty context lines', () => {
      const msg = buildGovGuideLeadMessage({});
      expect(msg).toContain('Lead magnet:');
      expect(msg).not.toContain('Lead source:');
    });
  });

  it('exposes stable constants', () => {
    expect(GOV_GUIDE_DOWNLOAD_PATH).toBe('/downloads/carsi-government-contractor-guide.pdf');
    expect(GOV_GUIDE_LEAD_STATUS).toBe('gp199_gov_guide');
  });
});
