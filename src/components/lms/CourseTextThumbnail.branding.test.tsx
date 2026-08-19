import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseTextThumbnail, stripDisciplineAcronym } from './CourseTextThumbnail';

/**
 * GP-523 regression — the `/courses` catalogue must not render IICRC discipline ACRONYM cards.
 *
 * Live on 12/08/2026 the catalogue card rendered the raw discipline code twice per card (a
 * badge and an oversized watermark), so `https://carsi.com.au/courses` shipped 26 × "CCT",
 * 60 × "WRT", 46 × "ASD" and so on in its rendered text. CARSI issues its own Southern
 * Hemisphere Restoration Designations and may not brand a course with an IICRC
 * Registered-Training-School discipline acronym (CLAUDE.md, founder 2026-07-10).
 *
 * These tests assert ABSENCE, which is only meaningful if the harness can observe a
 * PRESENCE — so each block first proves the assertion can fail (positive control) before
 * asserting the fixed behaviour.
 */

const ACRONYMS = ['WRT', 'CRT', 'ASD', 'OCT', 'CCT', 'FSRT', 'AMRT', 'TCST'] as const;
const ACRONYM_RE = /\b(WRT|CRT|ASD|OCT|CCT|FSRT|AMRT|TCST)\b/;

describe('positive control — the detector can see an acronym', () => {
  it('flags the exact pre-fix live string', () => {
    // Verbatim from the live /courses card text captured 17/08/2026.
    expect(ACRONYM_RE.test('WRT Free Water Restoration Beginner')).toBe(true);
    expect(ACRONYM_RE.test('ASD ASD Free Structural Drying Intermediate')).toBe(true);
  });

  it('does not fire on ordinary Australian restoration copy', () => {
    expect(ACRONYM_RE.test('Water damage restoration for Australian technicians')).toBe(false);
  });
});

describe('stripDisciplineAcronym', () => {
  it('removes a leading discipline acronym from an imported category label', () => {
    expect(stripDisciplineAcronym('CCT Commercial Carpet')).toBe('Commercial Carpet');
    expect(stripDisciplineAcronym('WRT — Water Restoration')).toBe('Water Restoration');
    expect(stripDisciplineAcronym('ASD/Structural Drying')).toBe('Structural Drying');
  });

  it('returns empty when the category is nothing but the acronym', () => {
    expect(stripDisciplineAcronym('ASD')).toBe('');
    expect(stripDisciplineAcronym('cct')).toBe('');
  });

  it('leaves a compliant plain-English category untouched', () => {
    expect(stripDisciplineAcronym('Commercial Carpet')).toBe('Commercial Carpet');
    expect(stripDisciplineAcronym('Water Restoration')).toBe('Water Restoration');
  });

  it('does not eat a word that merely starts with the same letters', () => {
    expect(stripDisciplineAcronym('ASDF Cleaning')).toBe('ASDF Cleaning');
  });
});

describe('CourseTextThumbnail never renders an IICRC discipline acronym', () => {
  for (const code of ACRONYMS) {
    it(`renders no "${code}" when the stored discipline is ${code}`, () => {
      const markup = renderToStaticMarkup(
        <CourseTextThumbnail
          variant="card"
          title="Commercial Carpet Care — Core Methods"
          category="Commercial Carpet"
          discipline={code}
          priceLabel="Free"
          isFree
          level="Foundation"
          moduleCount={8}
        />
      );
      expect(markup).not.toMatch(ACRONYM_RE);
    });
  }

  it('renders no acronym when only the legacy category carries one', () => {
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail
        variant="card"
        title="Carpet Cleaning Basics"
        category="CCT Commercial Carpet"
        discipline={null}
        priceLabel="Free"
        isFree
      />
    );
    expect(markup).not.toMatch(ACRONYM_RE);
    // The plain-English topic survives — this is a de-branding, not a deletion. The label
    // resolves to "Carpet Cleaning" (the mapped topic for the legacy category prefix).
    expect(markup).toMatch(/Carpet/);
  });

  it('still shows the plain-English restoration topic for a stored discipline', () => {
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail
        variant="card"
        title="Introduction to Basic Carpet Cleaning and Drying"
        category="Carpet Cleaning"
        discipline="CCT"
        priceLabel="Free"
        isFree
      />
    );
    expect(markup).toContain('Carpet Cleaning');
    expect(markup).not.toMatch(ACRONYM_RE);
  });

  it('does not fall back to the raw code for an unmapped discipline value', () => {
    // The live API has emitted non-standard codes (HST, UFT, RCT, CDS). Fail closed.
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail
        variant="card"
        title="Specialty course"
        category="Specialised"
        discipline="HST"
        priceLabel="Free"
        isFree
      />
    );
    expect(markup).not.toContain('HST');
  });

  it('applies to the hero variant too, not just the card', () => {
    const markup = renderToStaticMarkup(
      <CourseTextThumbnail
        variant="hero"
        title="Commercial Carpet Care — Core Methods"
        category="CCT Commercial Carpet"
        discipline="CCT"
        priceLabel="Free"
        isFree
      />
    );
    expect(markup).not.toMatch(ACRONYM_RE);
  });
});
