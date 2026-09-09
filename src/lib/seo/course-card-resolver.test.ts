import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { getCourseMarketing, resolveCourseMarketingTruth } from './course-marketing';

/**
 * A card can pass every gate and still go partly inert on the live page.
 *
 * `resolveCourseMarketingTruth` reconciles authored copy against commerce truth: on a PAID
 * course it replaces any field making a zero-price claim with the generic fallback, and it
 * drops offending FAQ entries outright. That is correct behaviour, but it is silent - the
 * card file keeps the hand-written text while the page renders the fallback. Nothing else
 * in the suite runs a card through the resolver, because the existing commerce test only
 * walks the llms.txt surface slugs, and cards may lead that surface.
 *
 * So: for every course whose live price we captured as evidence, run its card through the
 * resolver at that price and fail if any authored field would not survive.
 */

const ROOT = join(__dirname, '..', '..', '..');
const EVIDENCE_DIR = join(ROOT, 'docs', 'evidence');

interface EvidenceCourse {
  slug: string;
  liveOfferPrice: number | null;
  carded: boolean;
}

function groundedCourses(): EvidenceCourse[] {
  if (!existsSync(EVIDENCE_DIR)) return [];
  const files = readdirSync(EVIDENCE_DIR).filter(
    (name) => name.startsWith('seo-card-grounding-') && name.endsWith('.json'),
  );
  const courses: EvidenceCourse[] = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(EVIDENCE_DIR, file), 'utf8')) as {
      courses: EvidenceCourse[];
    };
    courses.push(...parsed.courses.filter((course) => course.carded));
  }
  return courses;
}

const FALLBACK = {
  seoTitle: 'FALLBACK_TITLE',
  metaDescription: 'FALLBACK_META',
  imageAlt: 'FALLBACK_ALT',
  ogTitle: 'FALLBACK_OG_TITLE',
  ogDescription: 'FALLBACK_OG_DESC',
  keywords: [] as string[],
};

describe('grounded course cards survive the commerce-truth resolver', () => {
  it('has evidence to check, so a pass cannot be vacuous', () => {
    expect(groundedCourses().length).toBeGreaterThan(0);
  });

  it('keeps every authored field when resolved at the live price', () => {
    const damage: string[] = [];

    for (const course of groundedCourses()) {
      const card = getCourseMarketing(course.slug);
      if (!card) {
        damage.push(`${course.slug}: evidence says carded but no card found`);
        continue;
      }
      const price = course.liveOfferPrice;
      const resolved = resolveCourseMarketingTruth({
        marketing: card,
        isFree: price === 0,
        priceAud: price,
        fallback: FALLBACK,
      });
      if (!resolved) {
        damage.push(`${course.slug}: resolver returned null`);
        continue;
      }

      for (const field of ['seoTitle', 'metaDescription', 'imageAlt'] as const) {
        if (resolved[field] !== card[field]) {
          damage.push(`${course.slug}: ${field} replaced by fallback at price ${price}`);
        }
      }
      if (resolved.og.title !== card.og.title) damage.push(`${course.slug}: og.title replaced`);
      if (resolved.og.description !== card.og.description) {
        damage.push(`${course.slug}: og.description replaced`);
      }
      if (resolved.keywords.length !== card.keywords.length) {
        damage.push(`${course.slug}: keywords dropped`);
      }
      if (resolved.faq.length !== card.faq.length) {
        const kept = new Set(resolved.faq.map((entry) => entry.q));
        for (const entry of card.faq) {
          if (!kept.has(entry.q)) damage.push(`${course.slug}: FAQ dropped - ${entry.q}`);
        }
      }
      if (card.courseJsonLd?.offers && !resolved.courseJsonLd?.offers) {
        damage.push(`${course.slug}: offers deleted at price ${price}`);
      }
    }

    expect(damage).toEqual([]);
  });
});
