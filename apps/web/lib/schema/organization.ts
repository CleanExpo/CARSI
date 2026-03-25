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
    sameAs = [
      'https://www.facebook.com/CARSIaus',
      'https://www.linkedin.com/company/carsiaus',
      'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured',
      'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
    ],
  } = input;

  return {
    '@context': 'https://schema.org',
    // Service Area Business: EducationalOrganization (primary) + LocalBusiness (SAB signals)
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': `${url}/#organization`,
    name,
    alternateName: 'Centre for Australian Restoration and Standards Information',
    url,
    logo,
    description:
      "Australia's leading online training platform for disaster restoration professionals. IICRC CEC-approved courses in water, fire, and carpet restoration delivered to students Australia-wide.",
    telephone: '+61457123005',
    email: 'support@carsi.com.au',
    // SAB: postal address only — no street address exposed publicly
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Forest Lake',
      addressRegion: 'QLD',
      addressCountry: 'AU',
    },
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
    serviceType: 'Online Restoration Industry Training',
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
      telephone: '+61457123005',
      email: 'support@carsi.com.au',
      contactType: 'customer service',
      areaServed: 'AU',
      availableLanguage: 'en-AU',
    },
  };
}
