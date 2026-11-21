/**
 * lib/schema/organization.ts
 * Generates CARSI's site-wide schema.org/EducationalOrganization JSON-LD.
 * Intended for use in layout.tsx (injected on every page).
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import { CARSI_SOCIAL_PROFILE_URLS } from '@/lib/brand/social-profiles';
import { CARSI_ENTITY, entityAreaServed, entityPostalAddress } from '@/lib/seo/carsi-entity';

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
    // SAB: each AU state and territory, plus New Zealand (DECISIONS #35)
    areaServed: entityAreaServed(),
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
      areaServed: [...CARSI_ENTITY.serviceCountries],
      availableLanguage: 'en',
    },
  };
}
