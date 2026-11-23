'use client';

import { CheckCircle2 } from 'lucide-react';

import { coachingMuted } from '@/components/coaching-portal/coaching-ui';
import type { SessionReceiptView } from '@/lib/coaching-portal/session-receipt';

export function CoachingSessionReceiptList({
  receipts,
  testId = 'coaching-session-receipts',
}: {
  receipts: SessionReceiptView[];
  testId?: string;
}) {
  if (receipts.length === 0) {
    return (
      <p className={coachingMuted} data-testid={testId}>
        Past sessions will appear here after your first call.
      </p>
    );
  }

  return (
    <ul className="space-y-4" data-testid={testId}>
      {receipts.map((r) => (
        <li
          key={r.id}
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
          data-testid={`coaching-session-receipt-${r.id}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              {new Date(r.scheduledAt).toLocaleDateString('en-AU', { dateStyle: 'full' })}
            </p>
            <p className="text-xs text-slate-500">with {r.coachName}</p>
          </div>
          {r.summary ? <p className={`mt-2 text-sm ${coachingMuted}`}>{r.summary}</p> : null}
          {r.decisions.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                Decisions
              </p>
              <ul className="mt-2 space-y-2">
                {r.decisions.map((d) => (
                  <li key={d} className="flex gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {r.followUpLabel ? (
            <p className={`mt-3 text-xs ${coachingMuted}`}>Follow-up check: {r.followUpLabel}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}