'use client';

import { ArrowRight, Loader2, Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import type { BusinessCoachingSession } from '@/lib/marketing/business-coaching';
import {
  businessCoachingPackages,
  businessCoachingSeatPriceCents,
  formatAudFromCents,
  resolveInitialSessionSlug,
  type BusinessCoachingPackage,
} from '@/lib/marketing/business-coaching';
import {
  marketingBtnPrimary,
  marketingInput,
  marketingLabel,
  marketingPanel,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

type AttendeeForm = { fullName: string };
type Availability = { capacity: number; confirmed: number; remaining: number; isFull: boolean };

type FormState = {
  sessionSlug: string;
  packageId: BusinessCoachingPackage['id'];
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  discussionTopic: string;
  attendees: AttendeeForm[];
};

function emptyAttendee(): AttendeeForm {
  return { fullName: '' };
}

export function BusinessCoachingBooking({
  sessions,
  initialSlug,
  checkoutEnabled,
}: {
  sessions: BusinessCoachingSession[];
  initialSlug?: string;
  checkoutEnabled: boolean;
}) {
  const [form, setForm] = useState<FormState>({
    sessionSlug: resolveInitialSessionSlug(initialSlug, sessions),
    packageId: 'owner',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    discussionTopic: '',
    attendees: [emptyAttendee()],
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const selectedSession = useMemo(
    () => sessions.find((s) => s.slug === form.sessionSlug) ?? sessions[0],
    [sessions, form.sessionSlug]
  );
  const selectedPackage =
    businessCoachingPackages.find((p) => p.id === form.packageId) ?? businessCoachingPackages[0];

  useEffect(() => {
    if (initialSlug) return;
    const param = new URLSearchParams(window.location.search).get('session');
    const slug = resolveInitialSessionSlug(param, sessions);
    setForm((prev) => (slug && slug !== prev.sessionSlug ? { ...prev, sessionSlug: slug } : prev));
  }, [sessions, initialSlug]);

  useEffect(() => {
    let active = true;
    if (!form.sessionSlug) return;
    fetch(`/api/events/business-coaching/availability?session=${form.sessionSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setAvailability(data as Availability);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [form.sessionSlug]);

  if (!selectedSession || !selectedPackage || sessions.length === 0) {
    return (
      <p className="text-sm text-white/60">
        New session dates are being scheduled. Email support@carsi.com.au to be notified.
      </p>
    );
  }

  const maxSeats = selectedPackage.attendeeCount;
  const priceLabel = formatAudFromCents(businessCoachingSeatPriceCents * maxSeats);
  const isFull = availability?.isFull ?? false;

  function selectPackage(pkg: BusinessCoachingPackage) {
    setForm((current) => {
      const attendees = current.attendees.slice(0, pkg.attendeeCount);
      return {
        ...current,
        packageId: pkg.id,
        attendees: attendees.length ? attendees : [emptyAttendee()],
      };
    });
  }

  function updateAttendee(index: number, value: string) {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.map((a, i) => (i === index ? { ...a, fullName: value } : a)),
    }));
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function submit() {
    if (!checkoutEnabled || status === 'loading') return;
    setStatus('loading');
    setMessage('');

    if (!isValidEmail(form.contactEmail)) {
      setStatus('error');
      setMessage('Enter a valid email.');
      return;
    }
    if (!turnstileToken) {
      setStatus('error');
      setMessage('Complete the security check.');
      return;
    }

    try {
      const response = await fetch('/api/events/business-coaching/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionSlug: form.sessionSlug,
          packageId: form.packageId,
          companyName: form.companyName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          discussionTopic: form.discussionTopic,
          attendees: form.attendees,
          turnstileToken,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        checkout_url?: string;
        detail?: string;
      };
      if (!response.ok || !data.checkout_url) {
        setStatus('error');
        setMessage(data.detail || 'Could not start checkout.');
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setStatus('error');
      setMessage('Network error — try again.');
    }
  }

  return (
    <div id="book" className={`scroll-mt-24 p-5 sm:p-6 ${marketingPanel}`}>
      <h2 className={`text-lg font-semibold ${marketingTextStrong}`}>
        Book your seat — {priceLabel}
      </h2>
      <p className="mt-1 text-sm text-white/55">
        {formatAudFromCents(businessCoachingSeatPriceCents)} per person · pay securely with Stripe
      </p>

      <label className={`mt-4 block ${marketingLabel}`}>
        Session
        <select
          className={`mt-1 w-full ${marketingInput}`}
          value={form.sessionSlug}
          onChange={(e) => setForm((c) => ({ ...c, sessionSlug: e.target.value }))}
        >
          {sessions.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.monthLabel} — {s.dateLabel}
            </option>
          ))}
        </select>
      </label>

      {availability ? (
        <p className="mt-2 text-xs text-white/45">
          {availability.isFull
            ? 'This session is currently full — you may still pay to join the waitlist if seats open.'
            : `${availability.remaining} of ${availability.capacity} seats remaining`}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {businessCoachingPackages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => selectPackage(pkg)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              form.packageId === pkg.id
                ? 'border-[#2490ed]/50 bg-[#2490ed]/15 text-white'
                : 'border-white/15 bg-white/5 text-white/75 hover:bg-white/8'
            }`}
          >
            <span className="font-medium">{pkg.shortLabel}</span>
            <span className="mt-0.5 block text-xs text-white/45">{pkg.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={marketingLabel}>
          Business name
          <input
            className={`mt-1 w-full ${marketingInput}`}
            value={form.companyName}
            onChange={(e) => setForm((c) => ({ ...c, companyName: e.target.value }))}
          />
        </label>
        <label className={marketingLabel}>
          Email
          <input
            type="email"
            className={`mt-1 w-full ${marketingInput}`}
            value={form.contactEmail}
            onChange={(e) => setForm((c) => ({ ...c, contactEmail: e.target.value }))}
            required
          />
        </label>
        <label className={marketingLabel}>
          Mobile
          <input
            className={`mt-1 w-full ${marketingInput}`}
            value={form.contactPhone}
            onChange={(e) => setForm((c) => ({ ...c, contactPhone: e.target.value }))}
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <p className={marketingLabel}>Who is attending?</p>
        {form.attendees.map((a, index) => (
          <div key={index} className="flex gap-2">
            <input
              className={`min-w-0 flex-1 ${marketingInput}`}
              placeholder={index === 1 ? 'Partner name' : 'Your name'}
              value={a.fullName}
              onChange={(e) => updateAttendee(index, e.target.value)}
            />
            {index > 0 ? (
              <button
                type="button"
                className="rounded-lg border border-white/15 px-2 text-white/60"
                onClick={() =>
                  setForm((c) => ({
                    ...c,
                    packageId: 'owner',
                    attendees: c.attendees.slice(0, 1),
                  }))
                }
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}
        {form.attendees.length < maxSeats && form.packageId === 'owner-partner' ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-[#2490ed]"
            onClick={() => setForm((c) => ({ ...c, attendees: [...c.attendees, emptyAttendee()] }))}
          >
            <Plus className="h-3 w-3" /> Add partner name
          </button>
        ) : null}
      </div>

      <label className={`mt-4 block ${marketingLabel}`}>
        Topic you hope we discuss (optional)
        <textarea
          className={`mt-1 min-h-[72px] w-full ${marketingInput}`}
          value={form.discussionTopic}
          onChange={(e) => setForm((c) => ({ ...c, discussionTopic: e.target.value }))}
          placeholder="Quoting, hiring, cash flow, marketing on a budget…"
        />
      </label>

      <div className="mt-4">
        <TurnstileWidget onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
      </div>

      {message ? <p className="mt-3 text-sm text-amber-300">{message}</p> : null}

      <button
        type="button"
        disabled={!checkoutEnabled || status === 'loading'}
        onClick={() => void submit()}
        className={`mt-5 inline-flex w-full items-center justify-center gap-2 sm:w-auto ${marketingBtnPrimary}`}
      >
        {status === 'loading' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        Pay {priceLabel} with Stripe
      </button>
      {!checkoutEnabled ? (
        <p className="mt-2 text-xs text-amber-300">Online booking is temporarily paused.</p>
      ) : null}
    </div>
  );
}
