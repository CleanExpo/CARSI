'use client';

import { Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';

type ReviewDto = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author: string;
  created_at: string;
};

type Summary = {
  average: number;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
};

type ReviewsResponse = {
  reviews: ReviewDto[];
  summary: Summary;
  can_review: boolean;
  own_review: { rating: number; title: string | null; body: string | null } | null;
};

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-300'}
          aria-hidden
        />
      ))}
    </span>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-0.5"
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function CourseReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<ReviewsResponse>(`/api/lms/courses/${slug}/reviews`);
      setData(res);
      if (res.own_review) {
        setRating(res.own_review.rating);
        setTitle(res.own_review.title ?? '');
        setBody(res.own_review.body ?? '');
      }
    } catch {
      // Non-fatal: reviews are a supplementary section; show nothing on failure.
      setData({
        reviews: [],
        summary: { average: 0, count: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
        can_review: false,
        own_review: null,
      });
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

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
      await load();
    } catch {
      setError('Could not save your review. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [rating, title, body, saving, slug, load]);

  if (!data) return null;

  const { summary, reviews, can_review, own_review } = data;

  return (
    <div aria-label="Course reviews">
      <h2 className="text-xl font-bold text-slate-900">Reviews</h2>

      {summary.count > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-3xl font-semibold tabular-nums text-slate-900">
            {summary.average.toFixed(1)}
          </span>
          <div>
            <Stars value={summary.average} size={18} />
            <p className="text-xs text-slate-500">
              {summary.count} review{summary.count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">No reviews yet.</p>
      )}

      {can_review && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-900">
            {own_review ? 'Update your review' : 'Rate this course'}
          </p>
          <div className="mt-2">
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            maxLength={120}
            className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2490ed]/50 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you think? (optional)"
            rows={3}
            maxLength={2000}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2490ed]/50 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={rating < 1 || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2490ed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1a7fd4] disabled:opacity-60"
            >
              {saving ? 'Saving…' : own_review ? 'Update review' : 'Submit review'}
            </button>
            {saved && <span className="text-xs font-medium text-green-600">Saved — thank you!</span>}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="mt-6 space-y-5">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-slate-100 pb-5 last:border-0">
              <div className="flex items-center gap-2">
                <Stars value={r.rating} />
                {r.title && <span className="text-sm font-semibold text-slate-900">{r.title}</span>}
              </div>
              {r.body && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.body}</p>}
              <p className="mt-1.5 text-xs text-slate-400">
                {r.author} · {formatDate(r.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
