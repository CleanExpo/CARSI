import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseSchema } from './JsonLd';

function parseSchema(markup: string): Record<string, unknown> {
  const match = markup.match(/<script[^>]*>(.*)<\/script>/s);
  if (!match) throw new Error('no ld+json script rendered');
  return JSON.parse(match[1].replace(/&quot;/g, '"')) as Record<string, unknown>;
}

describe('CourseSchema SEO-card integration', () => {
  it('renders grounded authored copy while live identity, URL and commerce truth win', () => {
    const schema = parseSchema(
      renderToStaticMarkup(
        <CourseSchema
          name="Live database title"
          description="Database fallback description"
          url="https://carsi.com.au/courses/live-slug"
          price={49}
          authoredCourseJsonLd={{
            '@type': 'Course',
            name: 'Stale authored title',
            description: 'Grounded authored course description.',
            url: 'https://wrong.example/course',
            inLanguage: 'en-AU',
            coursePrerequisites: 'Prior practical experience recommended.',
            offers: { price: '0', priceCurrency: 'USD', availability: 'SoldOut' },
          }}
        />
      )
    );

    expect(schema.name).toBe('Live database title');
    expect(schema.url).toBe('https://carsi.com.au/courses/live-slug');
    expect(schema.description).toBe('Grounded authored course description.');
    expect(schema.inLanguage).toBe('en-AU');
    expect(schema.coursePrerequisites).toBe('Prior practical experience recommended.');
    expect(schema.offers).toMatchObject({
      url: 'https://carsi.com.au/courses/live-slug',
      price: 49,
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
      category: 'Paid',
    });
  });

  it('keeps the database description fallback when a card has no authored schema', () => {
    const schema = parseSchema(
      renderToStaticMarkup(
        <CourseSchema
          name="Database course"
          description="Database course description"
          url="https://carsi.com.au/courses/database-course"
          price={0}
        />
      )
    );

    expect(schema.description).toBe('Database course description');
    expect(schema.isAccessibleForFree).toBe(true);
  });
});
