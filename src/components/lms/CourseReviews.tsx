'use client';

import { Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ReviewForm } from '@/components/lms/ReviewForm';
import { ReviewPolicyDisclosure } from '@/components/lms/ReviewPolicy';
import { ApiClientError, apiClient } from '@/lib/api/client';
import { REVIEW_ASK_COPY, REVIEW_HIDE_REASONS, type ReviewHideReason } from '@/lib/reviews/review-ask';

/** Admin-facing labels for the wire reason codes (spec D2). */
const HIDE_REASON_LABELS: Record<ReviewHideReason, string> = {
  offensive: 'Offensive',
  personal_information: 'Contains personal information',
  not_about_course: 'Not about this course',
  spam_or_fake: 'Spam or fake',
};

type ReviewModeration = {
  hidden_reason: ReviewHideReason | null;
  hidden_at: string | null;
  hidden_before_reasons_recorded: boolean;
  edited_after_hide: boolean;
};

type ReviewDto = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reply: string | null;
  replied_at: string | null;
  is_published: boolean;
  author: string;
  created_at: string;
  /** Present only for moderators. */
  moderation?: ReviewModeration;
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
  can_manage: boolean;
  can_moderate: boolean;
  own_review: { rating: number; title: string | null; body: string | null } | null;
  /** A completer who has not reviewed yet — derived from server state (spec D5). */
  review_ask?: boolean;
  reviewer_display_name?: string | null;
  /** Validated Google review link, the same for every rating (spec D7). */
  google_review_url?: string | null;
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


