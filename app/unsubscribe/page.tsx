'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

type Status = 'working' | 'unsubscribed' | 'resubscribed' | 'error';

async function postSubscription(token: string, resubscribe: boolean): Promise<boolean> {
  const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resubscribe }),
  });
  return res.ok;
}

function UnsubscribeCard() {
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<Status>('working');
  const [pending, setPending] = useState(false);

  // Auto opt-out on load. Running in the browser (not a link prefetch/scanner)
  // means we honour genuine clicks without an extra confirmation step.
  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    let active = true;
    postSubscription(token, false).then((ok) => {
      if (active) setStatus(ok ? 'unsubscribed' : 'error');
    });
    return () => {
      active = false;
    };
  }, [token]);

  const toggle = useCallback(
    async (resubscribe: boolean) => {
      if (!token || pending) return;
      setPending(true);
      const ok = await postSubscription(token, resubscribe);
      setPending(false);
      if (ok) setStatus(resubscribe ? 'resubscribed' : 'unsubscribed');
    },
    [token, pending]
  );

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#0a0a0a]">
      <p className="inline-flex rounded-full border border-[#b8dbfb] bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#146fc2] uppercase dark:border-[#146fc2]/40 dark:bg-[#146fc2]/10 dark:text-[#8fd0ff]">
        Email preferences
      </p>

      {status === 'working' && (
        <>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">Updating…</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/65">
            One moment while we update your email preferences.
          </p>
        </>
      )}

      {status === 'unsubscribed' && (
        <>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            You’ve been unsubscribed
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/65">
            You won’t receive toolbox-talk or other marketing emails from CARSI. Important
            account and certification emails will still be sent.
          </p>
          <button
            type="button"
            onClick={() => toggle(true)}
            disabled={pending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#146fc2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f5fa8] disabled:opacity-60"
          >
            {pending ? 'Working…' : 'Changed your mind? Resubscribe'}
          </button>
        </>
      )}

      {status === 'resubscribed' && (
        <>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            You’re subscribed again
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/65">
            You’ll keep receiving CARSI toolbox-talk and update emails.
          </p>
          <button
            type="button"
            onClick={() => toggle(false)}
            disabled={pending}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/5"
          >
            {pending ? 'Working…' : 'Unsubscribe again'}
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
            This link isn’t valid
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-white/65">
            The unsubscribe link is missing or invalid. You can manage email preferences from
            your account settings instead.
          </p>
          <Link
            href="/dashboard/settings/notifications"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#146fc2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f5fa8]"
          >
            Manage preferences
          </Link>
        </>
      )}

      <p className="mt-8 text-xs text-slate-400 dark:text-white/40">
        <Link href="/" className="hover:underline">
          Return to carsi.com.au
        </Link>
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 py-16 text-slate-900 dark:bg-[#050505] dark:text-white">
      <Suspense
        fallback={
          <div className="text-sm text-slate-500 dark:text-white/60">Loading…</div>
        }
      >
        <UnsubscribeCard />
      </Suspense>
    </main>
  );
}
