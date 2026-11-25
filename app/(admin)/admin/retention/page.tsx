import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  getRetentionMetrics,
  type RetentionMetrics,
  type ReturnWindow,
} from '@/lib/admin/retention-metrics';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Learner retention | Admin',
};

function percent(part: number, whole: number): string {
  if (whole === 0) return 'no base yet';
  return `${Math.round((part / whole) * 100)}%`;
}

function MetricRow({
  label,
  value,
  base,
  baseLabel,
  note,
}: {
  label: string;
  value: number;
  base: number;
  baseLabel: string;
  note: string;
}) {
  return (
    <tr className="border-t border-white/10 align-top">
      <th scope="row" className="px-4 py-3 font-medium text-white">
        {label}
        <p className="mt-1 max-w-md text-xs font-normal text-white/60">{note}</p>
      </th>
      <td className="px-4 py-3 tabular-nums" data-metric={label}>
        {value.toLocaleString('en-AU')}
      </td>
      <td className="px-4 py-3 tabular-nums">
        {percent(value, base)} of {base.toLocaleString('en-AU')} {baseLabel}
      </td>
    </tr>
  );
}

function returnNote(w: ReturnWindow): string {
  return `Opened lessons on at least two different days within ${w.days} days of enrolling. Counts only enrolments that are at least ${w.days} days old. A lower bound: the database keeps each lesson's latest visit, not every visit.`;
}

/**
 * Learning OS register row 4: activation, return-to-learn and completion, from the database,
 * as counts only. No browser tracking is involved, and no learner is named.
 */
export default async function AdminRetentionPage() {
  // The admin layout already refuses non-admins; checked again here so this page never queries
  // learner records for anyone else.
  if (!(await getAdminSessionOrNull())) return null;

  let metrics: RetentionMetrics | null = null;
  try {
    metrics = await getRetentionMetrics();
  } catch (error) {
    console.error(
      '[admin/retention] metrics query failed',
      error instanceof Error ? error.message : String(error)
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Learner retention</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          How many enrolled learners start, come back and finish, worked out from lesson and
          enrolment records. Counts only, with no learner names. Refunded, disputed and revoked
          enrolments are left out.
        </p>
      </div>

      {metrics === null ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200"
        >
          The retention figures could not be loaded. This is not the same as zero; try again.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs tracking-wide text-white/60 uppercase">
              <tr>
                <th className="px-4 py-3">Measure</th>
                <th className="px-4 py-3">Count</th>
                <th className="px-4 py-3">Rate</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow
                label="Enrolled"
                value={metrics.enrolled}
                base={metrics.enrolled}
                baseLabel="enrolments"
                note="Enrolments that currently give access to a course."
              />
              <MetricRow
                label="Activated"
                value={metrics.activated}
                base={metrics.enrolled}
                baseLabel="enrolments"
                note="Enrolled, then opened at least one lesson of that course. Lessons an admin marked complete are not counted as opened."
              />
              <MetricRow
                label="Returned within 7 days"
                value={metrics.returnWithin7Days.returned}
                base={metrics.returnWithin7Days.eligible}
                baseLabel="activated enrolments at least 7 days old"
                note={returnNote(metrics.returnWithin7Days)}
              />
              <MetricRow
                label="Returned within 30 days"
                value={metrics.returnWithin30Days.returned}
                base={metrics.returnWithin30Days.eligible}
                baseLabel="activated enrolments at least 30 days old"
                note={returnNote(metrics.returnWithin30Days)}
              />
              <MetricRow
                label="Completed"
                value={metrics.completed}
                base={metrics.enrolled}
                baseLabel="enrolments"
                note="The course is marked complete."
              />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
