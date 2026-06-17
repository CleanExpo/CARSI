import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { getCheckoutSession } from '@/lib/api/stripe';
import { ccwRoadshowPath, ccwRoadshowTitle } from '@/lib/marketing/ccw-roadshow';

export const metadata: Metadata = {
  title: 'Roadshow Booking Confirmed | CARSI',
  description: 'Confirmation page for CARSI x CCW Business Growth Days bookings.',
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

export default async function CcwRoadshowSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const booking = await getBookingSummary(sessionId);

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-[rgba(52,211,153,0.25)] bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <CheckCircle2 className="h-12 w-12 text-[#34d399]" aria-hidden />
          <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#34d399] uppercase">
            Booking Confirmed
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            You are booked for {ccwRoadshowTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/58">
            Payment has been sent through Stripe. Keep an eye on the booking email for your receipt
            and event details.
          </p>

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
