/**
 * lib/schema/founder.ts
 * Canonical schema.org Person for CARSI's founder — the E-E-A-T author identity.
 *
 * Wired into the site-wide Organization JSON-LD (`OrganizationSchema`) as
 * `founder`, and emitted as a standalone Person node so Google/answer-engines
 * can resolve "who stands behind CARSI" to a real, verifiable person.
 *
 * `sameAs` MUST contain only verified, personal profiles of the named person —
 * never a brand/business account (that would misattribute the entity) and never
 * an email-derived string. LinkedIn + the RestoreAssist author page are the
 * sourced, verified profiles; a professional Facebook/Instagram URL can be
 * appended once confirmed.
 */

import type { SchemaObject } from './shared';

export const CARSI_ORG_ID = 'https://carsi.com.au/#organization';
export const CARSI_FOUNDER_ID = 'https://carsi.com.au/#founder';

/** Verified personal profiles only (E-E-A-T sameAs). */
export const CARSI_FOUNDER_SAME_AS: string[] = [
  'https://www.linkedin.com/in/phill-mcgurk',
  'https://restoreassist.com.au/authors/phill-mcgurk',
];

export const CARSI_FOUNDER_KNOWS_ABOUT: string[] = [
  'IICRC certifications',
  'water damage restoration',
  'fire and smoke restoration',
  'applied structural drying',
  'carpet cleaning',
  'mould remediation',
  'restoration industry standards',
  'continuing education credits (CEC)',
];

/** The founder Person node, referenced from Organization via `founder`. */
export function buildFounderPersonSchema(): SchemaObject {
  return {
    '@type': 'Person',
    '@id': CARSI_FOUNDER_ID,
    name: 'Phill McGurk',
    jobTitle: 'Founder & Lead Instructor',
    description: 'IICRC-certified restoration practitioner and founder of CARSI.',
    worksFor: { '@id': CARSI_ORG_ID },
    knowsAbout: CARSI_FOUNDER_KNOWS_ABOUT,
    sameAs: CARSI_FOUNDER_SAME_AS,
  };
}
