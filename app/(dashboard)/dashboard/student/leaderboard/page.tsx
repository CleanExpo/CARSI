'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

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
  discipline: string | null;
  items: LeaderboardEntry[];
}

const LEVEL_COLOURS: Record<number, string> = {
  1: 'text-zinc-400',
  2: 'text-emerald-400',
  3: 'text-cyan-400',
  4: 'text-blue-400',
  5: 'text-purple-400',
  6: 'text-amber-400',
};

const DISCIPLINE_OPTIONS = [
  { value: '', label: 'All disciplines' },
  { value: 'WRT', label: 'WRT' },
  { value: 'OCT', label: 'OCT' },
  { value: 'AMRT', label: 'AMRT' },
  { value: 'FSRT', label: 'FSRT' },
  { value: 'CRT', label: 'CRT' },
  { value: 'CCT', label: 'CCT' },
  { value: 'ASD', label: 'ASD' },
] as const;

function normalizeLeaderboardPayload(data: unknown): LeaderboardEntry[] {
  if (Array.isArray(data)) return data as LeaderboardEntry[];
  if (data && typeof data === 'object' && 'items' in data && Array.isArray((data as LeaderboardResponse).items)) {
    return (data as LeaderboardResponse).items;
  }
  return [];
}

export default function LeaderboardPage() {
  const [discipline, setDiscipline] = useState<string>('');
  const [meta, setMeta] = useState<{ period_label: string; period_timezone: string } | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = discipline ? `?discipline=${encodeURIComponent(discipline)}` : '';
      const res = await fetch(`/api/lms/gamification/leaderboard${qs}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err?.detail === 'string' ? err.detail : res.statusText);
      }
      const data = (await res.json()) as LeaderboardResponse | LeaderboardEntry[];
      const items = normalizeLeaderboardPayload(data);
      setEntries(items);
      if (data && typeof data === 'object' && !Array.isArray(data) && 'period_label' in data) {
        setMeta({
          period_label: data.period_label,
          period_timezone: data.period_timezone,
        });
      } else {
        setMeta(null);
      }
    } catch {
      setError('Could not load leaderboard.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [discipline]);

  useEffect(() => {
    load();
  }, [load]);

  const periodLabel =
    meta?.period_label ??
    new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-white/35 uppercase">
          Community
        </p>
        <h1 className="font-mono text-2xl font-bold text-white">Monthly recognition</h1>
        <p className="text-sm text-white/45">
          {periodLabel} ({meta?.period_timezone ?? 'Australia/Sydney'}) — top learners by
          completion-based activity this month. Names are{' '}
          <span className="text-white/70">anonymous by default</span>; you can opt in to a display
          name from{' '}
          <Link
            href="/dashboard/student/profile#recognition"
            className="text-[#7ec5ff] underline-offset-2 hover:underline"
          >
            your profile
          </Link>
          . Rankings reset each calendar month.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-widest text-white/35 uppercase">
          IICRC discipline
        </span>
        <div className="flex flex-wrap gap-2">
          {DISCIPLINE_OPTIONS.map((opt) => {
            const active = discipline === opt.value;
            return (
              <button
                key={opt.value || 'all'}
                type="button"
                onClick={() => setDiscipline(opt.value)}
                className={`rounded-sm border px-3 py-1.5 font-mono text-xs transition-colors ${
                  active
                    ? 'border-[#2490ed]/50 bg-[#2490ed]/15 text-white'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/15 hover:text-white/80'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-white/30">
          Filter limits XP to courses tagged with that discipline. Your level still reflects all
          completed learning.
        </p>
      </div>

      {loading && <p className="text-sm text-white/40">Loading…</p>}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-white/40">
          No qualifying activity this month for this view. Complete a lesson or course to appear —
          or check back after others begin the month&apos;s training.
        </p>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col divide-y divide-white/[0.04] rounded-sm border border-white/[0.06] bg-zinc-900/30">
          {entries.map((entry, index) => {
            const topTier = entry.rank <= 3;

            return (
              <div
                key={`${entry.rank}-${index}`}
                className={`flex items-center justify-between gap-4 px-4 py-4 ${
                  topTier ? 'bg-white/[0.02]' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span
                    className="w-10 shrink-0 text-center font-mono text-sm text-white/50"
                    aria-label={`Rank ${entry.rank}`}
                  >
                    {entry.rank}
                  </span>
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="truncate font-mono text-sm text-white">{entry.display_name}</span>
                    <span
                      className={`font-mono text-xs ${LEVEL_COLOURS[entry.current_level] ?? 'text-zinc-400'}`}
                    >
                      Level {entry.current_level} — {entry.level_title}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-mono text-sm font-semibold text-white tabular-nums">
                    {entry.total_xp.toLocaleString()}
                  </span>
                  <span className="text-[10px] tracking-wider text-white/30 uppercase">XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-white/30">
        XP is earned from lesson and course completions only — not from quizzes or social features.
        This board is meant as lightweight industry recognition, not a competition for points.
      </p>
    </main>
  );
}
