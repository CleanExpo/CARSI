import Link from 'next/link';

import { LANDING_EYEBROW_CLASS } from '@/components/landing/public-shell-width';
import { HubPlaceholderCard } from '@/components/marketing/hub/HubUi';

export type CalendarEventRow = {
  id: string;
  title: string;
  event_type: string;
  industry_categories: string[];
  start_date: string;
  end_date: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  is_virtual: boolean;
  organiser_name: string | null;
  is_free: boolean;
  featured: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  conference: 'Conference',
  training: 'Training',
  'iicrc-school': 'IICRC school',
  'carsi-training': 'CARSI training day',
  webinar: 'Webinar',
  workshop: 'Workshop',
  networking: 'Networking',
};

function isSameCalendarDay(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function dateStamp(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-AU', { day: '2-digit' }),
    weekday: d.toLocaleDateString('en-AU', { weekday: 'short' }),
    month: d.toLocaleDateString('en-AU', { month: 'short' }),
  };
}

function formatRange(start: string, end: string | null): string {
  const startDt = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (!end) return startDt.toLocaleDateString('en-AU', opts);
  const endDt = new Date(end);
  if (startDt.toDateString() === endDt.toDateString()) {
    return startDt.toLocaleDateString('en-AU', opts);
  }
  return `${startDt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} – ${endDt.toLocaleDateString('en-AU', opts)}`;
}

function locationOf(event: CalendarEventRow): string {
  if (event.is_virtual) return 'Online';
  return (
    [event.location_name, event.location_city, event.location_state].filter(Boolean).join(', ') ||
    'Australia'
  );
}

export function CalendarMonthJump({
  months,
}: {
  months: { key: string; label: string; count: number }[];
}) {
  if (months.length === 0) return null;
  return (
    <nav aria-label="Jump to month" className="flex flex-wrap gap-2">
      {months.map((month) => (
        <a
          key={month.key}
          href={`#month-${month.key}`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:border-[#2490ed]/40 hover:text-[#146fc2]"
        >
          {month.label}
          <span className="font-mono text-[10px] text-slate-400">
            {String(month.count).padStart(2, '0')}
          </span>
        </a>
      ))}
    </nav>
  );
}

export function CalendarEventLedger({
  grouped,
  placeholderCount,
}: {
  grouped: [string, CalendarEventRow[]][];
  placeholderCount: number;
}) {
  if (grouped.length === 0 && placeholderCount === 0) return null;

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute top-3 bottom-3 left-[1.65rem] hidden w-px bg-slate-200/90 sm:block"
        aria-hidden
      />
      <div className="space-y-14">
        {grouped.map(([monthKey, monthEvents]) => (
          <section key={monthKey} id={`month-${monthKey}`} className="scroll-mt-28">
            <p className={`${LANDING_EYEBROW_CLASS} mb-6`}>
              {new Date(monthEvents[0].start_date).toLocaleDateString('en-AU', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <ol className="space-y-4">
              {monthEvents.map((event) => {
                const stamp = dateStamp(event.start_date);
                const today = isSameCalendarDay(event.start_date);
                return (
                  <li key={event.id}>
                    <Link
                      href={`/calendar/${event.id}`}
                      className="group relative grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-[#2490ed]/35 hover:shadow-[0_18px_40px_-24px_rgba(20,111,194,0.35)] sm:grid-cols-[5.5rem_1fr] sm:gap-8 sm:p-6"
                    >
                      <div className="relative z-10 flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-[#fafbfc] sm:mx-auto">
                        <span className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                          {stamp.weekday}
                        </span>
                        <span className="font-[family-name:var(--font-display)] text-[1.7rem] leading-none font-semibold text-slate-950 tabular-nums">
                          {stamp.day}
                        </span>
                        <span className="mt-0.5 text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
                          {stamp.month}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
                            {TYPE_LABEL[event.event_type] ?? event.event_type.replace(/-/g, ' ')}
                          </span>
                          {today ? (
                            <span className="rounded-full bg-[#146fc2] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                              Today
                            </span>
                          ) : null}
                          {event.is_free ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                              Free
                            </span>
                          ) : null}
                          {event.featured ? (
                            <span className="rounded-full bg-[#fff8ed] px-2.5 py-0.5 text-[11px] font-medium text-[#7a3500]">
                              Featured
                            </span>
                          ) : null}
                        </div>
                        <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.01em] text-slate-950 group-hover:text-[#146fc2]">
                          {event.title}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {formatRange(event.start_date, event.end_date)}
                          <span className="mx-2 text-slate-300" aria-hidden>
                            ·
                          </span>
                          {locationOf(event)}
                        </p>
                        {event.organiser_name ? (
                          <p className="mt-1 text-xs text-slate-400">By {event.organiser_name}</p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}

        {placeholderCount > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: placeholderCount }, (_, i) => (
              <HubPlaceholderCard
                key={`placeholder-${i}`}
                message={`Event slot ${i + 1} — calendar populating`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
