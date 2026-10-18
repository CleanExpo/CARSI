import Link from 'next/link';

import { REVIEW_POLICY_COPY, REVIEW_POLICY_PATH } from '@/lib/reviews/review-policy';

/** The moderation policy as a list. Shows only policy text, never any hidden review's content. */
export function ReviewPolicyBody() {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">
      {REVIEW_POLICY_COPY.points.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <ul className="list-disc space-y-1 pl-5">
        {REVIEW_POLICY_COPY.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      {REVIEW_POLICY_COPY.after.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

/** Compact, keyboard-accessible disclosure shown beside a rating, with a link to the full page. */
export function ReviewPolicyDisclosure() {
  return (
    <details className="mt-2 text-xs text-slate-600" data-testid="review-policy">
      <summary className="cursor-pointer font-medium text-[#146fc2] hover:underline">
        {REVIEW_POLICY_COPY.title}
      </summary>
      <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
        <ReviewPolicyBody />
        <p className="mt-2 text-xs">
          <Link href={REVIEW_POLICY_PATH} className="font-medium text-[#146fc2] hover:underline">
            Read the full review policy
          </Link>
        </p>
      </div>
    </details>
  );
}

/** A plain link beside a public rating. */
export function ReviewPolicyLink() {
  return (
    <Link href={REVIEW_POLICY_PATH} className="font-medium text-[#146fc2] underline underline-offset-4">
      {REVIEW_POLICY_COPY.title}
    </Link>
  );
}
