import Image from 'next/image';
import Link from 'next/link';

/**
 * The yearly membership page below the plan card: what the library holds, how membership works,
 * and a closing call back to the plan. Same hexagon language as the hero floor; server-rendered,
 * no client JavaScript. Topic cards link to real catalogue tabs (`/courses?discipline=<tab>`); each
 * line names only subjects the live tab lists (checked against carsi.com.au/api/lms/courses, 18/10/2026).
 * A card shows a photo only when one of the hero's inspected, text-free crops shows that topic's work
 * (INSPECTED_IMAGES in hex-geometry.ts); every other card shows the hexagon pattern instead.
 */

export const MEMBERSHIP_TOPICS = [
  {
    tab: 'Water Damage',
    title: 'Water damage',
    line: 'Extraction, drying, moisture mapping and water-loss projects.',
    image: '/images/hero-tiles/water-moisture-check.webp',
  },
  {
    tab: 'Mould',
    title: 'Mould',
    line: 'Mould remediation, indoor air quality and infection control.',
    image: null,
  },
  {
    tab: 'Fire & Smoke',
    title: 'Fire and smoke',
    line: 'Fire and smoke restoration, soot and odour control.',
    image: '/images/hero-tiles/soot-ceiling-cleaning.webp',
  },
  {
    tab: 'HVAC',
    title: 'HVAC',
    line: 'HVAC systems, indoor air and refrigerant dehumidifiers.',
    image: null,
  },
  {
    tab: 'Cleaning',
    title: 'Cleaning',
    line: 'Carpet, tile, glass and duct cleaning, and truck-mount operations.',
    image: '/images/hero-tiles/carpet-extraction.webp',
  },
  {
    tab: 'Free',
    title: 'Free to start',
    line: 'Try a free CARSI course before you join.',
    image: null,
  },
] as const;

export const MEMBERSHIP_STEPS = [
  {
    title: 'Join once',
    body: (price: number) =>
      `$${price} AUD a year, GST included. One learner, 12 months, every published course.`,
  },
  {
    title: 'Learn at your own pace',
    body: () =>
      'Work through any published CARSI course at your own pace, and pick up where you left off.',
  },
  {
    title: 'Keep your proof',
    body: () =>
      'A PDF certificate for every course you complete, plus a public verification link you can share.',
  },
] as const;

const HEX = '[clip-path:polygon(25%_5%,75%_5%,100%_50%,75%_95%,25%_95%,0%_50%)]';

export function MembershipLibrary() {
  return (
    <section
      aria-labelledby="membership-library-title"
      className="bg-[#f6f8fb] px-4 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <h2
          id="membership-library-title"
          className="text-center text-3xl font-bold tracking-tight text-slate-950"
        >
          Inside the membership
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Every topic in the CARSI library is included. Pick one to see its courses.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERSHIP_TOPICS.map((t) => (
            <li key={t.tab}>
              <Link
                href={`/courses?discipline=${encodeURIComponent(t.tab)}`}
                data-membership-topic={t.tab}
                className="group flex h-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition focus-visible:ring-2 focus-visible:ring-[#146fc2] focus-visible:outline-none motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg"
              >
                <span className={`relative block h-20 w-24 shrink-0 bg-[#0e2a4d] ${HEX}`}>
                  {t.image ? (
                    <Image
                      src={t.image}
                      alt=""
                      fill
                      sizes="96px"
                      className="object-cover opacity-90 transition group-hover:opacity-100"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      data-topic-pattern
                      className="absolute inset-0 [background-image:radial-gradient(circle_at_center,#5ea6f0_1.5px,transparent_1.5px)] [background-size:12px_12px] opacity-60"
                    />
                  )}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{t.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t.line}</p>
                  <p className="mt-2 text-sm font-semibold text-[#146fc2]">
                    See courses <span aria-hidden="true">→</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MembershipSteps({ price }: { price: number }) {
  return (
    <section aria-labelledby="membership-steps-title" className="bg-white px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2
          id="membership-steps-title"
          className="text-center text-3xl font-bold tracking-tight text-slate-950"
        >
          How it works
        </h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {MEMBERSHIP_STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center text-center">
              <span
                aria-hidden="true"
                className={`flex h-14 w-16 items-center justify-center bg-[#146fc2] text-lg font-bold text-white ${HEX}`}
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{s.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-slate-600">{s.body(price)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function MembershipClosingCta() {
  return (
    <section
      aria-labelledby="membership-close-title"
      className="relative isolate overflow-hidden bg-[#06101d] px-4 py-16 text-center text-white sm:py-20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 [background-image:radial-gradient(circle_at_center,#2a85ec_1.5px,transparent_1.5px)] [background-size:22px_22px] opacity-20"
      />
      <h2 id="membership-close-title" className="text-3xl font-bold tracking-tight">
        One year. The whole library.
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-slate-300">
        Join once and every published CARSI course is yours for 12 months.
      </p>
      <a
        href="#membership-plan"
        className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#146fc2] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f5fa8] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06101d] focus-visible:outline-none"
      >
        Back to the membership
      </a>
    </section>
  );
}
