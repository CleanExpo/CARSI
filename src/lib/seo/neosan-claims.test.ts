import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Review r2 guard (19/10/2026): the recovered NeoSan Labs legacy lessons carried
 * US efficacy marketing CARSI cannot substantiate in Australia. A "hospital-grade",
 * "non-toxic" or bare "99.9" kill-rate may only appear in this course as an
 * attributed manufacturer statement with a claim-level, dated source in the same
 * content block ("NeoSan Labs states ... (source: <url>, checked dd/mm/yyyy)").
 */
interface Lesson {
  title: string;
  contentBody?: string | null;
}
interface Course {
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  modules: { lessons: Lesson[] }[];
}

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(
    readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8'),
  ) as { courses: Course[] }
).courses;
const course = catalogue.find(
  (entry) => entry.slug === 'neosan-labs-product-training',
);

const CLAIM_PATTERN =
  /hospital[- ]grade|non[- ]?toxic|nontoxic|99[.,]9{2,}\s*(?:%|per\s?cent)?/i;
const ATTRIBUTED = /NeoSan Labs states/i;
const SOURCED = /\(?\s*source:\s*https?:\/\//i;
const DATED = /checked\s+\d{1,2}\/\d{1,2}\/\d{4}/;

describe('NeoSan Labs course claim compliance (review r2)', () => {
  it('the course exists in the catalogue', () => {
    expect(course).toBeDefined();
  });

  it('carries no efficacy claim without an attributed, dated citation in the same block', () => {
    const blocks: string[] = [];
    for (const module of course!.modules) {
      for (const lesson of module.lessons) {
        blocks.push(
          ...(lesson.contentBody ?? '').split(/<\/(?:p|li|h[1-6]|ul|ol)>/),
        );
      }
    }
    blocks.push(course!.description ?? '', course!.shortDescription ?? '');

    const offenders = blocks.filter((block) => {
      if (!CLAIM_PATTERN.test(block)) return false;
      return !(
        ATTRIBUTED.test(block) &&
        SOURCED.test(block) &&
        DATED.test(block)
      );
    });
    expect(offenders).toEqual([]);
  });
});
