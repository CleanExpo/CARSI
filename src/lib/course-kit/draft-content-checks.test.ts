/**
 * GP-740 — every rule has a planted example that must fail, and a correct version that must pass.
 */
import { describe, expect, it } from 'vitest';
import { scanDraftBlock, type DraftTextBlock } from './draft-content-checks';

const SOURCED =
  '<h3>Sources for this lesson</h3><ul><li>https://www.safeworkaustralia.gov.au/</li></ul>';

function lesson(text: string, raw = `<p>${text}</p>${SOURCED}`): DraftTextBlock {
  return { where: 'test-lesson', kind: 'lesson', text, raw };
}
const rules = (block: DraftTextBlock) => scanDraftBlock(block).map((h) => h.rule);

describe('GP-740 exposure-limit dates', () => {
  it('fails an unqualified claim that all Australian WELs start on 1 December 2026', () => {
    expect(
      rules(lesson('All Australian workplace exposure limits start on 1 December 2026.'))
    ).toContain('wel-date-unqualified');
  });
  it('passes the qualified statement', () => {
    expect(
      rules(
        lesson(
          'Most Australian workplace exposure limits start on 1 December 2026, except that Queensland and Victoria keep 15 transition substances on their old limits until 1 December 2029.'
        )
      )
    ).not.toContain('wel-date-unqualified');
  });

  it('fails Queensland softwood dust or Portland cement given a 2027 date', () => {
    expect(
      rules(lesson('In Queensland, the new softwood dust limit applies from 2027.'))
    ).toContain('qld-transition-date');
    expect(rules(lesson('Queensland moves Portland cement to its new limit in 2027.'))).toContain(
      'qld-transition-date'
    );
  });
  it('passes the 2029 transition date', () => {
    expect(
      rules(lesson('Queensland keeps softwood dust on its old limit until 1 December 2029.'))
    ).not.toContain('qld-transition-date');
  });

  it('fails Queensland diesel particulate matter without its interim 0.1 mg/m³ TWA', () => {
    expect(rules(lesson('Queensland regulates diesel particulate matter on site.'))).toContain(
      'qld-dpm-interim'
    );
  });
  it('passes when the interim limit is stated', () => {
    expect(
      rules(
        lesson(
          'Queensland regulates diesel particulate matter with an interim 0.1 mg/m³ TWA through to 1 December 2029.'
        )
      )
    ).not.toContain('qld-dpm-interim');
  });

  it('fails the national benzene limit dated May 2027', () => {
    expect(
      rules(lesson('The national benzene limit drops to 0.2 ppm in May 2027 across Australia.'))
    ).toContain('benzene-date');
  });
  it('passes the 1 June 2027 date', () => {
    expect(
      rules(lesson('In Australia the benzene limit drops to 0.2 ppm (8-hour TWA) on 1 June 2027.'))
    ).not.toContain('benzene-date');
  });
});

describe('GP-740 workplace limits used as home levels', () => {
  it('fails a WEL used as a home or pet clearance level', () => {
    expect(
      rules(
        lesson(
          'Use the workplace exposure limit as the clearance level before the family and pets return home.'
        )
      )
    ).toContain('oel-as-home-level');
  });
  it('passes the warning that says not to', () => {
    expect(
      rules(
        lesson(
          'Never use a workplace exposure limit as a clearance level for a home: it is set for healthy adult workers.'
        )
      )
    ).not.toContain('oel-as-home-level');
  });
});

describe('GP-740 exposure-limit figures carry jurisdiction and date', () => {
  it('fails a figure with no jurisdiction or date', () => {
    expect(rules(lesson('The exposure standard for carbon monoxide is 30 ppm.'))).toContain(
      'exposure-limit-incomplete'
    );
  });
  it('passes a figure with jurisdiction and date', () => {
    expect(
      rules(lesson('In New Zealand the 2026 WES for carbon monoxide is 20 ppm as an 8-hour TWA.'))
    ).not.toContain('exposure-limit-incomplete');
  });
});

describe('GP-740 unsourced health claims', () => {
  const claim = 'Mould spores are linked to asthma symptoms in sensitive occupants.';
  it('fails a lesson with a health claim and no source', () => {
    expect(rules(lesson(claim, `<p>${claim}</p>`))).toContain('unsourced-health-claim');
  });
  it('passes the same claim in a sourced lesson', () => {
    expect(rules(lesson(claim))).not.toContain('unsourced-health-claim');
  });
  it('does not apply to quiz items', () => {
    expect(rules({ where: 'q', kind: 'quiz', text: claim })).not.toContain(
      'unsourced-health-claim'
    );
  });
});

describe('GP-740 copied standard text', () => {
  it('fails a passage with standard-body cite density', () => {
    const pasted =
      'Per ANSI/IICRC S500 Section 12.3.4 the restorer shall document readings. ' +
      'Under 12.3.5 the restorer shall confirm dry standards and under 12.4.1 the restorer shall ' +
      'record equipment. Section 12.5 sets the requirement and the restorer shall comply with ' +
      'every listed clause before the job is closed and the documentation is handed over.';
    expect(rules(lesson(pasted))).toContain('standard-excerpt');
  });
  it('passes a nominative reference', () => {
    expect(
      rules(
        lesson('This course is aligned to ANSI/IICRC S500 and written for Australian conditions.')
      )
    ).not.toContain('standard-excerpt');
  });
});

describe('GP-740 false-positive guards', () => {
  it('does not treat the Safe Work Australia page title as a scope claim', () => {
    expect(
      rules(
        lesson('Safe Work Australia, New workplace exposure limits apply from 1 December 2026.')
      )
    ).not.toContain('wel-date-unqualified');
  });
  it('does not read quiz distractor figures as incomplete teaching', () => {
    expect(
      rules({ where: 'q', kind: 'quiz', text: 'The exposure standard is 30 ppm.' })
    ).not.toContain('exposure-limit-incomplete');
  });
});

describe('GP-740 single-substance dates', () => {
  it('does not read one substance carrying into the WEL list as a claim about every limit', () => {
    expect(
      rules(
        lesson(
          'In Australia the 8-hour exposure standard for silica is 0.05 mg/m³; it carries into the WEL list on 1 December 2026 at the same value.'
        )
      )
    ).not.toContain('wel-date-unqualified');
  });
  it('still fails "Australia moves to Workplace Exposure Limits on 1 December 2026"', () => {
    expect(
      rules(lesson('Australia moves to Workplace Exposure Limits on 1 December 2026.'))
    ).toContain('wel-date-unqualified');
  });
});
