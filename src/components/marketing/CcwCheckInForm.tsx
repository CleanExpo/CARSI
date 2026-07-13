'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import {
  marketingBodySm,
  marketingBtnPrimary,
  marketingEyebrowPill,
  marketingInput,
  marketingLabel,
  marketingStatCard,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

type CheckInProps = {
  token: string;
  dayIndex: 1 | 2;
  eventCity: string;
  eventDates: string;
};

type CheckInResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
  code?: string;
  detail?: string;
};

/**
 * Admin-supervised self-service check-in — the attendee's OWN device.
 *
 * Deliberately shows NO roster and NO other-attendee PII (no enumeration). The
 * event-day-scoped token arrives via the QR/link and is posted straight back to
 * the server; the attendee only ever types their own details. Attending both
 * days yields a certificate of attendance (this course grants no CECs).
 */
export function CcwCheckInForm({ token, dayIndex, eventCity, eventDates }: CheckInProps) {
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function submit() {
    if (state === 'loading') return;
    setError('');

    const name = fullName.trim();
    const mail = email.trim();
    if (!name) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidEmail(mail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setState('loading');
    try {
      const response = await fetch('/api/events/ccw-roadshow/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          dayIndex,
          fullName: name,
          businessName: businessName.trim(),
          email: mail,
          turnstileToken,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as CheckInResponse;

      if (response.ok && payload.ok) {
        setState('done');
        setMessage(payload.message ?? "You're checked in.");
        return;
      }

      // Graceful, specific handling for the known refusal cases.
      if (payload.code === 'email_in_use') {
        setError(
          payload.detail ??
            'This email is already checked in under a different name. Please use a distinct email.',
        );
      } else if (payload.code === 'at_capacity') {
        setError(payload.detail ?? 'This event is at capacity — please see an organiser.');
      } else if (payload.code === 'token_expired' || payload.code === 'token_invalid' || payload.code === 'day_mismatch') {
        setError(
          payload.detail ??
            "This check-in code isn't valid right now. Please scan today's QR code or ask an organiser.",
        );
      } else {
        setError(payload.detail ?? 'Check-in failed. Please try again or see an organiser.');
      }
      setState('idle');
    } catch {
      setError('Network error. Please try again, or ask an organiser to sign you in.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className={`p-6 sm:p-8 ${marketingStatCard}`}>
        <CheckCircle2 className="h-12 w-12 text-[#34d399]" aria-hidden />
        <p className={`mt-5 ${marketingEyebrowPill}`}>Checked in · Day {dayIndex}</p>
        <h2 className={`mt-3 text-2xl font-bold tracking-tight ${marketingTextStrong}`}>
          You&apos;re all set
        </h2>
        <p className={`mt-3 ${marketingBodySm}`}>{message}</p>
      </div>
    );
  }

  return (
    <div className={`p-5 sm:p-6 ${marketingStatCard}`}>
      <div className="mb-5">
        <p className={marketingEyebrowPill}>Day {dayIndex} check-in</p>
        <h2 className={`mt-4 text-xl font-bold tracking-tight ${marketingTextStrong}`}>
          Check in for {eventCity}
        </h2>
        <p className={`mt-2 ${marketingBodySm}`}>
          {eventCity} · {eventDates}. Enter your own details below. Day 1 sets up your CARSI
          account — we&apos;ll email your login link.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className={marketingLabel}>Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className={marketingInput}
            placeholder="Your full name"
            required
          />
        </label>

        <label className="block">
          <span className={marketingLabel}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            className={marketingInput}
            placeholder="name@example.com"
            required
          />
          <span className={`mt-1 block ${marketingBodySm}`}>
            This becomes your CARSI login. Please use your own email — one per person.
          </span>
        </label>

        <label className="block">
          <span className={marketingLabel}>Business (optional)</span>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            autoComplete="organization"
            className={marketingInput}
            placeholder="Business name"
          />
          <span className={`mt-1 block ${marketingBodySm}`}>
            Attend both days for your certificate of attendance.
          </span>
        </label>

        <TurnstileWidget onVerify={setTurnstileToken} />

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={state === 'loading'}
          className={`h-12 w-full disabled:cursor-wait disabled:opacity-60 ${marketingBtnPrimary}`}
        >
          {state === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          Check in for Day {dayIndex}
        </button>
      </div>
    </div>
  );
}
