import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, CheckCircle2, Clock, Download } from 'lucide-react';

import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import {
  marketingBtnPrimary,
  marketingBtnSecondary,
  marketingPanel,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
} from '@/lib/marketing/marketing-ui';

import { getCheckoutSession } from '@/lib/api/stripe';
import { processCcwRoadshowBookingConfirmation } from '@/lib/server/ccw-roadshow-booking-email';
import { ccwRoadshowPath, ccwRoadshowTitle, getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import {
  buildGoogleCalendarLink,
  buildIcsDataUri,
} from '@/lib/marketing/ccw-roadshow-calendar-links';
import { getRoadshowSuccessView } from '@/lib/marketing/ccw-roadshow-success';

export const metadata: Metadata = {
  title: 'Roadshow Free Entry Confirmed',
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
    event?: string;
    city?: string;
    dates?: string;
    seats?: string;
    status?: string;
  }>;
}) {
  const {
    session_id: sessionId,
    token: freeEntryToken,
    event: eventSlug,
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
  const calendarEvent = getCcwRoadshowEvent(eventSlug);
  const showAddToCalendar = !isWaitlisted && Boolean(calendarEvent);

  return (
    <MarketingPageShell className="flex items-center py-16 sm:py-20">
      <div className="mx-auto w-full max-w-2xl">
        <div className={`p-6 sm:p-8 ${marketingPanel}`}>
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
          <h1 className={`mt-2 text-3xl font-semibold tracking-tight ${marketingTextStrong}`}>{view.heading}</h1>
          <p className={`mt-3 text-sm leading-relaxed ${marketingTextMuted}`}>{view.body}</p>

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
              <p className={`mt-3 break-all font-mono text-2xl font-semibold tracking-wide ${marketingTextStrong}`}>
                {freeEntryToken}
              </p>
              <p className={`mt-3 text-sm leading-relaxed ${marketingTextMuted}`}>
                {view.tokenIsValidForEntry
                  ? `This token covers ${freeSeats ?? '1'} ${freeSeats === '1' ? 'seat' : 'seats'}${freeCity ? ` for ${freeCity}` : ''}${freeDates ? `, ${freeDates}` : ''}.`
                  : `We'll email you if a seat opens up${freeCity ? ` for ${freeCity}` : ''}${freeDates ? `, ${freeDates}` : ''}. Please don't rely on this reference for entry until we confirm.`}
              </p>
            </div>
          )}

          {showAddToCalendar && calendarEvent && (
            <div className={`mt-6 rounded-xl border p-5 ${marketingPanel}`}>
              <p className={`text-xs font-semibold tracking-[0.18em] uppercase ${marketingTextSubtle}`}>
                Add it to your calendar
              </p>
              <p className={`mt-2 text-sm leading-relaxed ${marketingTextMuted}`}>
                {calendarEvent.city}, {calendarEvent.dateRangeLabel} · {calendarEvent.timeLabel}. We&apos;ll
                also email you a calendar invite — this is a quick self-serve copy.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={buildGoogleCalendarLink(calendarEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 ${marketingBtnSecondary}`}
                >
                  <CalendarPlus className="h-4 w-4" aria-hidden />
                  Add to Google Calendar
                </a>
                <a
                  href={buildIcsDataUri(calendarEvent)}
                  download={`carsi-ccw-${calendarEvent.slug}.ics`}
                  className={`inline-flex items-center gap-2 ${marketingBtnSecondary}`}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download .ics (Apple/Outlook)
                </a>
              </div>
            </div>
          )}

          {booking && (
            <div className={`mt-6 grid gap-3 rounded-lg border p-4 text-sm ${marketingPanel}`}>
              {booking.attendeeName && (
                <div className="flex justify-between gap-4">
                  <span className={marketingTextSubtle}>Name</span>
                  <span className={`text-right font-medium ${marketingTextStrong}`}>{booking.attendeeName}</span>
                </div>
              )}
              {booking.city && (
                <div className="flex justify-between gap-4">
                  <span className={marketingTextSubtle}>Event</span>
                  <span className={`text-right font-medium ${marketingTextStrong}`}>
                    {booking.city}
                    {booking.dates ? `, ${booking.dates}` : ''}
                  </span>
                </div>
              )}
              {booking.attendeeCount && (
                <div className="flex justify-between gap-4">
                  <span className={marketingTextSubtle}>Seats</span>
                  <span className={`text-right font-medium ${marketingTextStrong}`}>{booking.attendeeCount}</span>
                </div>
              )}
              {booking.email && (
                <div className="flex justify-between gap-4">
                  <span className={marketingTextSubtle}>Email</span>
                  <span className={`text-right font-medium ${marketingTextStrong}`}>{booking.email}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={ccwRoadshowPath} className={marketingBtnPrimary}>
              Back to event page
            </Link>
            <Link href="/courses?discipline=CCT" className={marketingBtnSecondary}>
              Explore CARSI CCT courses
            </Link>
          </div>
        </div>
      </div>
    </MarketingPageShell>
  );
}
