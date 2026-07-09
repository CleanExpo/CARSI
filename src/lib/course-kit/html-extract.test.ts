import { describe, expect, it } from 'vitest';

import {
  decodeEntities,
  extractBlockquotes,
  extractBullets,
  extractHeadings,
  extractKeyStatements,
  extractListItems,
  extractParagraphs,
  htmlToText,
  splitSentences,
} from './html-extract';

// A representative slice of a real CARSI lesson body (avian course, module 1).
const LESSON_HTML =
  '<figure><img src="x.png" alt="alt" /></figure>' +
  '<p>Australia has reported H5 bird flu detections in migratory seabirds. ' +
  'The professional position is calm and evidence-led.</p>' +
  '<p>If a sick or dead bird is found, the public message is simple:</p>' +
  '<ol><li>Do not touch it.</li><li>Avoid the area.</li>' +
  '<li>Report to the Emergency Animal Disease Hotline on 1800&nbsp;675&nbsp;888.</li></ol>' +
  '<blockquote>Report first. Do not touch. Record the location.</blockquote>' +
  '<h2>Use neutral language</h2>' +
  '<p><strong>Professional caution:</strong> Do not tell the public a site is infected &amp; safe.</p>';

describe('decodeEntities', () => {
  it('decodes named, decimal and hex entities', () => {
    expect(decodeEntities('a&amp;b')).toBe('a&b');
    expect(decodeEntities('1800&nbsp;675')).toBe('1800 675');
    expect(decodeEntities('&#65;&#x42;')).toBe('AB');
  });
  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&unknownentity;')).toBe('&unknownentity;');
  });
});

describe('htmlToText', () => {
  it('strips tags, decodes entities and collapses whitespace', () => {
    expect(htmlToText('<p>Hello  &amp;   <strong>world</strong></p>')).toBe('Hello & world');
  });
  it('does not glue words across block boundaries', () => {
    expect(htmlToText('<li>one</li><li>two</li>')).toBe('one two');
  });
  it('returns empty string for null/empty input', () => {
    expect(htmlToText(null)).toBe('');
    expect(htmlToText('')).toBe('');
  });
  it('drops script/style content', () => {
    expect(htmlToText('<p>keep</p><script>alert(1)</script>')).toBe('keep');
  });
});

describe('extractListItems', () => {
  it('pulls each <li> as clean text with entities decoded', () => {
    expect(extractListItems(LESSON_HTML)).toEqual([
      'Do not touch it.',
      'Avoid the area.',
      'Report to the Emergency Animal Disease Hotline on 1800 675 888.',
    ]);
  });
  it('returns [] when there are no list items', () => {
    expect(extractListItems('<p>no lists here</p>')).toEqual([]);
  });
});

describe('extractParagraphs / extractBlockquotes / extractHeadings', () => {
  it('extracts paragraphs', () => {
    expect(extractParagraphs(LESSON_HTML)[0]).toContain('Australia has reported H5 bird flu');
  });
  it('extracts blockquotes', () => {
    expect(extractBlockquotes(LESSON_HTML)).toEqual([
      'Report first. Do not touch. Record the location.',
    ]);
  });
  it('extracts headings with level', () => {
    expect(extractHeadings(LESSON_HTML)).toEqual([{ level: 2, text: 'Use neutral language' }]);
  });
});

describe('splitSentences', () => {
  it('splits on sentence terminators', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });
  it('keeps a single unterminated sentence intact', () => {
    expect(splitSentences('no terminator here')).toEqual(['no terminator here']);
  });
});

describe('extractKeyStatements', () => {
  it('combines list items and blockquotes, de-duplicated, in order', () => {
    expect(extractKeyStatements(LESSON_HTML)).toEqual([
      'Do not touch it.',
      'Avoid the area.',
      'Report to the Emergency Animal Disease Hotline on 1800 675 888.',
      'Report first. Do not touch. Record the location.',
    ]);
  });
  it('de-duplicates case-insensitively', () => {
    expect(extractKeyStatements('<li>Same</li><li>same</li>')).toEqual(['Same']);
  });
});

describe('extractBullets', () => {
  it('prefers list items when present', () => {
    expect(extractBullets(LESSON_HTML)).toEqual([
      'Do not touch it.',
      'Avoid the area.',
      'Report to the Emergency Animal Disease Hotline on 1800 675 888.',
    ]);
  });
  it('falls back to first sentence of each paragraph when there are no lists', () => {
    const html = '<p>First one. Second sentence.</p><p>Another para. More.</p>';
    expect(extractBullets(html)).toEqual(['First one.', 'Another para.']);
  });
  it('caps the number of bullets', () => {
    const html = `<ul>${Array.from({ length: 20 }, (_, i) => `<li>item ${i}</li>`).join('')}</ul>`;
    expect(extractBullets(html, 3)).toHaveLength(3);
  });
});
