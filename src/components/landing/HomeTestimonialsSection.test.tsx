/**
 * Homepage reviews: composite, unattributed quotes were removed (ACL misleading-conduct risk).
 * The section renders nothing until a real, named review exists, and renders a named one when it does.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  HOME_TESTIMONIALS,
  HomeTestimonialsSection,
  attributedTestimonials,
} from './HomeTestimonialsSection';

describe('HomeTestimonialsSection', () => {
  it('renders nothing while no attributed review exists (the shipped state)', () => {
    expect(HOME_TESTIMONIALS).toEqual([]);
    expect(renderToStaticMarkup(createElement(HomeTestimonialsSection))).toBe('');
  });

  it('drops reviews without a name', () => {
    const anonymous = { quote: 'Great course.', name: '  ', role: 'Technician', region: 'QLD' };
    expect(attributedTestimonials([anonymous])).toEqual([]);
    expect(
      renderToStaticMarkup(createElement(HomeTestimonialsSection, { testimonials: [anonymous] }))
    ).toBe('');
  });

  it('renders an attributed review with the reviewer name', () => {
    const html = renderToStaticMarkup(
      createElement(HomeTestimonialsSection, {
        testimonials: [{ quote: 'Plant quote.', name: 'Test Person', role: 'Technician', region: 'QLD' }],
      })
    );
    expect(html).toContain('Plant quote.');
    expect(html).toContain('Test Person');
    expect(html).not.toContain('representative of');
  });
});
