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
});
