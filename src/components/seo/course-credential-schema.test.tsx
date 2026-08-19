import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseSchema, CREDENTIAL_DISCLAIMER } from './JsonLd';

/**
 * Two independent blind critics judged this page's credential standing and both landed on the
 * same demand: an employer or insurer must be able to establish what the credential IS without
 * phoning anyone. Prose alone cannot satisfy a machine reader, so the Course node carries an
 * EducationalOccupationalCredential.
 *
 * The guarded failure is OVER-claiming. Structured data is repeated by machines without the
 * hedging a human applies to prose, so a fabricated CEC-hour or IICRC provider claim here is
 * worse than silence. Those assertions are tested for ABSENCE, not merely left untested.
 */
function parseSchema(markup: string): Record<string, unknown> {
  const match = markup.match(/<script[^>]*>(.*)<\/script>/s);
  if (!match) throw new Error('no ld+json script rendered');
  return JSON.parse(match[1].replace(/&quot;/g, '"')) as Record<string, unknown>;
}

const base = {
  name: 'Water Damage Restoration — Essentials',
  description: 'Essentials of water damage restoration.',
  url: 'https://carsi.com.au/courses/water-damage-essentials',
};

describe('CourseSchema credential', () => {
  it('emits an EducationalOccupationalCredential when the course awards a designation', () => {
    const schema = parseSchema(
      renderToStaticMarkup(
        <CourseSchema {...base} credentialAwarded="CARSI Water Restoration Practitioner" />
      )
    );
    const cred = schema.educationalCredentialAwarded as Record<string, unknown>;
    expect(cred).toBeDefined();
    expect(cred['@type']).toBe('EducationalOccupationalCredential');
    expect(cred.name).toBe('CARSI Water Restoration Practitioner');
  });

  it('names CARSI as the recognising body, tying the credential to a real issuer', () => {
    const schema = parseSchema(
      renderToStaticMarkup(<CourseSchema {...base} credentialAwarded="CARSI Mould Practitioner" />)
    );
    const cred = schema.educationalCredentialAwarded as Record<string, unknown>;
    expect(cred.recognizedBy).toEqual({ '@id': 'https://carsi.com.au/#organization' });
  });

  it('omits the credential entirely when no designation is awarded — absent, never guessed', () => {
    const schema = parseSchema(renderToStaticMarkup(<CourseSchema {...base} />));
    expect(schema.educationalCredentialAwarded).toBeUndefined();
  });

  it('carries the not-a-certification disclaimer INTO the machine-readable payload', () => {
    const schema = parseSchema(
      renderToStaticMarkup(
        <CourseSchema {...base} credentialAwarded="CARSI Water Restoration Practitioner" />
      )
    );
    const cred = schema.educationalCredentialAwarded as Record<string, unknown>;
    // An answer engine lifts this node out of the page. Without the disclaimer it reads as an
    // unqualified occupational credential — the careful prose never reaches the machine reader.
    expect(cred.description).toBe(CREDENTIAL_DISCLAIMER);
    expect(cred.description).toMatch(/not an IICRC certification/);
    expect(cred.url).toBe('https://carsi.com.au/verify/training-record');
  });

  it('NEVER asserts a CEC hour count or an IICRC provider number', () => {
    const markup = renderToStaticMarkup(
      <CourseSchema {...base} credentialAwarded="CARSI Water Restoration Practitioner" />
    );
    // Guards over-CLAIMING, not the word itself — the disclaimer names IICRC in a negation, which
    // is the opposite of a claim. What must never appear is a NUMBER attached to CEC, or any
    // provider/approval identifier. Both are founder-confirmed data with a fail-closed registry.
    expect(markup).not.toMatch(/\d+\s*(hour|hr|CEC)/i);
    expect(markup).not.toMatch(/CEC[^.]{0,20}\d/i);
    expect(markup).not.toMatch(/(provider|approval|registration)\s*(number|no\.?|id)/i);
  });
});
