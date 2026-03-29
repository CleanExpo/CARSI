'use client';

import { useEffect, useState } from 'react';
import { getBackendOrigin } from '@/lib/env/public-url';

const API = getBackendOrigin();

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  total_xp: number;
  current_level: number;
  level_title: string;
}

const LEVEL_COLOURS: Record<number, string> = {
  1: 'text-zinc-400',
  2: 'text-emerald-400',
  3: 'text-cyan-400',
  4: 'text-blue-400',
  5: 'text-purple-400',
  6: 'text-amber-400',
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/lms/gamification/leaderboard`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setEntries)
      .catch(() => setError('Could not load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <main className="flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">Monthly Leaderboard</h1>
        <p className="text-sm text-white/40">{monthLabel} — top 20 by XP earned</p>
      </div>

      {loading && <p className="text-sm text-white/40">Loading…</p>}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-white/40">
          No activity recorded yet this month. Complete a lesson to appear!
        </p>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const medals = ['', '🥇', '🥈', '🥉'];

            return (
              <div
                key={entry.rank}
                className={`flex items-center justify-between px-2 py-4 ${
                  isTop3 ? 'rounded-sm bg-white/[0.02]' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center font-mono text-white/40">
                    {isTop3 ? medals[entry.rank] : `#${entry.rank}`}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm text-white">{entry.display_name}</span>
                    <span
                      className={`font-mono text-xs ${LEVEL_COLOURS[entry.current_level] ?? 'text-zinc-400'}`}
                    >
                      Lvl {entry.current_level} — {entry.level_title}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-sm font-bold text-white">
                    {entry.total_xp.toLocaleString()}
                  </span>
                  <span className="text-xs text-white/30">XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
