import { describe, expect, it } from 'vitest';

import { looksLikeMarkdown, markdownToSafeHtml } from './markdown-course-body';

describe('looksLikeMarkdown', () => {
  it('rejects empty and HTML fragments', () => {
    expect(looksLikeMarkdown('')).toBe(false);
    expect(looksLikeMarkdown('<p>Hello</p>')).toBe(false);
  });

  it('accepts headings, emphasis, lists and links', () => {
    expect(looksLikeMarkdown('## Drying\n\nPull the water first.')).toBe(true);
    expect(looksLikeMarkdown('Use **PPE** on Category 3 jobs.')).toBe(true);
    expect(looksLikeMarkdown('- Extract\n- Dry')).toBe(true);
    expect(looksLikeMarkdown('See [Safe Work](https://www.safeworkaustralia.gov.au).')).toBe(true);
  });

  it('leaves plain paragraphs as non-markdown so legacy pipe-splitting still applies', () => {
    expect(looksLikeMarkdown('A long imported sentence with no markup at all.')).toBe(false);
  });
});

describe('markdownToSafeHtml', () => {
  it('returns empty for blank input', () => {
    expect(markdownToSafeHtml('')).toBe('');
    expect(markdownToSafeHtml('   \n')).toBe('');
  });

  it('renders headings, bold, lists and blockquotes', () => {
    const html = markdownToSafeHtml(
      '## Safety\n\nWear **gloves**.\n\n> Document the moisture map.\n\n- Extract\n- Dry'
    );
    expect(html).toMatch(/<h2>/);
    expect(html).toMatch(/<strong>/);
    expect(html).toMatch(/<blockquote>/);
    expect(html).toMatch(/<li>/);
  });

  it('renders GFM tables', () => {
    const html = markdownToSafeHtml('| Tool | Use |\n| --- | --- |\n| Meter | Prove dry |');
    expect(html).toMatch(/<table>/);
    expect(html).toMatch(/Meter/);
  });

  it('strips script and javascript URLs', () => {
    const html = markdownToSafeHtml('[x](javascript:alert(1))\n\n<script>alert(1)</script>');
    expect(html.toLowerCase()).not.toContain('javascript:');
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('turns Module N headings into a kicker and title', () => {
    const html = markdownToSafeHtml('## Module 2 — Dry the structure\n\nProve it dry.');
    expect(html).toContain('course-mod-kicker');
    expect(html).toContain('Module 2');
    expect(html).toContain('Dry the structure');
  });

  it('does not throw on broken fences', () => {
    expect(() => markdownToSafeHtml('```js\nconst x =')).not.toThrow();
    expect(markdownToSafeHtml('```js\nconst x =').length).toBeGreaterThan(0);
  });
});
