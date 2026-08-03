'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Plus, X } from 'lucide-react';

import { TurnstileWidget } from '@/components/security/TurnstileWidget';
import type { CcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  ccwRoadshowExperienceBands,
  ccwRoadshowFreeEntryOffer,
  ccwRoadshowTicketPackages,
  resolveInitialEventSlug,
  type CcwRoadshowTicketPackage,
} from '@/lib/marketing/ccw-roadshow';
import {
  marketingBodySm,
  marketingBtnPrimary,
  marketingEyebrowPill,
  marketingInput,
  marketingLabel,
  marketingPanel,
  marketingStatCard,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';

type AttendeeForm = { fullName: string; yearsExperience: string; goals: string };
type Availability = { capacity: number; confirmed: number; remaining: number; isFull: boolean };

type BookingFormState = {
  eventSlug: string;
  packageId: CcwRoadshowTicketPackage['id'];
  ccwCustomerStatus: 'current' | 'past' | 'not_sure';
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  attendees: AttendeeForm[];
};

const labelClass = marketingLabel;

function emptyAttendee(): AttendeeForm {
  return { fullName: '', yearsExperience: '', goals: '' };
}

export function CcwRoadshowBooking({
  events,
  initialSlug,
}: {
  events: CcwRoadshowEvent[];
  initialSlug?: string;
}) {
  const [form, setForm] = useState<BookingFormState>({
    eventSlug: resolveInitialEventSlug(initialSlug, events),
    packageId: 'single',
    ccwCustomerStatus: 'current',
    companyName: '',
    contactEmail: '',
    contactPhone: '',
    attendees: [emptyAttendee()],
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');

  const selectedEvent = useMemo(
    () => events.find((event) => event.slug === form.eventSlug) ?? events[0],
    [events, form.eventSlug],
  );
  const selectedPackage =
    ccwRoadshowTicketPackages.find((pkg) => pkg.id === form.packageId) ??
    ccwRoadshowTicketPackages[0];

  // On the dedicated /ccw-melbourne and /ccw-sydney pages the city is fixed via
  // `initialSlug` (preselected server-side, no flash). On the combined page,
  // honour a `?event=` query param if present. Runs once on mount; `events` is a
  // stable module constant, so it never clobbers a manual change.
  useEffect(() => {
    if (initialSlug) return;
    const param = new URLSearchParams(window.location.search).get('event');
    const slug = resolveInitialEventSlug(param, events);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    setForm((prev) => (slug && slug !== prev.eventSlug ? { ...prev, eventSlug: slug } : prev));
  }, [events, initialSlug]);

  useEffect(() => {
    let active = true;
    if (!form.eventSlug) return;
    fetch(`/api/events/ccw-roadshow/availability?event=${form.eventSlug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setAvailability(data as Availability);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [form.eventSlug]);

  if (!selectedEvent || !selectedPackage) {
    return null;
  }

  const maxSeats = selectedPackage.attendeeCount;
  const isFull = availability?.isFull ?? false;

  function updateField<K extends keyof BookingFormState>(key: K, value: BookingFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectPackage(pkg: CcwRoadshowTicketPackage) {
    setForm((current) => {
      const attendees = current.attendees.slice(0, pkg.attendeeCount);
      return { ...current, packageId: pkg.id, attendees: attendees.length ? attendees : [emptyAttendee()] };
    });
  }

  function updateAttendee(index: number, key: keyof AttendeeForm, value: string) {
    setForm((current) => {
      const attendees = current.attendees.map((a, i) => (i === index ? { ...a, [key]: value } : a));
      return { ...current, attendees };
    });
  }

  function addAttendee() {
    setForm((current) =>
      current.attendees.length >= maxSeats
        ? current
        : { ...current, attendees: [...current.attendees, emptyAttendee()] },
    );
  }

  function removeAttendee(index: number) {
    setForm((current) =>
      current.attendees.length <= 1
        ? current
        : { ...current, attendees: current.attendees.filter((_, i) => i !== index) },
    );
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function submitBooking() {
    if (status === 'loading') return; // guard against double-click before disabled state renders
    setStatus('loading');
    setMessage('');

    const contactEmail = form.contactEmail.trim();
    if (!contactEmail || !isValidEmail(contactEmail)) {
      setStatus('error');
      setMessage('A valid contact email is required.');
      return;
    }
    for (const attendee of form.attendees) {
      if (!attendee.fullName.trim()) {
        setStatus('error');
        setMessage('Every attendee needs a name.');
        return;
      }
      if (!attendee.yearsExperience) {
        setStatus('error');
        setMessage('Select years of experience for every attendee.');
        return;
      }
      if (!attendee.goals.trim()) {
        setStatus('error');
        setMessage('Tell us what each attendee wants to achieve.');
        return;
      }
    }

    try {
      const attributionParams = new URLSearchParams(window.location.search);
      const response = await fetch('/api/events/ccw-roadshow/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventSlug: form.eventSlug,
          packageId: form.packageId,
          campaignId: attributionParams.get('campaign') ?? undefined,
          sourceId: attributionParams.get('source') ?? undefined,
          ccwCustomerStatus: form.ccwCustomerStatus,
          companyName: form.companyName.trim(),
          contactEmail,
          contactPhone: form.contactPhone.trim(),
          turnstileToken,
          attendees: form.attendees.map((a) => ({
            fullName: a.fullName.trim(),
            yearsExperience: a.yearsExperience,
            goals: a.goals.trim(),
          })),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        booking_url?: string;
        detail?: string;
        error?: string;
      };
      if (!response.ok || !payload.booking_url) {
        throw new Error(payload.detail || payload.error || 'Could not reserve your free entry.');
      }
      window.location.href = payload.booking_url;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not reserve your free entry.');
    }
  }

  return (
    <div className={`p-5 sm:p-6 ${marketingStatCard}`}>
      <div className="mb-5">
        <p className={marketingEyebrowPill}>{isFull ? 'Waitlist open' : 'Limited places'}</p>
        <h2 className={`mt-4 text-xl font-bold tracking-tight ${marketingTextStrong}`}>
          {isFull ? 'Join the waitlist' : 'Claim your free entry token'}
        </h2>
        <p className={`mt-2 ${marketingBodySm}`}>
          {selectedEvent.city} - {selectedEvent.dates}. {ccwRoadshowFreeEntryOffer.detail}
        </p>
        {availability && (
          <p className={`mt-2 ${marketingBodySm}`}>
            {availability.remaining > 0
              ? `${availability.remaining} of ${availability.capacity} seats left.`
              : 'This city is full — new registrations join the waitlist.'}
          </p>
        )}
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
          <span className={labelClass}>Registration type</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {ccwRoadshowTicketPackages.map((pkg) => {
              const active = form.packageId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => selectPackage(pkg)}
                  className={`min-h-[5.5rem] rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-[#2490ed]/50 bg-[#2490ed]/12 shadow-[0_8px_24px_-12px_rgba(36,144,237,0.35)]'
                      : `${marketingPanel} hover:border-white/20`
                  }`}
                >
                  <span className={`block text-sm font-semibold ${marketingTextStrong}`}>{pkg.label}</span>
                  <span className={`mt-1 block text-lg font-bold ${marketingTextStrong}`}>Free</span>
                  <span className={`mt-1 block ${marketingBodySm}`}>
                    Up to {pkg.attendeeCount} {pkg.attendeeCount === 1 ? 'person' : 'people'}
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
              updateField('ccwCustomerStatus', event.target.value as BookingFormState['ccwCustomerStatus'])
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
            <span className={labelClass}>Business</span>
            <input
              value={form.companyName}
              onChange={(event) => updateField('companyName', event.target.value)}
              autoComplete="organization"
              className={marketingInput}
              placeholder="Business name"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Contact email</span>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => updateField('contactEmail', event.target.value)}
              autoComplete="email"
              inputMode="email"
              required
              className={marketingInput}
              placeholder="name@example.com"
            />
          </label>
        </div>

        <label className="block">
          <span className={labelClass}>Contact phone</span>
          <input
            type="tel"
            value={form.contactPhone}
            onChange={(event) => updateField('contactPhone', event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            className={marketingInput}
            placeholder="Mobile number"
          />
        </label>

        <div className="space-y-3">
          <span className={labelClass}>Attendees</span>
          {form.attendees.map((attendee, index) => (
            <div key={index} className={`rounded-xl border p-3 ${marketingPanel}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm font-semibold text-slate-700 dark:text-white/80`}>Attendee {index + 1}</span>
                {form.attendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAttendee(index)}
                    className="text-slate-400 hover:text-slate-700 dark:text-white/50 dark:hover:text-white"
                    aria-label={`Remove attendee ${index + 1}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={attendee.fullName}
                  onChange={(e) => updateAttendee(index, 'fullName', e.target.value)}
                  className={marketingInput}
                  placeholder="Full name"
                  required
                />
                <select
                  value={attendee.yearsExperience}
                  onChange={(e) => updateAttendee(index, 'yearsExperience', e.target.value)}
                  className={marketingInput}
                  required
                >
                  <option value="">Years experience…</option>
                  {ccwRoadshowExperienceBands.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={attendee.goals}
                onChange={(e) => updateAttendee(index, 'goals', e.target.value)}
                className={`mt-3 min-h-[4.5rem] ${marketingInput}`}
                placeholder="What do they want to achieve from the 2 days?"
                required
              />
            </div>
          ))}

          {form.attendees.length < maxSeats && (
            <button
              type="button"
              onClick={addAttendee}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2 text-sm text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-white/20 dark:text-white/70 dark:hover:border-white/40 dark:hover:text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add attendee ({form.attendees.length}/{maxSeats})
            </button>
          )}
        </div>

        {message && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {message}
          </p>
        )}

        <TurnstileWidget onVerify={setTurnstileToken} />

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
          {isFull ? 'Join waitlist' : 'Claim free entry token'}
        </button>
      </div>
    </div>
  );
}
