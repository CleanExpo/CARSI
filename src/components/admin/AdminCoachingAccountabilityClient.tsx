'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ACCOUNTABILITY_COPY } from '@/lib/coaching-portal/accountability';
import type { CoachAlertView, CoachMemberView } from '@/lib/server/carsi-coaching-accountability';

const ENDPOINT = '/api/admin/coaching/accountability';
const COPY = ACCOUNTABILITY_COPY.coach;

const surface =
  'rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]';

function alertText(a: CoachAlertView): string {
  return a.kind === 'silent'
    ? ACCOUNTABILITY_COPY.email.coachSilent(a.memberLabel, a.daysSilent)
    : ACCOUNTABILITY_COPY.email.coachBlocked(a.memberLabel, a.blockedCount);
}

/**
 * GP-635 coach view. Lists only members who need the coach (silent 21 days, or two blocked
 * actions on one goal), then a one-line status for every member with check-ins set up.
 */
export function AdminCoachingAccountabilityClient() {
  const [data, setData] = useState<{ alerts: CoachAlertView[]; members: CoachMemberView[] } | null>(
    null
  );
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch(ENDPOINT);
      if (res.status === 404) {
        setError('Member accountability is turned off (CARSI_COACHING_ACCOUNTABILITY_ENABLED).');
        return;
      }
      if (!res.ok) {
        setError('Could not load member accountability.');
        return;
      }
      setData((await res.json()) as { alerts: CoachAlertView[]; members: CoachMemberView[] });
    })();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">{COPY.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">{COPY.intro}</p>
      </header>

      {error ? <p className="text-sm text-amber-200">{error}</p> : null}
      {!data && !error ? <Loader2 className="h-5 w-5 animate-spin text-white/50" /> : null}

      {data ? (
        <>
          <section className={`${surface} p-5`}>
            <h2 className="text-sm font-semibold text-white/80">Needs attention</h2>
            {data.alerts.length === 0 ? (
              <p className="mt-2 text-sm text-white/55">{COPY.noAlerts}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {data.alerts.map((a) => (
                  <li
                    key={`${a.userId}:${a.key}`}
                    className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-50"
                  >
                    {alertText(a)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={`${surface} overflow-x-auto p-5`}>
            <h2 className="text-sm font-semibold text-white/80">{COPY.membersTitle}</h2>
            <table className="mt-3 w-full min-w-[40rem] text-left text-sm text-white/80">
              <thead className="text-xs tracking-wide text-white/45 uppercase">
                <tr>
                  <th className="py-2 pr-4 font-medium">Member</th>
                  <th className="py-2 pr-4 font-medium">Days quiet</th>
                  <th className="py-2 pr-4 font-medium">Streak</th>
                  <th className="py-2 pr-4 font-medium">Actions done</th>
                  <th className="py-2 font-medium">Latest numbers</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.userId} className="border-t border-white/[0.06] align-top">
                    <td className="py-2 pr-4 font-medium text-white">{m.memberLabel}</td>
                    <td className="py-2 pr-4 font-mono">{m.daysSilent}</td>
                    <td className="py-2 pr-4 font-mono">{m.streak}</td>
                    <td className="py-2 pr-4 font-mono">{m.completionPercent}%</td>
                    <td className="py-2 text-white/65">
                      {m.kpis
                        .map((k) => `${k.label}: ${k.latest === null ? 'none yet' : k.latest}`)
                        .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
