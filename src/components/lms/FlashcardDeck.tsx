'use client';

import { useReducer } from 'react';
import type { KeyboardEvent } from 'react';

import type { FlashcardCard } from '@/lib/lms/lesson-resources';
import { cn } from '@/lib/utils';

export interface FlashcardDeckState {
  index: number;
  revealed: boolean;
}

export type FlashcardDeckAction =
  | { type: 'flip' }
  | { type: 'next'; total: number }
  | { type: 'previous' }
  | { type: 'restart' };

export const initialFlashcardDeckState: FlashcardDeckState = {
  index: 0,
  revealed: false,
};

export function flashcardDeckReducer(
  state: FlashcardDeckState,
  action: FlashcardDeckAction
): FlashcardDeckState {
  switch (action.type) {
    case 'flip':
      return { ...state, revealed: !state.revealed };
    case 'next':
      if (state.index >= action.total - 1) return state;
      return { index: state.index + 1, revealed: false };
    case 'previous':
      if (state.index <= 0) return state;
      return { index: state.index - 1, revealed: false };
    case 'restart':
      return initialFlashcardDeckState;
    default:
      return state;
  }
}

interface FlashcardDeckProps {
  label?: string;
  cards: FlashcardCard[];
  enterprise?: boolean;
}

export function FlashcardDeck({ label, cards, enterprise }: FlashcardDeckProps) {
  const [state, dispatch] = useReducer(flashcardDeckReducer, initialFlashcardDeckState);

  if (cards.length === 0) return null;

  const card = cards[Math.min(state.index, cards.length - 1)];
  const atStart = state.index <= 0;
  const atEnd = state.index >= cards.length - 1;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      dispatch({ type: 'previous' });
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      dispatch({ type: 'next', total: cards.length });
      return;
    }
    if (event.key === ' ') {
      // Space on a focused button already activates it natively (flip on the
      // card, navigate on the controls) — only intercept elsewhere.
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      dispatch({ type: 'flip' });
    }
  };

  return (
    <section
      aria-label={label ?? 'Study flashcards'}
      onKeyDown={onKeyDown}
      className={cn(
        'rounded-xl border p-5',
        enterprise ? 'border-slate-200 bg-white shadow-sm' : 'border-[#2490ed]/20 bg-[#eef7ff]'
      )}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
          {label ?? 'Study flashcards'}
        </p>
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          {state.index + 1} of {cards.length}
          <span className="sr-only">
            , showing the {state.revealed ? 'back' : 'front'} of the card
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: 'flip' })}
        aria-pressed={state.revealed}
        aria-label={state.revealed ? 'Show the front of this card' : 'Reveal the answer'}
        className={cn(
          'flex min-h-[10rem] w-full items-center justify-center rounded-lg border px-6 py-8 text-center transition',
          state.revealed
            ? 'border-[#146fc2]/40 bg-[#146fc2]/5'
            : 'border-slate-200 bg-white hover:border-[#2490ed]/50'
        )}
      >
        <span className="space-y-2">
          <span className="block text-xs font-semibold tracking-wider text-slate-400 uppercase">
            {state.revealed ? 'Back' : 'Front'}
          </span>
          <span className="block text-base font-medium whitespace-pre-line text-slate-900">
            {state.revealed ? card.back : card.front}
          </span>
          <span className="block text-xs text-slate-400">
            {state.revealed ? 'Click to see the question again' : 'Click to reveal the answer'}
          </span>
        </span>
      </button>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-2">
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
            onClick={() => dispatch({ type: 'next', total: cards.length })}
            disabled={atEnd}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
        <button
          type="button"
          onClick={() => dispatch({ type: 'restart' })}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#146fc2] transition hover:bg-[#146fc2]/10"
        >
          Restart
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Tip: use the arrow keys to move between cards and the space bar to flip.
      </p>
    </section>
  );
}
