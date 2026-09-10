import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildCourseFallbackKeywords,
  hasContradictoryPriceClaim,
  resolveCourseMarketingTruth,
  type CourseMarketing,
} from './course-marketing';

interface CatalogueCourse {
  slug: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  priceAud: string;
  isFree: boolean;
  cecHours?: number | null;
}

const ROOT = join(__dirname, '..', '..', '..');
const cardsDirectory = join(ROOT, 'data', 'seo', 'course-cards');
const cardsIndex = JSON.parse(
  readFileSync(join(ROOT, 'data', 'seo', 'course-cards.index.json'), 'utf8'),
) as Record<string, CourseMarketing>;
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: CatalogueCourse[];
  }
).courses;
const catalogueBySlug = new Map(catalogue.map((course) => [course.slug, course]));
const cecApprovals = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'cec-approvals.json'), 'utf8')) as {
    approvals: unknown[];
  }
).approvals;
const surfaceSlugs = Array.from(
  readFileSync(join(ROOT, 'public', 'llms.txt'), 'utf8').matchAll(/\]\(\/courses\/([^\)]+)\)/g),
  (match) => match[1],
);

const unsafeCard: CourseMarketing = {
  slug: 'paid-course',
  seoTitle: 'Free CARSI Course | CARSI',
  metaDescription: 'Take this training at no cost.',
  imageAlt: 'Australian restoration technician recording site evidence',
  og: {
    title: 'Complimentary restoration training',
    description: 'This enrolment is free.',
  },
  keywords: ['restoration training', 'free drying course', 'Australian course'],
  faq: [
    { q: 'What is included?', a: 'Video lessons and practical checks.' },
    { q: 'What does it cost?', a: 'It is $0 AUD.' },
  ],
  courseJsonLd: {
    '@type': 'Course',
    description: 'A free CARSI course.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
  },
};

const fallbacks = {
  seoTitle: 'Paid Course',
  metaDescription: 'Authoritative paid course description.',
  ogTitle: 'Paid Course | CARSI',
  ogDescription: 'Authoritative paid course description.',
  keywords: ['Paid Course', 'restoration course', 'CARSI'],
  imageAlt: 'Paid Course',
};

function flattenStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(flattenStrings);
  }
  return [];
}

describe('hasContradictoryPriceClaim', () => {
  it.each([
    'Free CARSI course',
    'This training is free.',
    'Free enrolment is available today',
    'Take the course at no cost',
    'Complimentary online access',
    'No payment is required',
    'Only $0 AUD',
  ])('recognises a zero-price commerce assertion: %s', (copy) => {
    expect(hasContradictoryPriceClaim(copy)).toBe(true);
  });

  it.each([
    'Use hands-free operation where the equipment supports it.',
    'Leave the filter free of debris.',
    'Maintain free-flowing air through the duct.',
    'Access is included free with CARSI Pro.',
    'Do not certify a site as disease-free.',
    'Leave the surface free from contamination.',
    'Access is included with CARSI Pro.',
    'Use vacuum freeze-drying for soaked paper.',
  ])('preserves non-commerce or subscription wording: %s', (copy) => {
    expect(hasContradictoryPriceClaim(copy)).toBe(false);
  });
});

describe('resolveCourseMarketingTruth', () => {
  it('falls back per unsafe field while preserving safe authored fields for a paid course', () => {
    const resolved = resolveCourseMarketingTruth({
      marketing: unsafeCard,
      isFree: false,
      priceAud: 49,
      fallback: fallbacks,
    });

    expect(resolved).toMatchObject({
      seoTitle: fallbacks.seoTitle,
      metaDescription: fallbacks.metaDescription,
      imageAlt: unsafeCard.imageAlt,
      og: { title: fallbacks.ogTitle, description: fallbacks.ogDescription },
      keywords: ['restoration training', 'Australian course'],
      faq: [{ q: 'What is included?', a: 'Video lessons and practical checks.' }],
    });
    expect(flattenStrings(resolved).some(hasContradictoryPriceClaim)).toBe(false);
    expect((resolved?.courseJsonLd?.offers as { price?: string } | undefined)?.price).not.toBe('0');
  });

  it.each([
    { isFree: true, priceAud: 49 },
    { isFree: false, priceAud: 0 },
  ])('preserves truthful free wording for authoritative free truth: %j', ({ isFree, priceAud }) => {
    expect(
      resolveCourseMarketingTruth({
        marketing: unsafeCard,
        isFree,
        priceAud,
        fallback: fallbacks,
      }),
    ).toEqual(unsafeCard);
  });

  it('preserves a safe authored card by deep value', () => {
    const safeCard: CourseMarketing = {
      ...unsafeCard,
      seoTitle: 'Paid Course | CARSI',
      metaDescription: 'Australian-produced restoration training.',
      og: { title: 'Paid Course | CARSI', description: 'Evidence-led restoration training.' },
      keywords: ['restoration training', 'Australian course'],
      faq: [{ q: 'Who is this for?', a: 'Australian restoration professionals.' }],
      courseJsonLd: { '@type': 'Course', description: 'Evidence-led restoration training.' },
    };

    expect(
      resolveCourseMarketingTruth({
        marketing: safeCard,
        isFree: false,
        priceAud: 149,
        fallback: fallbacks,
      }),
    ).toEqual(safeCard);
  });

  it('returns null when no marketing card exists', () => {
    expect(
      resolveCourseMarketingTruth({
        marketing: null,
        isFree: false,
        priceAud: 29,
        fallback: fallbacks,
      }),
    ).toBeNull();
  });
});

