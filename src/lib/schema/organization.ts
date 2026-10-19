/**
 * lib/schema/organization.ts
 * Generates CARSI's site-wide schema.org/EducationalOrganization JSON-LD.
 * Intended for use in layout.tsx (injected on every page).
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import { CARSI_SOCIAL_PROFILE_URLS } from '@/lib/brand/social-profiles';
import { CARSI_ENTITY, entityPostalAddress } from '@/lib/seo/carsi-entity';

import type { SchemaObject } from './shared';

export interface OrganizationSchemaInput {
  name?: string;
  url?: string;
  logo?: string;
  sameAs?: string[];
}

export function buildOrganizationSchema(input: OrganizationSchemaInput = {}): SchemaObject {
  const {
    name = CARSI_ENTITY.name,
    url = CARSI_ENTITY.url,
    logo = CARSI_ENTITY.logo,
    sameAs = [...CARSI_SOCIAL_PROFILE_URLS],
  } = input;

  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${url}/#organization`,
    name,
    alternateName: 'Centre for Australian Restoration and Standards Information',
    url,
    logo,
    legalName: CARSI_ENTITY.legalName,
    // One entity record for schema, footer and /llms.txt (src/lib/seo/carsi-entity.ts).
    description: CARSI_ENTITY.description,
    email: CARSI_ENTITY.email,
    // SAB: postal address only — no street address exposed publicly
    address: entityPostalAddress(),
    // SAB: explicit state-by-state service area coverage
    areaServed: [
      {
        '@type': 'AdministrativeArea',
        name: 'New South Wales',
        sameAs: 'https://en.wikipedia.org/wiki/New_South_Wales',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Victoria',
        sameAs: 'https://en.wikipedia.org/wiki/Victoria_(Australia)',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Queensland',
        sameAs: 'https://en.wikipedia.org/wiki/Queensland',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Western Australia',
        sameAs: 'https://en.wikipedia.org/wiki/Western_Australia',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'South Australia',
        sameAs: 'https://en.wikipedia.org/wiki/South_Australia',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Tasmania',
        sameAs: 'https://en.wikipedia.org/wiki/Tasmania',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Australian Capital Territory',
        sameAs: 'https://en.wikipedia.org/wiki/Australian_Capital_Territory',
      },
      {
        '@type': 'AdministrativeArea',
        name: 'Northern Territory',
        sameAs: 'https://en.wikipedia.org/wiki/Northern_Territory',
      },
    ],
    knowsAbout: [
      'IICRC certifications',
      'water restoration technician',
      'fire and smoke restoration',
      'carpet cleaning technician',
      'applied structural drying',
      'disaster recovery',
      'restoration standards',
      'insurance claims Australia',
      'building restoration',
    ],
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@carsi.com.au',
      url: `${url}/contact`,
      areaServed: 'AU',
      availableLanguage: 'en',
    },
  };
}
