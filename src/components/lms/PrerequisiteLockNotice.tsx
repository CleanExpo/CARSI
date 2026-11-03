import Link from 'next/link';

export type PrerequisiteLink = { slug: string; title: string };

/**
 * Locked state for a course with an incomplete prerequisite (DECISIONS #41):
 * "Complete <prerequisite> first", linking to each prerequisite course. Display only;
 * enrolment, checkout and lesson access are enforced server-side.
 */
export function PrerequisiteLockNotice({
  prerequisites,
  signInHref,
}: {
  prerequisites: PrerequisiteLink[];
  /** When set, the viewer is signed out: offer sign-in for learners who have completed it. */
  signInHref?: string;
}) {
  if (prerequisites.length === 0) return null;
  return (
    <div
      role="status"
      data-testid="prerequisite-lock"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-slate-800"
    >
      <p className="font-semibold text-slate-900">Locked: prerequisite required</p>
      <p className="mt-1">
        Complete{' '}
        {prerequisites.map((p, i) => (
          <span key={p.slug}>
            {i > 0 ? (i === prerequisites.length - 1 ? ' and ' : ', ') : null}
            <Link
              href={`/courses/${encodeURIComponent(p.slug)}`}
              className="font-semibold text-[#146fc2] underline"
            >
              {p.title}
            </Link>
          </span>
        ))}{' '}
        first. This course unlocks once you have completed it.
      </p>
      {signInHref ? (
        <p className="mt-2 text-xs text-slate-600">
          Already completed it?{' '}
          <Link href={signInHref} className="font-semibold text-[#146fc2] underline">
            Sign in
          </Link>{' '}
          to enrol.
        </p>
      ) : null}
    </div>
  );
}
