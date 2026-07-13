import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  SlideDeckViewer,
  slideDeckViewerReducer,
  initialSlideDeckViewerState,
  type SlideDeckViewerState,
} from './SlideDeckViewer';

const singleDeck = [
  {
    module: 'Official message and reporting pathway',
    slides: [
      {
        title: 'The official position',
        bullets: [
          'Australia has reported H5 bird flu detections in migratory seabirds.',
          'Follow Australian Government and Australian CDC advice.',
        ],
        speakerNotes: 'Stay calm and evidence-led.',
      },
      {
        title: 'Report first',
        bullets: ['Do not touch.', 'Call 1800 675 888.'],
        speakerNotes: 'The whole pathway compresses into four words.',
      },
      {
        title: 'Recap',
        bullets: [],
        speakerNotes: '',
      },
    ],
  },
];

const multipleDecks = [
  ...singleDeck,
  {
    module: 'Worker safety and PPE awareness',
    slides: [
      {
        title: 'Clean and dirty zones',
        bullets: ['Keep the zones separated.'],
        speakerNotes: 'Zone discipline protects the crew.',
      },
    ],
  },
];

describe('SlideDeckViewer render', () => {
  it('renders the counter, the first slide title and bullets, and the controls', () => {
    const html = renderToStaticMarkup(
      <SlideDeckViewer label="Lesson slides" decks={singleDeck} />
    );
    expect(html).toContain('1 of 3');
    expect(html).toContain('The official position');
    expect(html).toContain(
      'Australia has reported H5 bird flu detections in migratory seabirds.'
    );
    expect(html).toContain('Lesson slides');
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
  });

  it('falls back to the default label when none is supplied', () => {
    const html = renderToStaticMarkup(<SlideDeckViewer decks={singleDeck} />);
    expect(html).toContain('Lesson slides');
  });

  it('announces slide changes via an aria-live region and uses real buttons', () => {
    const html = renderToStaticMarkup(<SlideDeckViewer decks={singleDeck} />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('<button type="button"');
  });

  it('keeps the speaker notes collapsed by default behind a toggle', () => {
    const html = renderToStaticMarkup(<SlideDeckViewer decks={singleDeck} />);
    expect(html).toContain('Show speaker notes');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Stay calm and evidence-led.');
  });

  it('shows the deck name but no selector for a single deck', () => {
    const html = renderToStaticMarkup(<SlideDeckViewer decks={singleDeck} />);
    expect(html).toContain('Official message and reporting pathway');
    expect(html).not.toContain('<select');
  });

  it('renders a deck selector when there are multiple decks', () => {
    const html = renderToStaticMarkup(<SlideDeckViewer decks={multipleDecks} />);
    expect(html).toContain('<select');
    expect(html).toContain('Official message and reporting pathway (3 slides)');
    expect(html).toContain('Worker safety and PPE awareness (1 slide)');
  });

  it('renders nothing when there are no decks', () => {
    const html = renderToStaticMarkup(<SlideDeckViewer decks={[]} />);
    expect(html).toBe('');
  });
});

describe('slideDeckViewerReducer', () => {
  const total = singleDeck[0].slides.length;

  it('advances to the next slide and collapses the notes again', () => {
    const withNotesOpen: SlideDeckViewerState = {
      deckIndex: 0,
      slideIndex: 0,
      notesOpen: true,
    };
    expect(slideDeckViewerReducer(withNotesOpen, { type: 'next', total })).toEqual({
      deckIndex: 0,
      slideIndex: 1,
      notesOpen: false,
    });
  });

  it('does not advance past the last slide', () => {
    const last: SlideDeckViewerState = { deckIndex: 0, slideIndex: total - 1, notesOpen: false };
    expect(slideDeckViewerReducer(last, { type: 'next', total })).toBe(last);
  });

  it('moves back to the previous slide and collapses the notes again', () => {
    const midway: SlideDeckViewerState = { deckIndex: 0, slideIndex: 2, notesOpen: true };
    expect(slideDeckViewerReducer(midway, { type: 'previous' })).toEqual({
      deckIndex: 0,
      slideIndex: 1,
      notesOpen: false,
    });
  });

  it('does not move before the first slide', () => {
    expect(
      slideDeckViewerReducer(initialSlideDeckViewerState, { type: 'previous' })
    ).toBe(initialSlideDeckViewerState);
  });

  it('toggles the speaker notes open and closed', () => {
    const open = slideDeckViewerReducer(initialSlideDeckViewerState, { type: 'toggleNotes' });
    expect(open).toEqual({ deckIndex: 0, slideIndex: 0, notesOpen: true });
    expect(slideDeckViewerReducer(open, { type: 'toggleNotes' })).toEqual({
      deckIndex: 0,
      slideIndex: 0,
      notesOpen: false,
    });
  });

  it('switching deck returns to the first slide with the notes collapsed', () => {
    const deep: SlideDeckViewerState = { deckIndex: 0, slideIndex: 2, notesOpen: true };
    expect(
      slideDeckViewerReducer(deep, { type: 'selectDeck', index: 1, deckCount: 2 })
    ).toEqual({ deckIndex: 1, slideIndex: 0, notesOpen: false });
  });

  it('ignores out-of-range or same-deck selections', () => {
    const state: SlideDeckViewerState = { deckIndex: 1, slideIndex: 2, notesOpen: true };
    expect(slideDeckViewerReducer(state, { type: 'selectDeck', index: 1, deckCount: 2 })).toBe(
      state
    );
    expect(slideDeckViewerReducer(state, { type: 'selectDeck', index: 5, deckCount: 2 })).toBe(
      state
    );
    expect(slideDeckViewerReducer(state, { type: 'selectDeck', index: -1, deckCount: 2 })).toBe(
      state
    );
  });
});