function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function ReviewItem({
  review,
  slug,
  canManage,
  canModerate,
  onChanged,
}: {
  review: ReviewDto;
  slug: string;
  canManage: boolean;
  canModerate: boolean;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply ?? '');
  const [busy, setBusy] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [choosingReason, setChoosingReason] = useState(false);
  const [hideReason, setHideReason] = useState<ReviewHideReason | ''>('');
  const [err, setErr] = useState<string | null>(null);

  // A hide needs a listed reason (spec D2); an unhide does not. Both are recorded server-side.
  const setPublished = useCallback(
    async (isPublished: boolean, reason?: ReviewHideReason) => {
      if (moderating) return;
      setModerating(true);
      setErr(null);
      try {
        await apiClient.post(`/api/lms/courses/${slug}/reviews/${review.id}/publish`, {
          is_published: isPublished,
          ...(isPublished ? {} : { reason }),
        });
        setChoosingReason(false);
        setHideReason('');
        await onChanged();
      } catch (e) {
        setErr(e instanceof ApiClientError && e.message ? e.message : 'Could not update visibility. Please try again.');
      } finally {
        setModerating(false);
      }
    },
    [slug, review.id, moderating, onChanged]
  );

  const draftWithAi = useCallback(async () => {
    setDrafting(true);
    setErr(null);
    try {
      const res = await apiClient.post<{ draft: string | null }>(
        `/api/lms/courses/${slug}/reviews/${review.id}/reply/draft`,
        {}
      );
      if (res.draft) setText(res.draft);
      else setErr('AI drafting is unavailable right now — write a reply manually.');
    } catch {
      setErr('Could not draft a reply. Please try again.');
    } finally {
      setDrafting(false);
    }
  }, [slug, review.id]);

  const save = useCallback(
    async (reply: string | null) => {
      setBusy(true);
      setErr(null);
      try {
        await apiClient.post(`/api/lms/courses/${slug}/reviews/${review.id}/reply`, { reply });
        setEditing(false);
        await onChanged();
      } catch {
        setErr('Could not save the reply. Please try again.');
      } finally {
        setBusy(false);
      }
    },
    [slug, review.id, onChanged]
  );

  return (
    <li className={`border-b border-slate-100 pb-5 last:border-0 ${!review.is_published ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <Stars value={review.rating} />
        {review.title && <span className="text-sm font-semibold text-slate-900">{review.title}</span>}
        {!review.is_published && (
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600 uppercase">
            Hidden
          </span>
        )}
      </div>
      {!review.is_published && review.moderation ? (
        <p className="mt-1 text-xs text-slate-500">
          {review.moderation.hidden_reason
            ? `Hidden: ${HIDE_REASON_LABELS[review.moderation.hidden_reason]}`
            : review.moderation.hidden_before_reasons_recorded
              ? 'Hidden before reasons were recorded'
              : 'Hidden'}
          {review.moderation.edited_after_hide ? ' · edited by the learner after it was hidden' : ''}
        </p>
      ) : null}
      {review.body && <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{review.body}</p>}
      <p className="mt-1.5 text-xs text-slate-400">
        {review.author} · {formatDate(review.created_at)}
      </p>

      {canModerate && !choosingReason && (
        <button
          type="button"
          onClick={() => (review.is_published ? setChoosingReason(true) : setPublished(true))}
          disabled={moderating}
          className="mt-2 mr-3 text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline disabled:opacity-60"
        >
          {moderating ? 'Updating…' : review.is_published ? 'Hide review' : 'Unhide review'}
        </button>
      )}

      {canModerate && choosingReason && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <label htmlFor={`hide-reason-${review.id}`} className="block text-xs font-medium text-slate-700">
              Reason for hiding (recorded)
            </label>
            <select
              id={`hide-reason-${review.id}`}
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value as ReviewHideReason | '')}
              className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
            >
              <option value="">Choose a reason…</option>
              {REVIEW_HIDE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {HIDE_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => hideReason && setPublished(false, hideReason)}
            disabled={!hideReason || moderating}
            className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
          >
            {moderating ? 'Hiding…' : 'Hide review'}
          </button>
          <button
            type="button"
            onClick={() => {
              setChoosingReason(false);
              setHideReason('');
            }}
            className="text-xs font-medium text-slate-500 hover:underline"
          >
            Cancel
          </button>
          <p className="w-full text-[11px] text-slate-500">
            Reviews are never hidden for being negative. Only these reasons apply.
          </p>
        </div>
      )}
      {err && !editing ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {err}
        </p>
      ) : null}

      {review.reply && !editing && (
        <div className="mt-3 rounded-lg border-l-2 border-[#2490ed] bg-slate-50 p-3">
          <p className="text-xs font-semibold text-[#146fc2]">Response from the instructor</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{review.reply}</p>
        </div>
      )}

      {canManage && !editing && (
        <button
          type="button"
          onClick={() => {
            setText(review.reply ?? '');
            setEditing(true);
          }}
          className="mt-2 text-xs font-medium text-[#146fc2] hover:underline"
        >
          {review.reply ? 'Edit response' : 'Reply'}
        </button>
      )}

      {canManage && editing && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Write a public response…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2490ed]/50 focus:outline-none focus:ring-2 focus:ring-[#2490ed]/20"
          />
          {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => save(text)}
              disabled={busy || !text.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2490ed] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a7fd4] disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Publish response'}
            </button>
            <button
              type="button"
              onClick={draftWithAi}
              disabled={drafting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white disabled:opacity-60"
            >
              {drafting ? 'Drafting…' : '✨ Draft with AI'}
            </button>
            {review.reply && (
              <button
                type="button"
                onClick={() => save(null)}
                disabled={busy}
                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
              >
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs font-medium text-slate-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function CourseReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiClient.get<ReviewsResponse>(`/api/lms/courses/${slug}/reviews`);
      setData(res);
      setLoadFailed(false);
    } catch {
      // A failed load must not look like "no reviews" or "not eligible" (bench: eng-frontend).
      setLoadFailed(true);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    load();
  }, [load]);

  if (!data) {
    return (
      <div aria-label="Course reviews" className="min-h-24">
        <h2 className="text-xl font-bold text-slate-900">Reviews</h2>
        {loadFailed ? (
          <p className="mt-2 text-sm text-slate-500" role="status">
            Reviews could not load.{' '}
            <button type="button" onClick={() => void load()} className="font-medium text-[#146fc2] hover:underline">
              Retry
            </button>
          </p>
        ) : null}
      </div>
    );
  }

  const { summary, reviews, can_review, can_manage, can_moderate, own_review } = data;
  const reviewAsk = data.review_ask === true;

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
      {/* The moderation policy sits beside the rating it explains (ACCC online-review guidance). */}
      <ReviewPolicyDisclosure />

      {can_review && (
        <div className="mt-6">
          <ReviewForm
            slug={slug}
            heading={reviewAsk ? REVIEW_ASK_COPY.heading : own_review ? 'Update your review' : 'Rate this course'}
            intro={reviewAsk ? REVIEW_ASK_COPY.body : undefined}
            ownReview={own_review}
            reviewerDisplayName={data.reviewer_display_name ?? null}
            googleReviewUrl={data.google_review_url ?? null}
            onSaved={load}
          />
        </div>
      )}

      {reviews.length > 0 && (
        <ul className="mt-6 space-y-5">
          {reviews.map((r) => (
            <ReviewItem
              key={r.id}
              review={r}
              slug={slug}
              canManage={can_manage}
              canModerate={can_moderate}
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
