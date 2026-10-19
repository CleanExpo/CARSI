/**
 * FAQPage JSON-LD must describe Q&A that the same page shows. Live on 18/10/2026 every course
 * page emitted FAQPage from data/seo/course-cards with no visible Q&A at all, and /courses showed
 * a FAQ with no schema. Google's FAQ guidelines require the marked-up Q&A to be on the page.
 *
 * Every page under app/ that emits FAQ schema must pass the SAME array to a visible renderer
 * (HomeFaqSection, or a `.map(` over it), and the shared renderer must put every answer the
 * schema names into the HTML.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { FAQSchema } from '@/components/seo/JsonLd';

import { catalogueFaqs, cecCourseFaqs, pricingFaqs } from './answer-engine';

const APP = join(process.cwd(), 'app');

function pageFiles(dir = APP, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) pageFiles(full, out);
    else if (/^page\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

/** Identifiers handed to FAQ schema, and whether each is also rendered visibly. */
export function faqSchemaParity(source: string): { schemaArrays: string[]; invisible: string[] } {
  const schemaArrays = [
    ...Array.from(source.matchAll(/<FAQSchema\s+questions=\{(\w+)\}/g), (m) => m[1]),
    ...Array.from(
      source.matchAll(/buildFaqSchema\(\{\s*faqs(?::\s*(\w+))?\s*\}\)/g),
      (m) => m[1] ?? 'faqs'
    ),
  ];
  const invisible = schemaArrays.filter(
    (id) =>
      // HomeFaqSection, or IndustryFAQSection (which renders HomeFaqSection).
      !new RegExp(`<(Home|Industry)F(aq|AQ)Section[^>]*\\bfaqs=\\{${id}\\}`).test(source) &&
      !new RegExp(`\\b${id}\\.map\\(`).test(source)
  );
  return { schemaArrays, invisible };
}

describe('FAQPage schema only for visible Q&A', () => {
  it('the parity check can fail: schema without a visible renderer is flagged', () => {
    expect(faqSchemaParity('<FAQSchema questions={faqs} /> <CourseDetail />').invisible).toEqual([
      'faqs',
    ]);
    expect(
      faqSchemaParity('const faqs = m.faq; <SchemaMarkup schema={buildFaqSchema({ faqs })} />')
        .invisible
    ).toEqual(['faqs']);
    expect(
      faqSchemaParity('<FAQSchema questions={a} /><HomeFaqSection faqs={a} />').invisible
    ).toEqual([]);
  });

  it('every page that emits FAQ schema renders the same array visibly', () => {
    const offenders = pageFiles().flatMap((file) =>
      faqSchemaParity(readFileSync(file, 'utf8')).invisible.map(
        (id) => `${relative(process.cwd(), file)}: ${id}`
      )
    );
    expect(offenders).toEqual([]);
  });

  it.each([
    ['app/(public)/courses/page.tsx', 'catalogueAnswers'],
    ['app/(public)/iicrc-cec-courses/page.tsx', 'cecAnswers'],
    ['app/(public)/pricing/page.tsx', 'faqItems'],
    ['app/(public)/courses/[slug]/page.tsx', 'courseFaqs'],
    ['app/page.tsx', 'faqs'],
  ])('%s emits FAQPage from %s and shows it', (file, id) => {
    const parity = faqSchemaParity(readFileSync(join(process.cwd(), file), 'utf8'));
    expect(parity.schemaArrays).toContain(id);
    expect(parity.invisible).toEqual([]);
  });

  it.each([
    [
      'catalogue',
      catalogueFaqs({
        catalogueAvailable: true,
        publishedCourseCount: 5,
        freeCourseCount: 1,
        minPaidCoursePriceAud: 29,
        cecApprovedCount: 2,
        membership: {
          priceAud: 795,
          available: true,
          terms: 'Access to all published courses for one learner for a year.',
        },
      }),
    ],
    [
      'pricing',
      pricingFaqs({
        minPaidCoursePriceAud: 29,
        membership: {
          priceAud: 795,
          available: false,
          terms: 'Access to all published courses for one learner for a year.',
        },
      }),
    ],
    [
      'cec',
      cecCourseFaqs({
        available: true,
        approvedCount: 2,
        earliestExpiry: '2027-05-06',
        latestExpiry: '2028-05-15',
      }),
    ],
  ])('the %s schema and the visible section carry identical Q&A', (_label, faqs) => {
    const html = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        createElement(FAQSchema, { questions: faqs }),
        createElement(HomeFaqSection, { faqs })
      )
    );
    const json = JSON.parse(html.match(/<script[^>]*>([\s\S]*?)<\/script>/)![1]) as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };
    const visible = html.replace(/<script[\s\S]*?<\/script>/, '');
    const escape = (t: string) =>
      t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    expect(json.mainEntity.map((q) => q.name)).toEqual(faqs.map((f) => f.question));
    for (const q of json.mainEntity) {
      expect(visible).toContain(escape(q.name));
      expect(visible).toContain(escape(q.acceptedAnswer.text));
    }
  });

  it.each([
    [
      'app/(public)/courses/page.tsx',
      /\{catalogueAvailable \? <FAQSchema questions=\{catalogueAnswers\} \/> : null\}/,
    ],
    [
      'app/(public)/iicrc-cec-courses/page.tsx',
      /\{catalogue\.available \? <FAQSchema questions=\{cecAnswers\} \/> : null\}/,
    ],
  ])('unavailable: %s emits no FAQPage schema when the catalogue read fails', (file, gate) => {
    expect(readFileSync(join(process.cwd(), file), 'utf8')).toMatch(gate);
  });
});
