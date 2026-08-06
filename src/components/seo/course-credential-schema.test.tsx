import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseSchema } from './JsonLd';

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

  it('NEVER asserts CEC hours or an IICRC provider number in structured data', () => {
    const markup = renderToStaticMarkup(
      <CourseSchema {...base} credentialAwarded="CARSI Water Restoration Practitioner" />
    );
    expect(markup).not.toMatch(/CEC/i);
    expect(markup).not.toMatch(/IICRC/i);
    expect(markup).not.toMatch(/provider\s*number/i);
  });
});
