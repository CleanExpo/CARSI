'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import type { CcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  ccwRoadshowTicketPackages,
  formatAudFromCents,
  type CcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';

type BookingFormState = {
  eventSlug: string;
  packageId: CcwRoadshowTicketPackage['id'];
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
};

export function CcwRoadshowBooking({ events }: { events: CcwRoadshowEvent[] }) {
  const [form, setForm] = useState<BookingFormState>({
    eventSlug: events[0]?.slug ?? '',
    packageId: 'single',
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const selectedEvent = useMemo(
    () => events.find((event) => event.slug === form.eventSlug) ?? events[0],
    [events, form.eventSlug],
  );
  const selectedPackage =
    ccwRoadshowTicketPackages.find((pkg) => pkg.id === form.packageId) ??
    ccwRoadshowTicketPackages[0];

  if (!selectedEvent || !selectedPackage) {
    return null;
  }

  function updateField<K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitBooking() {
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/events/ccw-roadshow/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        checkout_url?: string;
        detail?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkout_url) {
        throw new Error(payload.detail || payload.error || 'Could not start checkout.');
      }

      window.location.href = payload.checkout_url;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not start checkout.');
    }
  }

  return (
    <div className="rounded-2xl border border-[rgba(36,144,237,0.24)] bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#34d399] uppercase">
          Bookings Essential
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Reserve your seat
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/58">
          {selectedEvent.city} - {selectedEvent.dates}. Stripe Checkout will collect payment and
          send confirmation to the email entered here.
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-white/75">Event</span>
          <select
            value={form.eventSlug}
            onChange={(event) => updateField('eventSlug', event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm text-white outline-none transition-colors focus:border-[#2490ed]"
          >
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.city} - {event.dates}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="mb-2 block text-sm font-medium text-white/75">Ticket</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {ccwRoadshowTicketPackages.map((pkg) => {
              const active = form.packageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => updateField('packageId', pkg.id)}
                  className={`min-h-24 rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? 'border-[#2490ed] bg-[rgba(36,144,237,0.14)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/22'
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">{pkg.label}</span>
                  <span className="mt-1 block text-lg font-semibold text-[#34d399]">
                    {formatAudFromCents(pkg.unitAmountCents)}
                  </span>
                  <span className="mt-1 block text-xs text-white/50">
                    {pkg.attendeeCount} {pkg.attendeeCount === 1 ? 'seat' : 'seats'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/75">Name</span>
            <input
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              autoComplete="name"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/24 focus:border-[#2490ed]"
              placeholder="Full name"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/75">Business</span>
            <input
              value={form.businessName}
              onChange={(event) => updateField('businessName', event.target.value)}
              autoComplete="organization"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/24 focus:border-[#2490ed]"
              placeholder="Business name"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/75">Email</span>
            <input
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              autoComplete="email"
              inputMode="email"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/24 focus:border-[#2490ed]"
              placeholder="name@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/75">Phone</span>
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              autoComplete="tel"
              inputMode="tel"
              className="h-11 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm text-white outline-none transition-colors placeholder:text-white/24 focus:border-[#2490ed]"
              placeholder="Mobile number"
            />
          </label>
        </div>

        {message && (
          <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={submitBooking}
          disabled={status === 'loading'}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2490ed] px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          Pay {formatAudFromCents(selectedPackage.unitAmountCents)} and book
        </button>
      </div>
    </div>
  );
}
