'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ProgressShareDraft } from '@/lib/lms/progress-share-post';

interface ProgressSharePromptProps {
  draft: ProgressShareDraft | null;
  onClose: () => void;
}

export function ProgressSharePrompt({ draft, onClose }: ProgressSharePromptProps) {
  const [copied, setCopied] = useState(false);

  const isOpen = Boolean(draft);
  const textLength = useMemo(() => draft?.copyText.length ?? 0, [draft?.copyText]);

  if (!isOpen || !draft) return null;

  async function copyPost() {
    try {
      await navigator.clipboard.writeText(draft.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-white/12 bg-[#0a0f19] p-5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[#2490ed]/30 bg-[#2490ed]/12 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[#7ec5ff] uppercase">
              <Share2 className="h-3.5 w-3.5" />
              ready-to-share
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white sm:text-xl">
              Nice work — {draft.title}
            </h3>
            <p className="mt-1 text-sm text-white/55">{draft.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 p-1.5 text-white/50 hover:border-white/20 hover:text-white/75"
            aria-label="Close share prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/25 p-3.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/85">{draft.copyText}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40">
          <p>lowercase hashtags included for better reach</p>
          <p>{textLength} chars</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-white/20 text-white/80 hover:bg-white/8"
          >
            not now
          </Button>
          <Button
            type="button"
            onClick={() => void copyPost()}
            className="bg-[#2490ed] text-white hover:bg-[#1e7bc9]"
          >
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                copied
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                copy post
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
