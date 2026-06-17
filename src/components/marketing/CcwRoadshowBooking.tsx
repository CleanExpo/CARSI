'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import type { CcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowTicketPackages,
  formatAudFromCents,
  type CcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';
import {
  marketingBodySm,
  marketingBtnPrimary,
  marketingEyebrowPill,
  marketingInput,
  marketingPanel,
  marketingStatCard,
} from '@/lib/marketing/marketing-ui';

type BookingFormState = {
  eventSlug: string;
  packageId: CcwRoadshowTicketPackage['id'];
  ccwCustomerStatus: 'current' | 'past' | 'not_sure';
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
};

const labelClass = 'mb-1.5 block text-xs font-medium tracking-wide text-white/45 uppercase';

export function CcwRoadshowBooking({ events }: { events: CcwRoadshowEvent[] }) {
  const [form, setForm] = useState<BookingFormState>({
    eventSlug: events[0]?.slug ?? '',
    packageId: 'single',
    ccwCustomerStatus: 'current',
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

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function submitBooking() {
    setStatus('loading');
    setMessage('');

    const fullName = form.fullName.trim();
    const email = form.email.trim();

    if (!fullName) {
      setStatus('error');
      setMessage('Name is required.');
      return;
    }

    if (!email || !isValidEmail(email)) {
      setStatus('error');
      setMessage('A valid email is required.');
      return;
    }

    try {
      const response = await fetch('/api/events/ccw-roadshow/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fullName, email }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        checkout_url?: string;
        booking_url?: string;
        detail?: string;
        error?: string;
      };
      const destination = payload.booking_url || payload.checkout_url;

      if (!response.ok || !destination) {
        throw new Error(payload.detail || payload.error || 'Could not reserve your free entry.');
      }

      window.location.href = destination;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not reserve your free entry.');
    }
  }

  return (
    <div className={`p-5 sm:p-6 ${marketingStatCard}`}>
      <div className="mb-5">
        <p className={marketingEyebrowPill}>Limited places</p>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
          Claim your free entry token
        </h2>
        <p className={`mt-2 ${marketingBodySm}`}>
          {selectedEvent.city} - {selectedEvent.dates}. {ccwRoadshowFreeEntryOffer.detail}
        </p>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className={labelClass}>Event</span>
          <select
            value={form.eventSlug}
            onChange={(event) => updateField('eventSlug', event.target.value)}
            className={marketingInput}
          >
            {events.map((event) => (
              <option key={event.slug} value={event.slug}>
                {event.city} - {event.dates}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className={labelClass}>Ticket</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {ccwRoadshowTicketPackages.map((pkg) => {
              const active = form.packageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => updateField('packageId', pkg.id)}
                  className={`min-h-[5.5rem] rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-[#2490ed]/50 bg-[#2490ed]/12 shadow-[0_8px_24px_-12px_rgba(36,144,237,0.35)]'
                      : `${marketingPanel} hover:border-white/20`
                  }`}
                >
                  <span className="block text-sm font-semibold text-white/90">{pkg.label}</span>
                  <span className="mt-1 block text-lg font-bold text-white">
                    {formatAudFromCents(pkg.unitAmountCents)}
                  </span>
                  <span className={`mt-1 block ${marketingBodySm}`}>
                    {pkg.attendeeCount} {pkg.attendeeCount === 1 ? 'seat' : 'seats'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>CCW customer status</span>
          <select
            value={form.ccwCustomerStatus}
            onChange={(event) =>
              updateField(
                'ccwCustomerStatus',
                event.target.value as BookingFormState['ccwCustomerStatus'],
              )
            }
            className={marketingInput}
          >
            <option value="current">Current CCW customer</option>
            <option value="past">Past CCW customer</option>
            <option value="not_sure">Not sure / CCW team can confirm</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Name</span>
            <input
              type="text"
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              autoComplete="name"
              required
              className={marketingInput}
              placeholder="Full name"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Business</span>
            <input
              value={form.businessName}
              onChange={(event) => updateField('businessName', event.target.value)}
              autoComplete="organization"
              className={marketingInput}
              placeholder="Business name"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              className={marketingInput}
              placeholder="name@example.com"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Phone</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              autoComplete="tel"
              inputMode="tel"
              className={marketingInput}
              placeholder="Mobile number"
            />
          </label>
        </div>

        {message && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={submitBooking}
          disabled={status === 'loading'}
          className={`h-12 w-full disabled:cursor-wait disabled:opacity-60 ${marketingBtnPrimary}`}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          Claim {formatAudFromCents(selectedPackage.unitAmountCents).toLowerCase()} entry token
        </button>
      </div>
    </div>
  );
}
