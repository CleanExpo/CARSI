import { describe, expect, it } from 'vitest';

import {
  FOUND_VIA_OPTIONS,
  INDUSTRY_OPTIONS,
  OTHER_TEXT_MAX_LENGTH,
  surveyMetadata,
  validateSurvey,
} from './purchase-survey';

describe('survey allowlists', () => {
  it('offers the eleven industry choices from the spec, ending in other', () => {
    expect(INDUSTRY_OPTIONS.map((o) => o.value)).toEqual([
      'restoration_technician',
      'carpet_floor_care',
      'commercial_cleaning',
      'facility_manager',
      'property_strata_manager',
      'builder_trade',
      'insurance_claims',
      'healthcare_aged_care',
      'whs_safety',
      'student_career_change',
      'other',
    ]);
  });

  it('offers the eight "how did you find us" choices, ending in other', () => {
    expect(FOUND_VIA_OPTIONS.map((o) => o.value)).toEqual([
      'google_search',
      'ai_assistant',
      'linkedin',
      'facebook_instagram',
      'youtube',
      'colleague_employer',
      'industry_body',
      'other',
    ]);
  });

  it('labels fit in Stripe metadata and values are short keys', () => {
    for (const o of [...INDUSTRY_OPTIONS, ...FOUND_VIA_OPTIONS]) {
      expect(o.value).toMatch(/^[a-z_]{2,40}$/);
      expect(o.label.length).toBeGreaterThan(0);
    }
  });
});

describe('validateSurvey', () => {
  it('accepts allowlisted answers', () => {
    expect(validateSurvey({ industry: 'commercial_cleaning', found_via: 'google_search' })).toEqual({
      ok: true,
      value: { industry: 'commercial_cleaning', found_via: 'google_search' },
    });
  });

  it('accepts one question answered on its own', () => {
    expect(validateSurvey({ found_via: 'linkedin' })).toEqual({ ok: true, value: { found_via: 'linkedin' } });
  });

  it('rejects an empty submission', () => {
    expect(validateSurvey({}).ok).toBe(false);
  });

  it('T1b-2: rejects a value not on the allowlist', () => {
    expect(validateSurvey({ industry: 'astronaut' }).ok).toBe(false);
    expect(validateSurvey({ found_via: 'tiktok' }).ok).toBe(false);
    expect(validateSurvey({ industry: ['commercial_cleaning'] }).ok).toBe(false);
  });

  it('T1b-3: markup is stripped from the other box and the result is bounded', () => {
    const result = validateSurvey({
      industry: 'other',
      industry_other: '<b>Pest</b> control <script>x</script>' + ' and more'.repeat(20),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.industry_other).not.toMatch(/[<>]/);
    expect(result.value.industry_other).toMatch(/^Pest control/);
    expect(result.value.industry_other!.length).toBeLessThanOrEqual(OTHER_TEXT_MAX_LENGTH);
    expect(OTHER_TEXT_MAX_LENGTH).toBe(60);
  });

  it.each([
    'email me jo.citizen@example.com',
    'jo at example dot com jo@example',
    'call 0412 345 678',
    'https://example.com/me',
  ])('T1b-3: contact details in the other box are rejected, never stored: %s', (text) => {
    expect(validateSurvey({ industry: 'other', industry_other: text }).ok).toBe(false);
    expect(validateSurvey({ found_via: 'other', found_via_other: text }).ok).toBe(false);
  });

  it('ignores other text unless other was chosen', () => {
    expect(validateSurvey({ industry: 'whs_safety', industry_other: 'anything' })).toEqual({
      ok: true,
      value: { industry: 'whs_safety' },
    });
  });
});

describe('surveyMetadata', () => {
  it('maps to the svy_* keys with a date, within Stripe limits', () => {
    const md = surveyMetadata(
      { industry: 'other', industry_other: 'Pest control', found_via: 'ai_assistant' },
      new Date('2026-10-29T01:00:00Z')
    );
    expect(md).toEqual({
      svy_ind: 'other',
      svy_ind_other: 'Pest control',
      svy_via: 'ai_assistant',
      svy_at: '2026-10-29',
    });
    for (const [k, v] of Object.entries(md)) {
      expect(k.length).toBeLessThanOrEqual(40);
      expect(v.length).toBeLessThanOrEqual(500);
    }
  });
});
