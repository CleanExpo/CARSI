'use client';

import { useEffect, useState } from 'react';

interface ExplanationData {
  correct_answer: string;
  explanation: string;
  study_tip: string;
  generated_at: string;
}

interface QuizExplanationModalProps {
  questionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuizExplanationModal({
  questionId,
  isOpen,
  onClose,
}: QuizExplanationModalProps) {
  const [data, setData] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !questionId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

    fetch(`${backendUrl}/api/lms/quiz/questions/${questionId}/explanation`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ question_id: string; explanation: ExplanationData }>;
      })
      .then((json) => {
        if (!cancelled) setData(json.explanation);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load explanation');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, questionId]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative w-full max-w-lg rounded-lg border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border px-6 py-4"
        >
          <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">
            Answer Explanation
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground/80"
            aria-label="Close explanation modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <span
                className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-border"
                style={{ borderTopColor: 'hsl(var(--primary))' }}
              />
              <span className="ml-3 text-sm text-muted-foreground">Generating explanation…</span>
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-red-400">Unable to load explanation: {error}</p>
          )}

          {data && !loading && (
            <>
              {/* Correct answer callout */}
              <div
                className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3"
              >
                <p
                  className="mb-1 text-xs font-semibold tracking-widest text-primary uppercase"
                >
                  Correct Answer
                </p>
                <p className="text-sm font-medium text-foreground">{data.correct_answer}</p>
              </div>

              {/* Explanation */}
              <div>
                <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground/50 uppercase">
                  Why this is correct
                </p>
                <p className="text-sm leading-relaxed text-foreground/80">{data.explanation}</p>
              </div>

              {/* Study tip */}
              <div className="rounded-lg border-l-2 border-primary pl-3">
                <p className="mb-0.5 text-xs font-semibold tracking-widest text-muted-foreground/50 uppercase">
                  Study Tip
                </p>
                <p className="text-sm text-muted-foreground">{data.study_tip}</p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3">
          <button
            onClick={onClose}
            className="w-full rounded-sm bg-secondary py-2 text-sm font-medium text-muted-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
