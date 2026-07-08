/**
 * lib/schema/course.ts
 * Generates schema.org/Course JSON-LD for CARSI course pages and cards.
 * Pass the result to <SchemaMarkup schema={...} />.
 *
 * Only emits fields we can substantiate — no fabricated duration, CEC hours,
 * ratings or credentials. IICRC CEC terminology: a credential should only be
 * passed via `credentialAwarded` when it is genuinely accurate for the course.
 */

import type { SchemaObject } from './shared';

export interface CourseSchemaInput {
  name: string;
  description: string;
  /** Absolute canonical URL of the course. */
  url: string;
  /** Absolute image URL (hosted, e.g. Cloudinary). */
  image?: string;
  priceAud?: number | string | null;
  isFree?: boolean;
  providerName?: string;
  providerUrl?: string;
  inLanguage?: string;
  /** e.g. "None — open entry". Omit if unknown. */
  prerequisites?: string;
  /** Only when genuinely accurate, e.g. "CARSI course completion certificate". */
  credentialAwarded?: string;
  /** schema.org CourseInstance courseMode; CARSI courses are online self-paced. */
  courseMode?: string;
}

export function buildCourseSchema(input: CourseSchemaInput): SchemaObject {
  const {
    name,
    description,
    url,
    image,
    priceAud,
    isFree,
    providerName = 'CARSI',
    providerUrl = 'https://carsi.com.au',
    inLanguage = 'en-AU',
    prerequisites,
    credentialAwarded,
    courseMode = 'online',
  } = input;

  const priceNum = typeof priceAud === 'string' ? parseFloat(priceAud) : (priceAud ?? 0);
  const free = Boolean(isFree) || !priceNum || Number.isNaN(priceNum);

  const schema: SchemaObject = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url,
    inLanguage,
    provider: {
      '@type': 'Organization',
      name: providerName,
      sameAs: providerUrl,
    },
    offers: {
      '@type': 'Offer',
      category: free ? 'Free' : 'Paid',
      price: free ? '0' : priceNum.toFixed(2),
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      url,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode,
      inLanguage,
    },
  };

  if (image) schema.image = image;
  if (prerequisites) schema.coursePrerequisites = prerequisites;
  if (credentialAwarded) schema.educationalCredentialAwarded = credentialAwarded;

  return schema;
}