describe('buildCourseFallbackKeywords', () => {
  const base = {
    title: 'Water Restoration Course',
    designationName: 'CARSI Water Restoration Practitioner',
    disciplineTopic: 'Water Restoration',
  };

  it.each([undefined, null, '', '0', 0, 'not-a-number'])('omits CEC/IICRC wording without positive evidence: %s', (cecHours) => {
    expect(buildCourseFallbackKeywords({ ...base, cecHoursLabel: cecHours })).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/IICRC|CEC/i)]),
    );
  });

  it('allows qualified wording from explicit positive CEC evidence', () => {
    expect(buildCourseFallbackKeywords({ ...base, cecHoursLabel: '2' })).toContain(
      'IICRC Continuing Education Credit (CEC) course',
    );
  });
});

describe('current repository truth', () => {
  it('freezes catalogue, surface, card, price, and CEC truth', () => {
    expect(catalogue).toHaveLength(71);
    expect(surfaceSlugs).toHaveLength(24);
    expect(new Set(surfaceSlugs).size).toBe(24);
    expect(readdirSync(cardsDirectory).filter((name) => name.endsWith('.json'))).toHaveLength(80);
    expect(Object.keys(cardsIndex)).toHaveLength(80);
    expect(cecApprovals).toHaveLength(38);
    // Cards may lead the llms.txt surface. These slugs are live courses on the sitemap that
    // llms.txt does not list, so they carry a card (page metadata + FAQ JSON-LD) without being
    // a surfaced slug. Keeping the list explicit still catches a card authored by accident.
    expect(Object.keys(cardsIndex).filter((slug) => !surfaceSlugs.includes(slug))).toEqual([
      'air-movers-for-professional-restoration-specs-selection-on-site-assessment',
      'carpet-cleaning-basics-b66757ce',
      'carsi-maintenance-toolbox-talks-monthly-refreshers',
      'collaborative-development-your-personal-ai-assistant',
      'commercial-floor-care-schools-childcare',
      'donning-and-doffing-ppe',
      'fundamental-business-framework',
      'glass-cleaning-course',
      'infection-control-in-child-care',
      'infectious-control-for-the-business-owner',
      'asd-structural-drying-core',
      'cct-commercial-carpet-core',
      'fsrt-fire-smoke-restoration-core',
      'insurance-adjusters-and-their-roles',
      'introduction-to-advanced-applied-structural-drying',
      'introduction-to-advanced-drying-equipment-and-methods',
      'introduction-to-advanced-structural-drying-concepts',
      'introduction-to-applied-microbial-remediation',
      'introduction-to-applied-structural-drying',
      'introduction-to-asbestos-asbestos-awareness',
      'introduction-to-basic-carpet-cleaning-and-drying',
      'introduction-to-consulting-for-complex-water-losses',
      'introduction-to-controlled-environment-drying-methods',
      'introduction-to-creating-a-clean-air-environment',
      'introduction-to-digital-moisture-mapping',
      'introduction-to-forensic-investigations-for-water-losses',
      'introduction-to-iaq-and-mould',
      'introduction-to-monitoring-air-quality-on-the-job-site',
      'introduction-to-odour-control-and-removal-techniques',
      'introduction-to-project-management-for-water-losses',
      'introduction-to-psychrometry-science-and-calculations',
      'introduction-to-safety-procedures-for-water-damage-work',
      'introduction-to-smoke-and-soot-damage-restoration',
      'introduction-to-structural-drying-concepts',
      'introduction-to-using-personal-protective-equipment',
      'introduction-to-water-damage-estimating',
      'introduction-to-water-damage-in-commercial-buildings',
      'introduction-to-water-damage-marketing-and-sales',
      'introduction-to-water-damage-principles',
      'introduction-to-water-damage-restoration',
      'introduction-to-water-extraction-methods',
      'job-safety-and-environmental-analysis-jsea-course',
      'large-loss-mastery-course',
      'level-1-mould-remediation-2cc96b85',
      'level-2-mould-remediation-30ee3492',
      'level-3-mould-remediation-c5797369',
      'microbe-clean-basic-understanding-course',
      'moisture-meter-course',
      'refrigerant-dehumidifiers-for-water-loss-restoration',
      'restoration-project-management-premium',
      'risk-assessment-course',
      'safe-work-method-statements-swms-course',
      'safety-data-sheet-sds-course',
      'standard-operating-procedures-sop-course',
      'tile-cleaning-for-carpet-cleaners',
      'using-atp-to-create-protocols',
    ]);

    const surfacedCourses = surfaceSlugs.map((slug) => catalogueBySlug.get(slug));
    expect(surfacedCourses.every((course) => course && !course.isFree && Number(course.priceAud) > 0)).toBe(true);
    expect(
      surfacedCourses.reduce<Record<string, number>>((prices, course) => {
        if (!course) return prices;
        prices[course.priceAud] = (prices[course.priceAud] ?? 0) + 1;
        return prices;
      }, {}),
    ).toEqual({ '29': 13, '49': 8, '99': 2, '149': 1 });
  });

  it('keeps every card source and generated index entry in exact parity', () => {
    const sourceCards = Object.fromEntries(
      readdirSync(cardsDirectory)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => {
          const card = JSON.parse(readFileSync(join(cardsDirectory, name), 'utf8')) as CourseMarketing;
          return [card.slug, card];
        }),
    );

    expect(sourceCards).toEqual(cardsIndex);
  });

  it('keeps every card meta description inside the length search engines render', () => {
    // Observed on carsi.com.au 2026-09-10: three cards shipped 173-192 chars and were
    // cut off in the SERP - the exact defect the card programme exists to remove.
    const tooLong = Object.entries(cardsIndex)
      .map(([slug, card]) => [slug, card.metaDescription.length] as const)
      .filter(([, length]) => length > 165);

    expect(tooLong).toEqual([]);
  });

  it('never writes a money amount into FAQ prose', () => {
    // FAQPage JSON-LD is the one card surface the page renders, and
    // resolveCourseMarketingTruth cannot correct a price inside it: it catches a
    // zero-price claim on a paid course, but nothing catches "AUD $29" once the real
    // price moves. The page's own offers block already renders a current price.
    const money = /(?:A?\$\s*\d|\b\d+\s*(?:dollars|AUD)\b)/i;
    const offenders = Object.entries(cardsIndex)
      .filter(([, card]) => card.faq.some((entry) => money.test(`${entry.q} ${entry.a}`)))
      .map(([slug]) => slug);

    expect(offenders).toEqual([]);
  });

  it('resolves all 24 surfaced paid courses without a commerce contradiction', () => {
    const failures: string[] = [];

    for (const slug of surfaceSlugs) {
      const course = catalogueBySlug.get(slug);
      if (!course) {
        failures.push(`${slug}: missing catalogue truth`);
        continue;
      }
      const description = course.shortDescription ?? course.description?.slice(0, 155) ?? course.title;
      const resolved = resolveCourseMarketingTruth({
        marketing: cardsIndex[slug] ?? null,
        isFree: course.isFree,
        priceAud: course.priceAud,
        fallback: {
          seoTitle: course.title,
          metaDescription: description,
          ogTitle: `${course.title} | CARSI`,
          ogDescription: description,
          keywords: buildCourseFallbackKeywords({ title: course.title, cecHoursLabel: course.cecHours }),
          imageAlt: course.title,
        },
      });

      if (resolved && flattenStrings(resolved).some(hasContradictoryPriceClaim)) failures.push(slug);
    }

    expect(failures).toEqual([]);
  });
});
