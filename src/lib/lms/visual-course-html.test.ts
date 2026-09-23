import { describe, expect, it } from 'vitest';

import {
  persistVisualMarks,
  promoteAtxHeadings,
  promoteInlineTopicLines,
  sourceToEditorHtml,
  sourceToStudentHtml,
} from './visual-course-html';

describe('sourceToEditorHtml', () => {
  it('turns Markdown headings into real heading tags', () => {
    const html = sourceToEditorHtml('# Water damage\n\nA lead for the buyer.');
    expect(html).toMatch(/<h1>/i);
    expect(html).toContain('Water damage');
    expect(html).not.toContain('# Water');
  });

  it('does not leave raw tags as visible text when the source is HTML', () => {
    const html = sourceToEditorHtml(
      '# Indoor assessment\n\n<p>A foundational course &mdash; with <strong>PPE</strong>.</p>'
    );
    expect(html).toMatch(/<h1[^>]*>Indoor assessment<\/h1>/i);
    expect(html).toMatch(/<strong>/i);
    expect(html).toContain('PPE');
    expect(html).not.toContain('&lt;p&gt;');
    expect(html).not.toContain('&lt;strong&gt;');
  });

  it('renders a Module heading from ##', () => {
    const html = sourceToEditorHtml('## Module 1 — Extract\n\nPull the water.');
    expect(html).toMatch(/<h2/i);
    expect(html).toContain('Extract');
  });
});

describe('persistVisualMarks', () => {
  it('turns styled bold spans into strong so sanitize cannot drop them', () => {
    const html = persistVisualMarks('<p>Wear <span style="font-weight: bold">PPE</span>.</p>');
    expect(html).toContain('<strong>PPE</strong>');
    expect(html).not.toContain('font-weight');
  });

  it('keeps span-bold after a full editor reload', () => {
    const html = sourceToEditorHtml(
      '<h1>Title</h1><p>Wear <span style="font-weight:700">PPE</span> on site.</p>'
    );
    expect(html).toMatch(/<strong>PPE<\/strong>/);
  });
});

describe('sourceToStudentHtml', () => {
  it('keeps admin HTML headings and lists', () => {
    const html = sourceToStudentHtml(
      '<h3>Learning objectives</h3><p>By the end of this course you will be able to:</p><ul><li>Identify bonding damage.</li></ul>'
    );
    expect(html).toMatch(/<h3>/i);
    expect(html).toMatch(/<ul>/i);
    expect(html).toContain('Learning objectives');
    expect(html).not.toContain('&lt;h3&gt;');
  });

  it('turns a topic label above a br into a heading', () => {
    const html = promoteInlineTopicLines(
      '<p>Bonding Damage<br/>Prolonged moisture exposure across aged joints.</p>'
    );
    expect(html).toMatch(/<h3>Bonding Damage<\/h3>/);
    expect(html).toMatch(/<p>Prolonged moisture/);
  });
});

describe('promoteAtxHeadings', () => {
  it('only promotes lines that start with hashes and a space', () => {
    expect(promoteAtxHeadings('# Title')).toBe('<h1>Title</h1>');
    expect(promoteAtxHeadings('## Module')).toBe('<h2>Module</h2>');
    expect(promoteAtxHeadings('Not a heading')).toBe('Not a heading');
  });
});
