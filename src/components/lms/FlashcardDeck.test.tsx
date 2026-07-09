import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  FlashcardDeck,
  flashcardDeckReducer,
  initialFlashcardDeckState,
  type FlashcardDeckState,
} from './FlashcardDeck';

const cards = [
  { front: 'What does GPO stand for?', back: 'General purpose outlet' },
  { front: 'Standard Australian mains supply?', back: '230 V at 50 Hz' },
  { front: 'What instrument measures relative humidity?', back: 'A thermo-hygrometer' },
];

describe('FlashcardDeck render', () => {
  it('renders the counter, the front of the first card and the controls', () => {
    const html = renderToStaticMarkup(
      <FlashcardDeck label="Study flashcards" cards={cards} />
    );
    expect(html).toContain('1 of 3');
    expect(html).toContain('What does GPO stand for?');
    expect(html).not.toContain('General purpose outlet');
    expect(html).toContain('Study flashcards');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
    expect(html).toContain('Restart');
  });

  it('falls back to the default deck label when none is supplied', () => {
    const html = renderToStaticMarkup(<FlashcardDeck cards={cards} />);
    expect(html).toContain('Study flashcards');
  });

  it('announces card changes via an aria-live region and uses real buttons', () => {
    const html = renderToStaticMarkup(<FlashcardDeck cards={cards} />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('<button type="button"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('renders nothing when there are no cards', () => {
    const html = renderToStaticMarkup(<FlashcardDeck cards={[]} />);
    expect(html).toBe('');
  });
});

describe('flashcardDeckReducer', () => {
  const total = cards.length;

  it('flips the current card front to back and back again', () => {
    const flipped = flashcardDeckReducer(initialFlashcardDeckState, { type: 'flip' });
    expect(flipped).toEqual({ index: 0, revealed: true });
    const unflipped = flashcardDeckReducer(flipped, { type: 'flip' });
    expect(unflipped).toEqual({ index: 0, revealed: false });
  });

  it('advances to the next card and hides the answer again', () => {
    const revealed: FlashcardDeckState = { index: 0, revealed: true };
    expect(flashcardDeckReducer(revealed, { type: 'next', total })).toEqual({
      index: 1,
      revealed: false,
    });
  });

  it('does not advance past the last card', () => {
    const last: FlashcardDeckState = { index: total - 1, revealed: true };
    expect(flashcardDeckReducer(last, { type: 'next', total })).toBe(last);
  });

  it('moves back to the previous card and hides the answer again', () => {
    const midway: FlashcardDeckState = { index: 2, revealed: true };
    expect(flashcardDeckReducer(midway, { type: 'previous' })).toEqual({
      index: 1,
      revealed: false,
    });
  });

  it('does not move before the first card', () => {
    expect(
      flashcardDeckReducer(initialFlashcardDeckState, { type: 'previous' })
    ).toBe(initialFlashcardDeckState);
  });

  it('restart returns to the front of the first card', () => {
    const deep: FlashcardDeckState = { index: 2, revealed: true };
    expect(flashcardDeckReducer(deep, { type: 'restart' })).toEqual({
      index: 0,
      revealed: false,
    });
  });
});
