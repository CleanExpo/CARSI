'use client';

import { useReducer } from 'react';
import type { KeyboardEvent } from 'react';

import type { SlideDeck } from '@/lib/lms/lesson-resources';
import { cn } from '@/lib/utils';

export interface SlideDeckViewerState {
  deckIndex: number;
  slideIndex: number;
  notesOpen: boolean;
}

export type SlideDeckViewerAction =
  | { type: 'next'; total: number }
  | { type: 'previous' }
  | { type: 'selectDeck'; index: number; deckCount: number }
  | { type: 'toggleNotes' };

export const initialSlideDeckViewerState: SlideDeckViewerState = {
  deckIndex: 0,
  slideIndex: 0,
  notesOpen: false,
};

export function slideDeckViewerReducer(
  state: SlideDeckViewerState,
  action: SlideDeckViewerAction
): SlideDeckViewerState {
  switch (action.type) {
    case 'next':
      if (state.slideIndex >= action.total - 1) return state;
      return { ...state, slideIndex: state.slideIndex + 1, notesOpen: false };
    case 'previous':
      if (state.slideIndex <= 0) return state;
      return { ...state, slideIndex: state.slideIndex - 1, notesOpen: false };
    case 'selectDeck':
      if (
        action.index === state.deckIndex ||
        action.index < 0 ||
        action.index >= action.deckCount
      ) {
        return state;
      }
      return { deckIndex: action.index, slideIndex: 0, notesOpen: false };
    case 'toggleNotes':
      return { ...state, notesOpen: !state.notesOpen };
    default:
      return state;
  }
}

interface SlideDeckViewerProps {
  label?: string;
  decks: SlideDeck[];
  enterprise?: boolean;
}

export function SlideDeckViewer({ label, decks, enterprise }: SlideDeckViewerProps) {
  const [state, dispatch] = useReducer(slideDeckViewerReducer, initialSlideDeckViewerState);

  if (decks.length === 0) return null;

  const deck = decks[Math.min(state.deckIndex, decks.length - 1)];
  const slides = deck.slides;
  if (slides.length === 0) return null;

  const slide = slides[Math.min(state.slideIndex, slides.length - 1)];
  const atStart = state.slideIndex <= 0;
  const atEnd = state.slideIndex >= slides.length - 1;
  const hasNotes = slide.speakerNotes.trim().length > 0;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      dispatch({ type: 'previous' });
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      dispatch({ type: 'next', total: slides.length });
    }
  };

  return (
    <section
      aria-label={label ?? 'Lesson slides'}
      onKeyDown={onKeyDown}
      className={cn(
        'rounded-xl border p-5',
        enterprise ? 'border-slate-200 bg-white shadow-sm' : 'border-[#2490ed]/20 bg-[#eef7ff]'
      )}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {label ?? 'Lesson slides'}
        </p>
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          {state.slideIndex + 1} of {slides.length}
          <span className="sr-only">, {slide.title}, in the deck {deck.module}</span>
        </p>
      </div>

      {decks.length > 1 ? (
        <div className="mb-4">
          <label
            htmlFor="slide-deck-selector"
            className="mb-1 block text-xs font-medium text-slate-500"
          >
            Deck
          </label>
          <select
            id="slide-deck-selector"
            value={state.deckIndex}
            onChange={(event) =>
              dispatch({
                type: 'selectDeck',
                index: Number(event.target.value),
                deckCount: decks.length,
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-[#2490ed] focus:outline-none"
          >
            {decks.map((d, i) => (
              <option key={`${d.module}-${i}`} value={i}>
                {d.module} ({d.slides.length} {d.slides.length === 1 ? 'slide' : 'slides'})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="mb-4 text-sm font-medium text-slate-600">{deck.module}</p>
      )}

      <div className="min-h-[10rem] rounded-lg border border-slate-200 bg-white px-6 py-6">
        <h3 className="text-base font-semibold text-slate-900">{slide.title}</h3>
        {slide.bullets.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
            {slide.bullets.map((bullet, i) => (
              <li key={`${slide.title}-bullet-${i}`}>{bullet}</li>
            ))}
          </ul>
        ) : null}

        {hasNotes ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'toggleNotes' })}
              aria-expanded={state.notesOpen}
              className="rounded-lg px-2 py-1 text-sm font-medium text-[#146fc2] transition hover:bg-[#146fc2]/10"
            >
              {state.notesOpen ? 'Hide speaker notes' : 'Show speaker notes'}
            </button>
            {state.notesOpen ? (
              <p className="mt-2 text-sm whitespace-pre-line text-slate-600">
                {slide.speakerNotes}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch({ type: 'previous' })}
          disabled={atStart}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'next', total: slides.length })}
          disabled={atEnd}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Tip: use the arrow keys to move between slides.
      </p>
    </section>
  );
}
