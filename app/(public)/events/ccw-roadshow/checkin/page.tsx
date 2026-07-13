import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock } from 'lucide-react';

import { CcwCheckInForm } from '@/components/marketing/CcwCheckInForm';
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell';
import {
  marketingBodySm,
  marketingBtnSecondary,
  marketingEyebrowPill,
  marketingPanel,
  marketingStatCard,
  marketingTextStrong,
} from '@/lib/marketing/marketing-ui';
import { ccwRoadshowPath, getCcwRoadshowEvent } from '@/lib/marketing/ccw-roadshow';
import { isCcwAttendanceEnabled } from '@/lib/server/ccw-attendance/flag';
import { verifyCheckInToken } from '@/lib/server/ccw-attendance/checkin-token';

export const metadata: Metadata = {
  // Door page — never indexed; it is reached only via the venue QR / link.
  title: 'Event Check-in | CARSI x CCW',
  description: 'Self-service check-in for CARSI x CCW Business Growth Days attendees.',
  robots: { index: false, follow: false },
};

// Token freshness is time-sensitive; never statically cache this page.
export const dynamic = 'force-dynamic';

function ExpiredPanel() {
  return (
    <div className={`p-6 sm:p-8 ${marketingStatCard}`}>
      <Clock className="h-12 w-12 text-[#fbbf24]" aria-hidden />
      <p className={`mt-5 ${marketingEyebrowPill}`}>Check-in code needed</p>
      <h1 className={`mt-3 text-2xl font-bold tracking-tight ${marketingTextStrong}`}>
        Scan today&apos;s QR code
      </h1>
      <p className={`mt-3 ${marketingBodySm}`}>
        This check-in link isn&apos;t valid right now — check-in codes are refreshed each event day.
        Please scan the QR code displayed at the venue, or ask an organiser for today&apos;s link.
      </p>
      <div className="mt-6">
        <Link href={ccwRoadshowPath} className={marketingBtnSecondary}>
          Back to event page
        </Link>
      </div>
    </div>
  );
}

export default async function CcwCheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; event?: string; day?: string }>;
}) {
  // Dark until an operator enables the unit.
  if (!isCcwAttendanceEnabled()) {
    notFound();
  }

  const { t: token } = await searchParams;

  // The token is authoritative for event + day — query params are cosmetic only.
  const result = await verifyCheckInToken(token);

  return (
    <MarketingPageShell className="flex items-center py-16 sm:py-20">
      <div className="mx-auto w-full max-w-xl">
        {result.ok ? (
          (() => {
            const event = getCcwRoadshowEvent(result.scope.eventSlug);
            if (!event) return <ExpiredPanel />;
            return (
              <>
                <div className={`mb-4 p-4 ${marketingPanel}`}>
                  <p className={`${marketingBodySm}`}>
                    You&apos;re checking in on your own device. We only ask for your details — no
                    other attendee information is shown here.
                  </p>
                </div>
                <CcwCheckInForm
                  token={token as string}
                  dayIndex={result.scope.dayIndex}
                  eventCity={event.city}
                  eventDates={event.dates}
                />
              </>
            );
          })()
        ) : (
          <ExpiredPanel />
        )}
      </div>
    </MarketingPageShell>
  );
}
