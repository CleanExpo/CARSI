'use client';

import { CECProgressRing } from '@/components/lms/CECProgressRing';
import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { AcronymTooltip } from '@/components/ui/AcronymTooltip';
import { apiClient } from '@/lib/api/client';
import type { RenewalSummaryPayload } from '@/types/renewal';
import { RENEWAL_CEC_REQUIRED } from '@/types/renewal';
import { AlertTriangle, ArrowRight, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

function DisciplineBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/50">
        <span className="font-mono uppercase">{label}</span>
        <span className="tabular-nums text-white/70">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[#2490ed]/80 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SuggestionCard({
  title,
  slug,
  reason,
  discipline,
  cecHours,
  thumbnailUrl,
}: {
  title: string;
  slug: string;
  reason: string;
  discipline: string | null;
  cecHours: number | null;
  thumbnailUrl: string | null;
}) {
  return (
    <div className="flex min-w-[240px] max-w-[300px] flex-shrink-0 flex-col gap-2 rounded-xl border border-white/10 bg-[#060a14] p-4">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="h-28 w-full rounded-lg object-cover" />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-lg bg-[#2490ed]/10">
          <span className="font-mono text-xs text-[#2490ed]/50">{discipline ?? 'CARSI'}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {discipline ? (
          <span className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#2490ed] uppercase bg-[#2490ed]/15">
            {discipline}
          </span>
        ) : null}
        {cecHours !== null ? (
          <span className="font-mono text-[10px] text-white/35">{cecHours} CEC hrs</span>
        ) : null}
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold text-white">{title}</h3>
      <p className="line-clamp-2 text-xs italic text-white/40">{reason}</p>
      <Link
        href={`/courses/${slug}`}
        className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-[#2490ed] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#1f82d4]"
      >
        View course
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function RenewalCockpit() {
  const [data, setData] = useState<RenewalSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient.get<RenewalSummaryPayload>(
        '/api/lms/gamification/me/renewal-summary'
      );
      setData(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load IICRC renewal summary.'
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8"
        aria-busy
        aria-label="Loading renewal summary"
      >
        <div className="animate-pulse space-y-6">
          <div className="h-4 w-48 rounded bg-white/10" />
          <div className="flex gap-8">
            <div className="h-36 w-36 rounded-full bg-white/10" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-full rounded bg-white/10" />
              <div className="h-3 w-4/5 rounded bg-white/10" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      </section>
    );
  }

  const cycleLabel =
    data.tracking_mode === 'cycle'
      ? `toward ${data.cec_required} CECs this renewal cycle`
      : `toward ${data.cec_required} CEC target (from completed courses)`;

  const maxDisc = Math.max(
    RENEWAL_CEC_REQUIRED,
    ...Object.values(data.by_discipline).map((v) => v),
    0.1
  );

  const sortedDisc = Object.entries(data.by_discipline).sort((a, b) => b[1] - a[1]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#2490ed]/20 bg-gradient-to-br from-[#2490ed]/10 via-white/[0.03] to-transparent shadow-[0_0_0_1px_rgba(36,144,237,0.12)_inset]">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-48 w-48 rounded-full bg-[#2490ed]/15 blur-3xl"
        aria-hidden
      />
      <div className="relative px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-[#7ec5ff]/90 uppercase">
              IICRC renewal
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Your certification cockpit
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/50">
              <AcronymTooltip term="CEC" /> progress toward your renewal target, discipline mix,
              and the next courses that close your gaps.
            </p>
            {data.some_cecs_estimated ? (
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-amber-200/80">
                Some completed courses have no CEC hours stored in the catalogue — each counts as{' '}
                1 CEC toward this summary until hours are set in admin.
              </p>
            ) : null}
          </div>
          {data.renewal_urgent && data.days_until_expiry !== null ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-xs font-medium">
                {data.days_until_expiry < 0
                  ? `Renewal date passed ${Math.abs(data.days_until_expiry)} days ago — complete remaining CECs and verify IICRC status.`
                  : `Renewal in ${data.days_until_expiry} days — prioritise remaining CECs.`}
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <CECProgressRing
              cecEarned={data.cec_earned_in_cycle}
              cecRequired={data.cec_required}
              totalCecLifetime={data.cec_earned_lifetime}
              cycleLabel={cycleLabel}
            />
            <div className="w-full max-w-[220px] space-y-2 text-center text-xs text-white/45 lg:text-left">
              {data.has_renewal_expiry && data.renewal_expiry_date ? (
                <p className="flex items-center justify-center gap-2 lg:justify-start">
                  <Calendar className="h-3.5 w-3.5 text-white/35" />
                  <span>
                    Renewal due{' '}
                    <span className="text-white/80">
                      {new Date(data.renewal_expiry_date + 'T12:00:00').toLocaleDateString(
                        'en-AU',
                        {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }
                      )}
                    </span>
                  </span>
                </p>
              ) : (
                <p>
                  Add your IICRC renewal date in{' '}
                  <Link
                    href="/dashboard/student/profile"
                    className="text-[#7ec5ff] underline-offset-2 hover:underline"
                  >
                    profile
                  </Link>{' '}
                  for cycle-based tracking. Totals below reflect completed courses so far.
                </p>
              )}
              {!data.iicrc_member_number ? (
                <p>
                  Link your{' '}
                  <Link
                    href="/dashboard/student/profile"
                    className="text-[#7ec5ff] underline-offset-2 hover:underline"
                  >
                    IICRC member number
                  </Link>{' '}
                  for reporting and identity.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.18em] text-white/35 uppercase">
                Discipline mix (this view)
              </h3>
              <div className="mt-4 space-y-3">
                {sortedDisc.length === 0 ? (
                  <p className="text-sm text-white/40">
                    Complete a course with <AcronymTooltip term="CEC" /> hours to see your mix here.
                  </p>
                ) : (
                  sortedDisc.map(([label, value]) => (
                    <DisciplineBar key={label} label={label} value={value} max={maxDisc} />
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.18em] text-white/35 uppercase">
                Suggested next courses
              </h3>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {data.suggested_courses.length === 0 ? (
                  <p className="text-sm text-white/40">
                    No catalogue matches right now — browse all courses when you are ready.
                  </p>
                ) : (
                  data.suggested_courses.map((c) => (
                    <SuggestionCard
                      key={c.id}
                      title={c.title}
                      slug={c.slug}
                      reason={c.reason}
                      discipline={c.iicrc_discipline}
                      cecHours={c.cec_hours}
                      thumbnailUrl={c.thumbnail_url}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
