import { CARSI_SOCIAL_PROFILES } from '@/lib/brand/social-profiles';

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
  sameAs: CARSI_SOCIAL_PROFILES.map((p) => ({ label: p.label, url: p.url })),
  /** Factual, no superlatives: answer engines quote this sentence. */
  description:
    'Australian online training for cleaning and restoration professionals, covering water, fire, mould and carpet cleaning. CARSI is an IICRC CEC Accredited provider.',
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
