import { describe, expect, it } from 'vitest';

import { stripMarkdownForSpeech } from './text-to-speech-format';

describe('stripMarkdownForSpeech', () => {
  it('removes bold markers while keeping the text', () => {
    expect(stripMarkdownForSpeech('This is **important** advice.')).toBe(
      'This is important advice.'
    );
  });

  it('handles multiple bold spans', () => {
    expect(stripMarkdownForSpeech('**First** and **second** point.')).toBe(
      'First and second point.'
    );
  });

  it('leaves plain text unchanged', () => {
    expect(stripMarkdownForSpeech('No formatting here.')).toBe('No formatting here.');
  });

  it('trims surrounding whitespace', () => {
    expect(stripMarkdownForSpeech('  padded  ')).toBe('padded');
  });

  it('converts markdown links to link text only', () => {
    expect(
      stripMarkdownForSpeech('[Water Damage Essentials](/courses/wrt-water-damage-essentials)')
    ).toBe('Water Damage Essentials');
  });

  it('converts headings to spoken sentences', () => {
    expect(stripMarkdownForSpeech('### Free Courses\n\nSome intro.')).toBe(
      'Free Courses.\n\nSome intro.'
    );
  });

  it('converts markdown tables into readable phrases', () => {
    const input = `### Free Courses

| Course | Category |
| --- | --- |
| [WRT](/courses/wrt) | Water |
| [AMRT](/courses/amrt) | Mold |`;

    const spoken = stripMarkdownForSpeech(input);
    expect(spoken).toContain('Free Courses.');
    expect(spoken).toContain('Course: WRT. Category: Water.');
    expect(spoken).toContain('Course: AMRT. Category: Mold.');
    expect(spoken).not.toContain('|');
    expect(spoken).not.toContain('###');
  });

  it('strips list markers', () => {
    expect(stripMarkdownForSpeech('- First item\n- Second item')).toBe(
      'First item\nSecond item'
    );
  });
});
