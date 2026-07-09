'use client';

import { useState } from 'react';

import { TurnstileWidget } from '@/components/security/TurnstileWidget';

export interface GovGuideLeadContext {
  source?: string;
  topic?: string;
  intent?: string;
  pageUrl?: string;
}

type Status = 'idle' | 'sending' | 'success' | 'error';

/**
 * GP-199 email-capture form. Email-only (lowest friction); on success it reveals
 * the download link returned by the API (the guide is also emailed). Mirrors the
 * ContactForm client pattern: Turnstile token + fetch + success card.
 */
export function GovGuideForm({ leadContext }: { leadContext?: GovGuideLeadContext }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/lead-magnet/gov-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, leadContext, turnstileToken }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        downloadUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.downloadUrl) throw new Error(data.error ?? 'Failed');
      setDownloadUrl(data.downloadUrl);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  const fieldClass =
    'w-full rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#2490ed]/60 focus:ring-2 focus:ring-[#2490ed]/15';
  const fieldStyle = {
    background: '#ffffff',
    border: '1px solid rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;

  if (status === 'success' && downloadUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg bg-white p-8 text-center shadow-sm"
        style={{ border: '1px solid rgba(36,144,237,0.2)' }}
      >
        <p className="mb-2 text-xl font-bold text-slate-950">Your guide is ready</p>
        <p className="mb-6 text-sm text-slate-600">
          We&apos;ve also emailed the link so you can find it later.
        </p>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="inline-flex min-h-12 items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ background: '#146fc2' }}
        >
          Download the guide (PDF)
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="lead-email" className="block text-xs font-medium" style={{ color: '#334155' }}>
          Work email address
        </label>
        <input
          id="lead-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com.au"
          className={fieldClass}
          style={fieldStyle}
        />
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-700">
          Something went wrong. Please try again, or email support@carsi.com.au
        </p>
      )}

      <TurnstileWidget onVerify={setTurnstileToken} />

      <button
        type="submit"
        disabled={status === 'sending'}
        className="min-h-12 w-full rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
        style={{ background: '#146fc2' }}
      >
        {status === 'sending' ? 'Sending…' : 'Send me the guide'}
      </button>

      <p className="text-center text-[11px] leading-4 text-slate-500">
        We&apos;ll email you the guide and occasional CARSI updates. Unsubscribe any time.
      </p>
    </form>
  );
}
