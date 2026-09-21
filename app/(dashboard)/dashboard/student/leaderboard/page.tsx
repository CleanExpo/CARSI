'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { apiClient } from '@/lib/api/client';
import { dash } from '@/lib/dashboard-light-ui';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  total_xp: number;
  current_level: number;
  level_title: string;
}

interface LeaderboardResponse {
  period_label: string;
  period_timezone: string;
  items: LeaderboardEntry[];
}

interface LevelData {
  total_xp: number;
  current_level: number;
  level_title: string;
  total_cec_lifetime?: number;
}

interface EnrollmentHint {
  status: string;
  all_lessons_complete?: boolean;
  certificate_issued_at?: string | null;
}

function normalizeLeaderboardPayload(data: unknown): LeaderboardEntry[] {
  if (Array.isArray(data)) return data as LeaderboardEntry[];
  if (
    data &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray((data as LeaderboardResponse).items)
  ) {
    return (data as LeaderboardResponse).items;
  }
  return [];
}

export default function LeaderboardPage() {
  const [meta, setMeta] = useState<{ period_label: string; period_timezone: string } | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [level, setLevel] = useState<LevelData | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [certificateCount, setCertificateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [boardRes, levelData, enrollments] = await Promise.all([
        fetch('/api/lms/gamification/leaderboard').then(async (res) => {
          if (!res.ok) throw new Error('board');
          return res.json() as Promise<LeaderboardResponse | LeaderboardEntry[]>;
        }),
        apiClient.get<LevelData>('/api/lms/gamification/me/level').catch(() => null),
        apiClient
          .get<EnrollmentHint[]>('/api/lms/enrollments/me')
          .catch(() => [] as EnrollmentHint[]),
      ]);
      setEntries(normalizeLeaderboardPayload(boardRes));
      if (
        boardRes &&
        typeof boardRes === 'object' &&
        !Array.isArray(boardRes) &&
        'period_label' in boardRes
      ) {
        setMeta({ period_label: boardRes.period_label, period_timezone: boardRes.period_timezone });
      }
      setLevel(levelData);
      const done = enrollments.filter((e) => e.status === 'completed' || e.all_lessons_complete);
      setCompletedCount(done.length);
      setCertificateCount(done.filter((e) => e.certificate_issued_at).length);
    } catch {
      setError('Your achievements could not be loaded.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount
    load();
  }, [load]);

  const cec = level?.total_cec_lifetime ?? 0;
  const milestones = [
    { id: 'first-course', label: 'First course completed', earned: completedCount >= 1 },
    { id: 'first-cert', label: 'First certificate', earned: certificateCount >= 1 },
    { id: 'cec', label: 'CEC hours recorded', earned: cec > 0 },
    { id: 'multi', label: 'Multiple courses completed', earned: completedCount >= 2 },
  ];
  const anyMilestone = milestones.some((m) => m.earned);

  return (
    <div className="max-w-9xl mx-auto flex w-full flex-col gap-8 pb-16">
      <header>
        <h1 className={dash.h1}>Achievements</h1>
        <p className={`mt-2 ${dash.lead}`}>Your learning milestones.</p>
      </header>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {!loading && !error && !anyMilestone ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
          <p className="font-medium text-slate-900">
            Your achievements will appear as you complete learning milestones.
          </p>
          <Link href="/dashboard/courses" className={`mt-6 ${dash.btnSecondary}`}>
            Browse courses
          </Link>
        </div>
      ) : null}

      {!loading && !error && anyMilestone ? (
        <ul className="space-y-2">
          {milestones
            .filter((m) => m.earned)
            .map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"
              >
                {m.label}
              </li>
            ))}
        </ul>
      ) : null}

      {!loading && !error && entries.length > 0 ? (
        <section>
          <h2 className={dash.h2}>This month</h2>
          <p className={`mt-1 text-sm ${dash.muted}`}>
            {meta?.period_label ?? 'Current month'} · completion-based activity.{' '}
            <Link
              href="/dashboard/student/profile#recognition"
              className="text-[#146fc2] hover:underline"
            >
              Choose how you appear
            </Link>
            .
          </p>
          <ol className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {entries.map((entry, index) => (
              <li
                key={`${entry.rank}-${index}`}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {entry.display_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Level {entry.current_level} · {entry.level_title}
                  </p>
                </div>
                <p className="text-sm text-slate-600 tabular-nums">
                  {entry.total_xp.toLocaleString()} XP
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
