/**
 * lib/seo/course-marketing.ts
 * Turnkey SEO / AEO / GEO layer for CARSI courses.
 *
 * Consumes the per-course marketing metadata (data/seo/course-cards.index.json,
 * authored + validated to CARSI's IICRC-CEC terminology and truth rules) and
 * turns it into:
 *   - Next.js page Metadata (title, description, keywords, Open Graph)
 *   - schema.org Course JSON-LD (search rich results)
 *   - schema.org FAQPage JSON-LD (the AEO/GEO layer answer engines & LLMs lift)
 *   - the card image alt text
 *
 * Usage on a course page:
 *   export const generateMetadata = ({ params }) =>
 *     courseMetadata({ slug: params.slug, url: `https://carsi.com.au/courses/${params.slug}` });
 *   // in the component:
 *   <SchemaMarkup schema={buildCourseStructuredData({ slug, name, url, image, priceAud, isFree })} />
 */

import type { Metadata } from 'next';

import cardsIndex from '../../../data/seo/course-cards.index.json';
import { buildCourseSchema, buildFaqSchema, type SchemaObject } from '@/lib/schema';

export interface CourseMarketing {
  slug: string;
  seoTitle: string;
  metaDescription: string;
  imageAlt: string;
  og: { title: string; description: string };
  keywords: string[];
  faq: Array<{ q: string; a: string }>;
  courseJsonLd?: Record<string, unknown>;
}

const INDEX = cardsIndex as unknown as Record<string, CourseMarketing>;

export function getCourseMarketing(slug: string): CourseMarketing | null {
  return INDEX[slug] ?? null;
}

/** Image alt text for a course card / hero (a11y + image SEO); falls back to the title. */
export function courseImageAlt(slug: string, fallbackTitle: string): string {
  return getCourseMarketing(slug)?.imageAlt ?? fallbackTitle;
}

/** Next.js Metadata (title/description/keywords/Open Graph) for a course page. */
export function courseMetadata(opts: {
  slug: string;
  url: string;
  fallbackTitle: string;
  image?: string;
}): Metadata {
  const m = getCourseMarketing(opts.slug);
  const title = m?.seoTitle ?? opts.fallbackTitle;
  const description = m?.metaDescription ?? '';
  return {
    title,
    description,
    keywords: m?.keywords,
    alternates: { canonical: opts.url },
    openGraph: {
      title: m?.og.title ?? title,
      description: m?.og.description ?? description,
      url: opts.url,
      type: 'website',
      locale: 'en_AU',
      ...(opts.image ? { images: [{ url: opts.image, alt: m?.imageAlt ?? opts.fallbackTitle }] } : {}),
    },
    twitter: {
      card: opts.image ? 'summary_large_image' : 'summary',
      title: m?.og.title ?? title,
      description: m?.og.description ?? description,
      ...(opts.image ? { images: [opts.image] } : {}),
    },
  };
}

/** Course + FAQPage JSON-LD array for a course page (pass each to <SchemaMarkup />). */
export function buildCourseStructuredData(opts: {
  slug: string;
  name: string;
  url: string;
  image?: string;
  priceAud?: number | string | null;
  isFree?: boolean;
  prerequisites?: string;
  credentialAwarded?: string;
}): SchemaObject[] {
  const m = getCourseMarketing(opts.slug);
  const schemas: SchemaObject[] = [
    buildCourseSchema({
      name: opts.name,
      description: m?.metaDescription ?? '',
      url: opts.url,
      image: opts.image,
      priceAud: opts.priceAud,
      isFree: opts.isFree,
      prerequisites: opts.prerequisites,
      credentialAwarded: opts.credentialAwarded,
    }),
  ];
  if (m?.faq?.length) schemas.push(buildFaqSchema({ faqs: m.faq }));
  return schemas;
}
