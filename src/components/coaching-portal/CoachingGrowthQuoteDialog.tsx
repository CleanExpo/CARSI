'use client';

import { Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CoachingTextArea } from '@/components/coaching-portal/coaching-form-primitives';
import { coachingPrimaryBtn, coachingSecondaryBtn } from '@/components/coaching-portal/coaching-ui';
import type { GrowthServiceItem } from '@/lib/coaching-portal/growth-services';

export function CoachingGrowthQuoteDialog({
  open,
  service,
  onClose,
}: {
  open: boolean;
  service: GrowthServiceItem | null;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setMessage('');
      setDone(false);
      setError(null);
    }
  }, [open]);

  if (!open || !service) return null;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/coaching/portal/growth-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: service!.id, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(data.detail ?? 'Could not send request.');
        return;
      }
      setDone(true);
    } catch {
      setError('Could not send request.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="growth-quote-title"
        className="relative w-full max-w-lg rounded-xl border border-white/[0.1] bg-[#0c1424] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        {done ? (
          <>
            <h2 id="growth-quote-title" className="text-lg font-semibold text-white">
              Request sent
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Check your inbox for confirmation. We will reply with a written quote before any work
              starts.
            </p>
            <button type="button" className={`mt-6 ${coachingSecondaryBtn}`} onClick={onClose}>
              Close
            </button>
          </>
        ) : (
          <>
            <h2 id="growth-quote-title" className="pr-8 text-lg font-semibold text-white">
              Request a quote
            </h2>
            <p className="mt-1 text-sm font-medium text-sky-300">{service.title}</p>
            <p className="mt-1 text-xs text-slate-500">Indicative {service.rateLabel}</p>
            <div className="mt-5">
              <CoachingTextArea
                label="Tell us about your business and what you need"
                required
                rows={5}
                value={message}
                placeholder="Timeline, current website, location, and any constraints help us quote accurately."
                onChange={setMessage}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                className={coachingPrimaryBtn}
                onClick={() => void submit()}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send quote request
              </button>
              <button type="button" className={coachingSecondaryBtn} onClick={onClose}>
                Cancel
              </button>
            </div>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
