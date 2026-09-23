'use client';

import { ArrowRight, Award, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ErrorBanner } from '@/components/lms/ErrorBanner';
import { apiClient } from '@/lib/api/client';
import { formatCecHoursForDisplay } from '@/lib/cec-display';

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
  cec_hours?: number | null;
}

const surface = 'learner-home-surface learner-home-card overflow-hidden rounded-[1.25rem]';
const inset = 'learner-home-inset';
const kicker =
  'bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-200 bg-clip-text text-[11px] font-semibold tracking-[0.2em] text-transparent uppercase';
const heading = 'font-semibold tracking-[-0.02em] text-white';
const muted = 'text-slate-300/80';
const btn =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-white via-sky-50 to-white px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_10px_28px_-10px_rgba(56,189,248,0.8)] transition hover:from-sky-50 hover:to-white';

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
  const [approvedCec, setApprovedCec] = useState(0);
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
      setApprovedCec(
        done.reduce((sum, e) => sum + (e.cec_hours != null && e.cec_hours > 0 ? e.cec_hours : 0), 0)
      );
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

  const cecFromLevel = level?.total_cec_lifetime ?? 0;
  const cec = approvedCec > 0 ? approvedCec : cecFromLevel > 0 ? cecFromLevel : 0;
  const cecLabel = formatCecHoursForDisplay(cec);
  const milestones = [
    {
      id: 'first-course',
      label: 'First course completed',
      detail: 'You finished a CARSI course.',
      earned: completedCount >= 1,
    },
    {
      id: 'first-cert',
      label: 'First certificate',
      detail: 'A completion certificate is on your record.',
      earned: certificateCount >= 1,
    },
    {
      id: 'cec',
      label: 'Approved IICRC CEC hours',
      detail: 'Hours appear only after IICRC confirmation.',
      earned: cec > 0,
    },
    {
      id: 'multi',
      label: 'Multiple courses completed',
      detail: 'You have finished more than one course.',
      earned: completedCount >= 2,
    },
  ];
  const earned = milestones.filter((m) => m.earned);
  const locked = milestones.filter((m) => !m.earned);

  return (
    <div className="learner-home -mx-4 w-[calc(100%+2rem)] min-w-0 space-y-10 px-4 pb-16 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:-mx-10 lg:w-[calc(100%+5rem)] lg:px-10">
      <header>
        <p className="text-[13px] text-slate-500">Recognition</p>
        <h1 className="mt-2 text-[2.4rem] leading-[1.05] font-semibold tracking-tight text-slate-950 sm:text-[2.75rem]">
          Achievements
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-6 text-slate-500">
          Milestones from completed learning. Approved IICRC CEC hours appear only where the IICRC
          has confirmed them.
        </p>
      </header>

      {loading ? <div className={`${surface} h-48 animate-pulse`} aria-busy="true" /> : null}

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {!loading && !error ? (
        <section className="grid w-full items-stretch gap-5 lg:grid-cols-2">
          <div className={`${surface} px-7 py-7`}>
            <p className={kicker}>Your record</p>
            <dl className="mt-7 grid grid-cols-2 gap-3">
              <div className={`${inset} rounded-xl px-3 py-4`}>
                <dt className={`text-[11px] ${muted}`}>Level</dt>
                <dd className={`mt-2 text-[1.85rem] leading-none tabular-nums ${heading}`}>
                  {level?.current_level ?? '—'}
                </dd>
                <p className={`mt-2 text-[12px] ${muted}`}>
                  {level?.level_title ?? 'Keep learning'}
                </p>
              </div>
              <div className={`${inset} rounded-xl px-3 py-4`}>
                <dt className={`text-[11px] ${muted}`}>XP</dt>
                <dd className={`mt-2 text-[1.85rem] leading-none tabular-nums ${heading}`}>
                  {(level?.total_xp ?? 0).toLocaleString()}
                </dd>
              </div>
              <div className={`${inset} rounded-xl px-3 py-4`}>
                <dt className={`text-[11px] ${muted}`}>Completed</dt>
                <dd className={`mt-2 text-[1.85rem] leading-none tabular-nums ${heading}`}>
                  {completedCount}
                </dd>
              </div>
              <div className={`${inset} rounded-xl px-3 py-4`}>
                <dt className={`text-[11px] ${muted}`}>Approved IICRC CEC</dt>
                <dd className={`mt-2 text-[1.85rem] leading-none tabular-nums ${heading}`}>
                  {cecLabel ?? '0'}
                </dd>
              </div>
            </dl>
          </div>
          <div
            className={`${surface} learner-home-surface--hero flex flex-col justify-between px-7 py-7`}
          >
            <div>
              <p className={kicker}>Certificates</p>
              <p className={`mt-3 text-[2.4rem] leading-none tabular-nums ${heading}`}>
                {certificateCount}
              </p>
              <p className={`mt-3 text-[15px] leading-6 ${muted}`}>
                Open Credentials to download a certificate or share an employer proof pack.
              </p>
            </div>
            <Link href="/dashboard/student/credentials" className={`${btn} mt-8 self-start`}>
              View certificates
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      ) : null}

      {!loading && !error ? (
        <section>
          <div className="mb-5">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-slate-950">
              Milestones
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">
              Earned marks stay on this page. Locked items show what is still ahead.
            </p>
          </div>
          {earned.length === 0 && locked.length > 0 ? (
            <div className={`${surface} learner-home-surface--hero mb-5 px-8 py-10 text-center`}>
              <Trophy className="mx-auto h-8 w-8 text-sky-200" aria-hidden />
              <p className={`mt-4 text-[1.2rem] ${heading}`}>
                Your achievements will appear as you complete learning milestones.
              </p>
              <Link href="/dashboard/courses" className={`${btn} mt-6`}>
                Browse courses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : null}
          <ul className="grid gap-4 sm:grid-cols-2">
            {milestones.map((m) => (
              <li key={m.id} className={`${surface} flex gap-4 px-5 py-5`}>
                <span
                  className={`${inset} inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    m.earned ? 'text-sky-200' : 'text-slate-500'
                  }`}
                >
                  <Award className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className={kicker}>{m.earned ? 'Earned' : 'Locked'}</p>
                  <p className={`mt-2 text-[1.05rem] ${heading}`}>{m.label}</p>
                  <p className={`mt-1 text-[13px] ${muted}`}>{m.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && !error && entries.length > 0 ? (
        <section>
          <div className="mb-5">
            <h2 className="text-[1.4rem] font-semibold tracking-tight text-slate-950">
              This month
            </h2>
            <p className="mt-1 text-[14px] text-slate-500">
              {meta?.period_label ?? 'Current month'} · completion-based activity.{' '}
              <Link
                href="/dashboard/student/profile#recognition"
                className="text-[#146fc2] hover:underline"
              >
                Choose how you appear
              </Link>
              .
            </p>
          </div>
          <ol className={`${surface} divide-y divide-white/10`}>
            {entries.map((entry, index) => (
              <li
                key={`${entry.rank}-${index}`}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className={`${inset} inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold text-sky-100 tabular-nums`}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0">
                    <p className={`truncate text-[15px] ${heading}`}>{entry.display_name}</p>
                    <p className={`text-[13px] ${muted}`}>
                      Level {entry.current_level} · {entry.level_title}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-sky-100 tabular-nums">
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
