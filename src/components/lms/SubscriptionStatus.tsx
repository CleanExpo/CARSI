'use client';

type SubStatus = 'trialling' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | null;

interface SubscriptionStatusProps {
  status: SubStatus;
  trialEnd?: string | null;
  periodEnd?: string | null;
  onManage?: () => void;
  onSubscribe?: () => void;
}

const STATUS_CONFIG: Record<NonNullable<SubStatus>, { label: string; colour: string }> = {
  trialling: { label: 'Free Trial Active', colour: 'text-amber-400 bg-amber-950' },
  active: { label: 'Pro Subscriber', colour: 'text-emerald-400 bg-emerald-950' },
  past_due: { label: 'Payment Overdue', colour: 'text-red-400 bg-red-950' },
  cancelled: { label: 'Cancelled', colour: 'text-zinc-400 bg-zinc-800' },
  unpaid: { label: 'Unpaid', colour: 'text-red-400 bg-red-950' },
};

function _formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SubscriptionStatus({
  status,
  trialEnd,
  periodEnd,
  onManage,
  onSubscribe,
}: SubscriptionStatusProps) {
  if (!status) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/50">No active subscription.</p>
        {onSubscribe && (
          <button
            onClick={onSubscribe}
            className="rounded-sm bg-cyan-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-cyan-500"
          >
            Start 7-Day Free Trial — $795 AUD/year
          </button>
        )}
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  const dateLabel =
    status === 'trialling' && trialEnd
      ? `Trial ends ${_formatDate(trialEnd)}`
      : periodEnd
        ? `Renews ${_formatDate(periodEnd)}`
        : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-xs font-semibold ${config.colour}`}
        >
          {config.label}
        </span>
        {dateLabel && <span className="text-xs text-white/40">{dateLabel}</span>}
      </div>
      {onManage && (
        <button
          onClick={onManage}
          className="text-left text-xs text-white/40 underline transition-colors hover:text-white/60"
        >
          Manage subscription →
        </button>
      )}
    </div>
  );
}
