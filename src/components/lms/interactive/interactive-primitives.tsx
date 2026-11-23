'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type InteractiveFeedbackTone = 'ok' | 'warn' | 'neutral';

export function InteractiveFeedbackPanel({
  tone,
  children,
}: {
  tone: InteractiveFeedbackTone;
  children: string;
}) {
  return (
    <p
      className={cn(
        'mt-4 rounded-lg border px-4 py-3 text-sm leading-relaxed',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
        tone === 'warn' && 'border-amber-200 bg-amber-50 text-amber-950',
        tone === 'neutral' && 'border-slate-200 bg-slate-50 text-slate-800'
      )}
    >
      {children}
    </p>
  );
}

export function InteractiveChoiceButton({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border px-4 py-3 text-left text-sm transition',
        selected
          ? 'border-[#146fc2] bg-[#146fc2]/10 text-slate-900'
          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
      )}
    >
      {children}
    </button>
  );
}