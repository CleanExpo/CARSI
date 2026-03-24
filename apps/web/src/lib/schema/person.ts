/**
 * lib/schema/person.ts
 * Generates schema.org/Person + LocalBusiness JSON-LD from professionals rows.
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import type { SchemaObject } from './shared';

export interface PersonSchemaInput {
  name: string;
  url: string;
  description?: string;
  image?: string;
  email?: string;
  telephone?: string;
  jobTitle?: string;
  locationCity?: string;
  locationState?: string;
  sameAs?: string[]; // LinkedIn, website etc.
  worksFor?: string; // company name
  knowsAbout?: string[];
  hasCredential?: string[];
  memberOf?: { name: string; url?: string }; // e.g. NRPG
}

export function buildPersonSchema(input: PersonSchemaInput): SchemaObject {
  const {
    name,
    url,
    description,
    image,
    email,
    telephone,
    jobTitle,
    locationCity,
    locationState,
    sameAs,
    worksFor,
    knowsAbout,
    hasCredential,
    memberOf,
  } = input;

  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
    inLanguage: 'en-AU',
  };

  if (description) schema.description = description;
  if (image) schema.image = image;
  if (email) schema.email = email;
  if (telephone) schema.telephone = telephone;
  if (jobTitle) schema.jobTitle = jobTitle;
  if (sameAs && sameAs.length > 0) schema.sameAs = sameAs;

  if (locationCity || locationState) {
    schema.address = {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
      ...(locationCity && { addressLocality: locationCity }),
      ...(locationState && { addressRegion: locationState }),
    };
  }

  if (worksFor) {
    schema.worksFor = { '@type': 'Organization', name: worksFor };
  }

  if (knowsAbout && knowsAbout.length > 0) schema.knowsAbout = knowsAbout;

  if (hasCredential && hasCredential.length > 0) {
    schema.hasCredential = hasCredential.map((c) => ({
      '@type': 'EducationalOccupationalCredential',
      name: c,
    }));
  }

  if (memberOf) {
    schema.memberOf = {
      '@type': 'Organization',
      name: memberOf.name,
      ...(memberOf.url && { url: memberOf.url }),
    };
  }

  return schema;
}

export interface LocalBusinessSchemaInput {
  name: string;
  url: string;
  telephone?: string;
  email?: string;
  description?: string;
  image?: string;
  locationCity?: string;
  locationState?: string;
  locationAddress?: string;
  locationPostcode?: string;
  priceRange?: string;
  servesCuisine?: never; // not applicable — forces correct type usage
  sameAs?: string[];
  industry?: string;
}

export function buildLocalBusinessSchema(input: LocalBusinessSchemaInput): SchemaObject {
  const {
    name,
    url,
    telephone,
    email,
    description,
    image,
    locationCity,
    locationState,
    locationAddress,
    locationPostcode,
    priceRange,
    sameAs,
    industry,
  } = input;

  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name,
    url,
    inLanguage: 'en-AU',
    areaServed: { '@type': 'Country', name: 'Australia' },
  };

  if (description) schema.description = description;
  if (image) schema.image = image;
  if (telephone) schema.telephone = telephone;
  if (email) schema.email = email;
  if (priceRange) schema.priceRange = priceRange;
  if (sameAs && sameAs.length > 0) schema.sameAs = sameAs;
  if (industry) schema.knowsAbout = industry;

  if (locationAddress || locationCity || locationState || locationPostcode) {
    schema.address = {
      '@type': 'PostalAddress',
      addressCountry: 'AU',
      ...(locationAddress && { streetAddress: locationAddress }),
      ...(locationCity && { addressLocality: locationCity }),
      ...(locationState && { addressRegion: locationState }),
      ...(locationPostcode && { postalCode: locationPostcode }),
    };
  }

  return schema;
}
