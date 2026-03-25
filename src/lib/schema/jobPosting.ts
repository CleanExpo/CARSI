/**
 * lib/schema/jobPosting.ts
 * Generates schema.org/JobPosting JSON-LD from job_listings rows.
 * Pass the result to <SchemaMarkup schema={...} />.
 */

import type { SchemaObject } from './shared';

export interface JobPostingSchemaInput {
  title: string;
  description: string;
  companyName: string;
  companyUrl?: string;
  datePosted: string; // ISO 8601
  validThrough: string; // ISO 8601
  employmentType?: string;
  locationCity?: string;
  locationState?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  applyUrl?: string;
}

export function buildJobPostingSchema(input: JobPostingSchemaInput): SchemaObject {
  const {
    title,
    description,
    companyName,
    companyUrl,
    datePosted,
    validThrough,
    employmentType = 'FULL_TIME',
    locationCity,
    locationState,
    isRemote = false,
    salaryMin,
    salaryMax,
    applyUrl,
  } = input;

  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description,
    hiringOrganization: {
      '@type': 'Organization',
      name: companyName,
      ...(companyUrl && { sameAs: companyUrl }),
    },
    datePosted,
    validThrough,
    employmentType,
    ...(isRemote && { jobLocationType: 'TELECOMMUTE' }),
  };

  if (!isRemote && (locationCity || locationState)) {
    schema.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'AU',
        ...(locationCity && { addressLocality: locationCity }),
        ...(locationState && { addressRegion: locationState }),
      },
    };
  }

  if (salaryMin || salaryMax) {
    schema.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'AUD',
      value: {
        '@type': 'QuantitativeValue',
        unitText: 'YEAR',
        ...(salaryMin && { minValue: salaryMin }),
        ...(salaryMax && { maxValue: salaryMax }),
      },
    };
  }

  if (applyUrl) schema.url = applyUrl;

  return schema;
}
