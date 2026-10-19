/**
 * The shared FAQ section (home page, /courses, course pages) rendered only the OPEN answer;
 * the rest did not exist in the HTML until someone clicked. Search and answer engines read the
 * server HTML, and Google requires FAQPage answers to be on the page, so every answer must be
 * in the markup, with closed panels hidden rather than absent.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

import { HomeFaqSection } from './HomeFaqSection';

const FAQS = [
  { question: 'First question?', answer: 'First answer text.' },
  { question: 'Second question?', answer: 'Second answer text.' },
  { question: 'Third question?', answer: 'Third answer text.' },
];

describe('HomeFaqSection server HTML', () => {
  it('contains every answer, not only the open one', () => {
    const html = renderToStaticMarkup(createElement(HomeFaqSection, { faqs: FAQS }));
    for (const faq of FAQS) {
      expect(html).toContain(faq.question);
      expect(html).toContain(faq.answer);
    }
  });

  it('hides closed panels with the hidden attribute and leaves the open one visible', () => {
    const html = renderToStaticMarkup(createElement(HomeFaqSection, { faqs: FAQS }));
    const panel = (i: number) =>
      html.match(new RegExp(`<div[^>]*id="home-faq-panel-${i}"[^>]*>`))?.[0] ?? '';
    expect(panel(0)).not.toBe('');
    expect(panel(0)).not.toMatch(/\shidden(=|\s|>)/);
    expect(panel(1)).toMatch(/\shidden(=|\s|>)/);
    expect(panel(2)).toMatch(/\shidden(=|\s|>)/);
  });

  it('can carry its own heading and lead for pages other than the home page', () => {
    const html = renderToStaticMarkup(
      createElement(HomeFaqSection, {
        faqs: FAQS,
        title: 'About this course',
        lead: 'Short answers.',
      })
    );
    expect(html).toContain('About this course');
    expect(html).toContain('Short answers.');
  });
});
