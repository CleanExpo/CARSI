'use client';

import { Star } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { apiClient } from '@/lib/api/client';
import { REVIEW_THANK_YOU_COPY } from '@/lib/reviews/review-ask';

/**
 * The learner's review form and the thank-you that follows it (spec 2026-10-18 D7, D8, §10).
 *
 * Compliance rules this component must keep (ACCC online-review guidance, Google review policy):
 * - The learner writes their own words: no suggested or pre-filled review text, no preset stars.
 * - No reward or incentive of any kind.
 * - The thank-you is the same for every rating. It receives no rating — only the validated
 *   Google review link (or null) — so it cannot route happy reviewers to Google.
 */

export type OwnReview = { rating: number; title: string | null; body: string | null };

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    let next = n;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, n + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, n - 1);
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = 5;
    else return;
    e.preventDefault();
    onChange(next);
    refs.current[next - 1]?.focus();
  };
  // Roving tab stop: the chosen star, or the first star when nothing is chosen yet.
  const tabStop = value >= 1 ? value : 1;
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          ref={(el) => {
            refs.current[n - 1] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          tabIndex={n === tabStop ? 0 : -1}
          onClick={() => onChange(n)}
          onKeyDown={(e) => onKeyDown(e, n)}
          className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2490ed]"
        >
          <Star
            width={26}
            height={26}
            className={n <= value ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-300 hover:text-amber-300'}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

/** Shown after ANY rating. Takes no rating by design (spec D7). */
export function ReviewThankYou({
  googleReviewUrl,
  onEdit,
}: {
  googleReviewUrl: string | null;
  onEdit?: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" data-testid="review-thank-you">
      <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-none">
        {REVIEW_THANK_YOU_COPY.heading}
      </h3>
      <p className="mt-1 text-sm text-slate-700">{REVIEW_THANK_YOU_COPY.body}</p>
      {googleReviewUrl ? (
        <p className="mt-3 text-sm text-slate-700">
          {REVIEW_THANK_YOU_COPY.google}{' '}
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#146fc2] underline-offset-2 hover:underline"
          >
            {REVIEW_THANK_YOU_COPY.googleLink}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      ) : null}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="mt-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
        >
          Edit your review
        </button>
      ) : null}
    </div>
  );
}

export function ReviewForm({
  slug,
  heading,
  intro,
  ownReview,
  reviewerDisplayName,
  googleReviewUrl,
  onSaved,
}: {
  slug: string;
  heading: string;
  intro?: string;
  ownReview: OwnReview | null;
  reviewerDisplayName: string | null;
  googleReviewUrl: string | null;
  onSaved?: () => void | Promise<void>;
}) {
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [title, setTitle] = useState(ownReview?.title ?? '');
  const [body, setBody] = useState(ownReview?.body ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const idBase = `review-${slug}`;

  const submit = useCallback(async () => {
    if (rating < 1 || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.post(`/api/lms/courses/${slug}/reviews`, {
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      });
      setSaved(true);
      await onSaved?.();
    } catch {
      setError('Could not save your review. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [rating, title, body, saving, slug, onSaved]);

  if (saved) {
    return <ReviewThankYou googleReviewUrl={googleReviewUrl} onEdit={() => setSaved(false)} />;
  }

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
      aria-labelledby={`${idBase}-heading`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h3 id={`${idBase}-heading`} className="text-base font-semibold text-slate-900">
        {heading}
      </h3>
      {intro ? <p className="mt-1 text-sm text-slate-600">{intro}</p> : null}
      <div className="mt-3">
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <label htmlFor={`${idBase}-title`} className="mt-3 block text-xs font-medium text-slate-700">
        Title (optional)
      </label>
      <input
        id={`${idBase}-title`}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2490ed]/50 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20"
      />
      <label htmlFor={`${idBase}-body`} className="mt-3 block text-xs font-medium text-slate-700">
        What did you think? (optional)
      </label>
      <textarea
        id={`${idBase}-body`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={2000}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2490ed]/50 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20"
      />
      {reviewerDisplayName ? (
        <p className="mt-2 text-xs text-slate-500">
          Your review will appear publicly as <span className="font-medium text-slate-700">{reviewerDisplayName}</span>.
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={rating < 1 || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a7fd4] disabled:opacity-60"
        >
          {saving ? 'Saving…' : ownReview ? 'Update review' : 'Submit review'}
        </button>
        {rating < 1 ? <span className="text-xs text-slate-500">Choose a star rating to submit.</span> : null}
      </div>
    </form>
  );
}
