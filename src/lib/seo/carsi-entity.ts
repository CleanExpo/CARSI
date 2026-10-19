/**
 * The single CARSI entity record read by the Organization JSON-LD, the public footer and
 * /llms.txt (see carsi-entity.test.tsx). Change a contact detail here, nowhere else.
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
  sameAs: [
    { label: 'Facebook', url: 'https://www.facebook.com/CARSIaus' },
    { label: 'YouTube', url: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/company/carsiaus' },
    { label: 'Spotify', url: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG' },
  ],
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
