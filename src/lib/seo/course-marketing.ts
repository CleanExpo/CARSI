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

export interface CourseMarketingFallbacks {
  seoTitle: string;
  metaDescription: string;
  imageAlt: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string[];
}

const INDEX = cardsIndex as unknown as Record<string, CourseMarketing>;

export function getCourseMarketing(slug: string): CourseMarketing | null {
  return INDEX[slug] ?? null;
}

const COMMERCE_NOUN_PATTERN =
  /\b(?:access|course|enrolment|lesson|program|programme|registration|training|tuition)\b/i;

function maskSubscriptionInclusion(copy: string): string {
  return copy.replace(
    /\b(?:(?:access|course|enrolment|training)\s+)?(?:is\s+)?included\s+free\s+with\s+CARSI\s+Pro\b/gi,
    '',
  );
}

/** True only when copy makes a zero-price commerce assertion. */
export function hasContradictoryPriceClaim(copy: string): boolean {
  const candidate = maskSubscriptionInclusion(copy);

  if (
    /\bno[ -]?cost\b/i.test(candidate) ||
    /\bno payment\b/i.test(candidate) ||
    /(?:A?\$)\s*0(?:\.0{1,2})?(?![\d.])/i.test(candidate) ||
    /\b(?:it|this)\s+is\s+free\b/i.test(candidate) ||
    /(?:^|[.!?]\s+)free\s*,?\s*Australian-produced[.!?]?\s*$/i.test(candidate)
  ) {
    return true;
  }

  for (const match of candidate.matchAll(/\bcomplimentary\b/gi)) {
    const index = match.index ?? 0;
    const context = candidate.slice(Math.max(0, index - 48), index + match[0].length + 48);
    if (COMMERCE_NOUN_PATTERN.test(context)) return true;
  }

  for (const match of candidate.matchAll(/(?<!-)\bfree\b(?!-|\s+(?:of|from)\b)/gi)) {
    const index = match.index ?? 0;
    const context = candidate.slice(Math.max(0, index - 48), index + match[0].length + 48);
    if (COMMERCE_NOUN_PATTERN.test(context)) return true;
  }

  return false;
}

function hasPositiveCecEvidence(cecHours: string | number | null | undefined): boolean {
  if (cecHours === null || cecHours === undefined || cecHours === '') return false;
  const parsed = Number(cecHours);
  return Number.isFinite(parsed) && parsed > 0;
}

export function buildCourseFallbackKeywords(opts: {
  title: string;
  designationName?: string | null;
  disciplineTopic?: string | null;
  cecHours?: string | number | null;
}): string[] {
  return [
    opts.title,
    opts.designationName ?? '',
    opts.disciplineTopic ?? '',
    ...(hasPositiveCecEvidence(opts.cecHours)
      ? ['IICRC Continuing Education Credit (CEC) course']
      : []),
    'restoration course',
    'CARSI',
  ].filter(Boolean);
}

function hasZeroPrice(priceAud: string | number | null | undefined): boolean {
  if (priceAud === null || priceAud === undefined || priceAud === '') return false;
  const parsed = Number(priceAud);
  return Number.isFinite(parsed) && parsed === 0;
}

/** Reconciles authored SEO with authoritative course commerce truth, field by field. */
export function resolveCourseMarketingTruth(opts: {
  marketing: CourseMarketing | null;
  isFree: boolean;
  priceAud: string | number | null | undefined;
  fallback: CourseMarketingFallbacks;
}): CourseMarketing | null {
  const { marketing, fallback } = opts;
  if (!marketing) return null;
  if (opts.isFree || hasZeroPrice(opts.priceAud)) return marketing;

  const courseJsonLd = marketing.courseJsonLd ? { ...marketing.courseJsonLd } : undefined;
  if (courseJsonLd) {
    if (
      typeof courseJsonLd.description === 'string' &&
      hasContradictoryPriceClaim(courseJsonLd.description)
    ) {
      courseJsonLd.description = fallback.metaDescription;
    }
    const offer = courseJsonLd.offers as { price?: string | number } | undefined;
    if (offer && hasZeroPrice(offer.price)) delete courseJsonLd.offers;
  }

  return {
    ...marketing,
    seoTitle: hasContradictoryPriceClaim(marketing.seoTitle)
      ? fallback.seoTitle
      : marketing.seoTitle,
    metaDescription: hasContradictoryPriceClaim(marketing.metaDescription)
      ? fallback.metaDescription
      : marketing.metaDescription,
    imageAlt: hasContradictoryPriceClaim(marketing.imageAlt)
      ? fallback.imageAlt
      : marketing.imageAlt,
    og: {
      title: hasContradictoryPriceClaim(marketing.og.title)
        ? fallback.ogTitle
        : marketing.og.title,
      description: hasContradictoryPriceClaim(marketing.og.description)
        ? fallback.ogDescription
        : marketing.og.description,
    },
    keywords: marketing.keywords.filter((keyword) => !hasContradictoryPriceClaim(keyword)),
    faq: marketing.faq.filter(
      ({ q, a }) => !hasContradictoryPriceClaim(q) && !hasContradictoryPriceClaim(a),
    ),
    ...(courseJsonLd ? { courseJsonLd } : {}),
  };
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
