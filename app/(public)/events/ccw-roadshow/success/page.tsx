import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock } from 'lucide-react';

import { getCheckoutSession } from '@/lib/api/stripe';
import { processCcwRoadshowBookingConfirmation } from '@/lib/server/ccw-roadshow-booking-email';
import { ccwRoadshowPath, ccwRoadshowTitle } from '@/lib/marketing/ccw-roadshow';
import { getRoadshowSuccessView } from '@/lib/marketing/ccw-roadshow-success';

export const metadata: Metadata = {
  title: 'Roadshow Free Entry Confirmed | CARSI',
  description: 'Free entry token confirmation page for CARSI x CCW Business Growth Days.',
  robots: { index: false, follow: false },
};

type StripeBookingSummary = {
  city?: string;
  dates?: string;
  ticketPackage?: string;
  attendeeCount?: string;
  attendeeName?: string;
  email?: string | null;
};

async function getBookingSummary(sessionId: string | undefined): Promise<StripeBookingSummary | null> {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY?.trim()) return null;

  try {
    const session = await getCheckoutSession(sessionId);
    return {
      city: session.metadata?.event_city,
      dates: session.metadata?.event_dates,
      ticketPackage: session.metadata?.ticket_package,
      attendeeCount: session.metadata?.attendee_count,
      attendeeName: session.metadata?.attendee_name,
      email: session.customer_details?.email ?? session.customer_email ?? null,
    };
  } catch {
    return null;
  }
}

async function sendBookingConfirmationIfNeeded(sessionId: string | undefined) {
  if (!sessionId || !process.env.STRIPE_SECRET_KEY?.trim()) {
    return;
  }

  try {
    const session = await getCheckoutSession(sessionId);
    await processCcwRoadshowBookingConfirmation(session);
  } catch {
    // Errors logged in sendCcwRoadshowBookingConfirmationEmail
  }
}

export default async function CcwRoadshowSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string;
    token?: string;
    city?: string;
    dates?: string;
    seats?: string;
    status?: string;
  }>;
}) {
  const {
    session_id: sessionId,
    token: freeEntryToken,
    city: freeCity,
    dates: freeDates,
    seats: freeSeats,
    status: registrationStatus,
  } = await searchParams;
  await sendBookingConfirmationIfNeeded(sessionId);
  const booking = await getBookingSummary(sessionId);
  const hasFreeEntry = Boolean(freeEntryToken);
  const view = getRoadshowSuccessView({
    status: registrationStatus,
    hasToken: hasFreeEntry,
    eventTitle: ccwRoadshowTitle,
  });
  const isWaitlisted = view.variant === 'waitlisted';

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-[rgba(52,211,153,0.25)] bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          {isWaitlisted ? (
            <Clock className="h-12 w-12 text-[#fbbf24]" aria-hidden />
          ) : (
            <CheckCircle2 className="h-12 w-12 text-[#34d399]" aria-hidden />
          )}
          <p
            className={`mt-5 text-xs font-semibold tracking-[0.18em] uppercase ${
              isWaitlisted ? 'text-[#fbbf24]' : 'text-[#34d399]'
            }`}
          >
            {view.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{view.heading}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/58">{view.body}</p>

          {view.showTokenBlock && (
            <div
              className={`mt-6 rounded-xl border p-5 ${
                view.tokenIsValidForEntry
                  ? 'border-[#34d399]/35 bg-[#34d399]/10'
                  : 'border-[#fbbf24]/35 bg-[#fbbf24]/10'
              }`}
            >
              <p
                className={`text-xs font-semibold tracking-[0.18em] uppercase ${
                  view.tokenIsValidForEntry ? 'text-[#34d399]' : 'text-[#fbbf24]'
                }`}
              >
                {view.tokenLabel}
              </p>
              <p className="mt-3 break-all font-mono text-2xl font-semibold tracking-wide text-white">
                {freeEntryToken}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/58">
                {view.tokenIsValidForEntry
                  ? `This token covers ${freeSeats ?? '1'} ${freeSeats === '1' ? 'seat' : 'seats'}${freeCity ? ` for ${freeCity}` : ''}${freeDates ? `, ${freeDates}` : ''}.`
                  : `We'll email you if a seat opens up${freeCity ? ` for ${freeCity}` : ''}${freeDates ? `, ${freeDates}` : ''}. Please don't rely on this reference for entry until we confirm.`}
              </p>
            </div>
          )}

          {booking && (
            <div className="mt-6 grid gap-3 rounded-lg border border-white/10 bg-[#050505] p-4 text-sm">
              {booking.attendeeName && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Name</span>
                  <span className="text-right font-medium text-white">{booking.attendeeName}</span>
                </div>
              )}
              {booking.city && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Event</span>
                  <span className="text-right font-medium text-white">
                    {booking.city}
                    {booking.dates ? `, ${booking.dates}` : ''}
                  </span>
                </div>
              )}
              {booking.attendeeCount && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Seats</span>
                  <span className="text-right font-medium text-white">{booking.attendeeCount}</span>
                </div>
              )}
              {booking.email && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/45">Email</span>
                  <span className="text-right font-medium text-white">{booking.email}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={ccwRoadshowPath}
              className="rounded-lg bg-[#2490ed] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Back to event page
            </Link>
            <Link
              href="/courses?discipline=CCT"
              className="rounded-lg border border-white/12 px-5 py-3 text-sm font-semibold text-white/65 transition-colors hover:text-white"
            >
              Explore CARSI CCT courses
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
