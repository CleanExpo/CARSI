import { CARSI_SOCIAL_PROFILES } from '@/lib/brand/social-profiles';

import { CARSI_PROVIDER_STATUS } from '@/lib/iicrc/approved-wording';
/**
 * The single CARSI entity record read by the Organization JSON-LD, the public footer and
 * /llms.txt (see carsi-entity.test.tsx). Change a contact detail here, nowhere else.
 *
 * Social profile URLs are owned by src/lib/brand/social-profiles.ts (each verified live);
 * this record derives sameAs from it so the two can never drift.
 *
 * The address is postal only: CARSI publishes no street address.
 */
export const CARSI_ENTITY = {
  name: 'CARSI',
  legalName: 'CARSI Pty Ltd',
  url: 'https://carsi.com.au',
  logo: 'https://carsi.com.au/logo.png',
  email: 'support@carsi.com.au',
  address: {
    postOfficeBox: 'PO Box 4309',
    locality: 'Forest Lake',
    region: 'QLD',
    postcode: '4078',
    country: 'AU',
  },
  /**
   * Countries CARSI's online courses are offered in: Australia and New Zealand
   * (DECISIONS #35). ISO 3166-1 alpha-2, read by the schema contactPoint and areaServed.
   */
  serviceCountries: ['AU', 'NZ'],
  sameAs: CARSI_SOCIAL_PROFILES.map((p) => ({ label: p.label, url: p.url })),
  /** Factual, no superlatives: answer engines quote this sentence. */
  description: `Australian online training for cleaning and restoration professionals, covering water, fire, mould and carpet cleaning. ${CARSI_PROVIDER_STATUS}`,
} as const;

/** "PO Box 4309, Forest Lake QLD 4078" — the form the footer and llms.txt print. */
export function postalAddressLine(): string {
  const a = CARSI_ENTITY.address;
  return `${a.postOfficeBox}, ${a.locality} ${a.region} ${a.postcode}`;
}

/** schema.org PostalAddress for the Organization JSON-LD. */
export function entityPostalAddress() {
  const a = CARSI_ENTITY.address;
  return {
    '@type': 'PostalAddress',
    postOfficeBoxNumber: a.postOfficeBox,
    addressLocality: a.locality,
    addressRegion: a.region,
    postalCode: a.postcode,
    addressCountry: a.country,
  };
}

export const ENTITY_SAME_AS: string[] = CARSI_ENTITY.sameAs.map((s) => s.url);

const AU_STATES_AND_TERRITORIES = [
  ['New South Wales', 'New_South_Wales'],
  ['Victoria', 'Victoria_(Australia)'],
  ['Queensland', 'Queensland'],
  ['Western Australia', 'Western_Australia'],
  ['South Australia', 'South_Australia'],
  ['Tasmania', 'Tasmania'],
  ['Australian Capital Territory', 'Australian_Capital_Territory'],
  ['Northern Territory', 'Northern_Territory'],
] as const;

/**
 * schema.org areaServed for the Organization JSON-LD: each Australian state and territory,
 * then New Zealand as a country. Both Organization builders read this, so they cannot drift.
 */
export function entityAreaServed() {
  return [
    ...AU_STATES_AND_TERRITORIES.map(([name, wiki]) => ({
      '@type': 'AdministrativeArea',
      name,
      sameAs: `https://en.wikipedia.org/wiki/${wiki}`,
    })),
    {
      '@type': 'Country',
      name: 'New Zealand',
      sameAs: 'https://en.wikipedia.org/wiki/New_Zealand',
    },
  ];
}
