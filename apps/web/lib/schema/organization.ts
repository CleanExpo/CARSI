/**
 * lib/schema/organization.ts
 * Generates CARSI's site-wide schema.org/EducationalOrganization JSON-LD.
 * Intended for use in layout.tsx (injected on every page).
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import type { SchemaObject } from './shared';

export interface OrganizationSchemaInput {
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

export function buildOrganizationSchema(input: OrganizationSchemaInput = {}): SchemaObject {
  const {
    name = 'CARSI',
    url = 'https://carsi.com.au',
    logo = 'https://carsi.com.au/logo.png',
    sameAs = ['https://nrpg.com.au', 'https://disasterrecovery.com.au'],
  } = input;

  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name,
    url,
    logo,
    description:
      "Australia's leading industry body for disaster restoration education, research, and professional standards.",
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Australia',
    },
    knowsAbout: [
      'Disaster recovery',
      'Carpet restoration',
      'Flood damage',
      'Fire restoration',
      'Insurance claims Australia',
      'Restoration certifications',
    ],
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@carsi.com.au',
      contactType: 'customer service',
    },
  };
}
