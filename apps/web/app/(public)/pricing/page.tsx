import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo';
import { BundlePricingCard } from '@/components/lms/BundlePricingCard';

export const metadata: Metadata = {
  title: 'Pricing | CARSI — Restoration Training Online',
  description:
    'CARSI Pro subscription $795/yr AUD — unlimited access to 30+ restoration courses, IICRC CEC tracking, XP leaderboards, and PDF certificates. Start with a 7-day free trial.',
  keywords: [
    'CARSI pricing',
    'restoration training cost',
    'IICRC CEC courses online',
    'building restoration courses Australia',
    'water damage training subscription',
    'mould remediation online course',
  ],
  openGraph: {
    title: 'Pricing | CARSI — Restoration Training Online',
    description:
      'One subscription. Every restoration discipline. $795 AUD/year with a 7-day free trial.',
    type: 'website',
    url: 'https://carsi.com.au/pricing',
  },
  alternates: { canonical: 'https://carsi.com.au/pricing' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface BundleCourse {
  id: string;
  title: string;
  slug: string;
  iicrc_discipline?: string | null;
}

interface Bundle {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price_aud: number | string;
  original_price_aud?: number | string | null;
  savings_aud?: number | string | null;
  industry_tag?: string | null;
  course_count: number;
  courses: BundleCourse[];
}

async function getBundles(): Promise<Bundle[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/lms/bundles`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const SUBSCRIPTION_FEATURES = [
  'Unlimited access to 30+ IICRC-approved courses',
  'IICRC CEC tracking dashboard by discipline',
  'XP points, streaks, and monthly leaderboard',
  'PDF certificates stored to your credential wallet',
  'Professional Identity Hub (shareable public profile)',
  'NRPG membership prerequisite fulfilled',
  'All new courses included as they launch',
];

const FAQ_ITEMS = [
  {
    question: 'How does the 7-day free trial work?',
    answer:
      'Your trial begins the moment you sign up. You have full access to every course on the platform for 7 days at no cost. Your card is only charged on day 8 if you choose to continue. Cancel any time before then with no questions asked.',
  },
  {
    question: 'Can I cancel my subscription at any time?',
    answer:
      'Yes — cancel any time from your student dashboard. Your access continues until the end of the current billing period. There are no lock-in contracts and no cancellation fees.',
  },
  {
    question: 'Do CARSI courses count toward IICRC CECs?',
    answer:
      "CARSI's existing catalogue of approximately 40 courses carries IICRC CEC approval. Your subscription includes a CEC tracking dashboard that logs every credit you earn, broken down by discipline (WRT, CRT, OCT, ASD, CCT and more). New courses are submitted to the IICRC board for approval before CECs are displayed.",
  },
  {
    question: "I'm already enrolled in a course — do I need to subscribe?",
    answer:
      'Individual course enrolments are unaffected. The Pro subscription unlocks unlimited access to every course on the platform — including all future releases — for a single annual fee of $795 AUD.',
  },
];

const breadcrumbs = [
  { name: 'Home', url: 'https://carsi.com.au' },
  { name: 'Pricing', url: 'https://carsi.com.au/pricing' },
];

export default async function PricingPage() {
  const bundles = await getBundles();

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <FAQSchema questions={FAQ_ITEMS} />

      <main className="min-h-screen bg-[#050505] px-4 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          {/* ── Hero ───────────────────────────────────────── */}
          <section className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[rgba(0,245,255,0.08)] px-4 py-1.5 text-sm font-medium text-[#00F5FF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00F5FF]" />
              CARSI Professional
            </div>
            <h1 className="mb-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Invest in Your Restoration Career
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/50">
              One subscription gives you every IICRC-approved course on the platform — plus CEC
              tracking, leaderboards, and a verified credential wallet.
            </p>
          </section>

          {/* ── Subscription Tier ──────────────────────────── */}
          <section aria-label="Pro subscription" className="mb-16">
            <div
              className="relative rounded-sm border p-8 md:p-10"
              style={{
                background:
                  'linear-gradient(135deg, rgba(0,245,255,0.06) 0%, rgba(0,245,255,0.02) 100%)',
                borderColor: 'rgba(0,245,255,0.2)',
              }}
            >
              {/* Trial badge */}
              <div className="absolute -top-3 left-8">
                <span
                  className="rounded-sm px-3 py-1 text-xs font-semibold tracking-wide uppercase"
                  style={{ background: '#00FF88', color: '#050505' }}
                >
                  7-Day Free Trial
                </span>
              </div>

              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                {/* Left — pricing */}
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wider text-white/30 uppercase">
                      Annual Subscription
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-5xl font-bold text-white">$795</span>
                      <span className="font-mono text-white/40">AUD / year</span>
                    </div>
                    <p className="mt-1 text-xs text-white/30">
                      GST included. Billed annually via Stripe.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-3">
                    <Link
                      href="/subscribe"
                      className="inline-flex items-center justify-center rounded-sm bg-[#00F5FF] px-6 py-3 text-sm font-semibold text-[#050505] transition-opacity hover:opacity-90"
                    >
                      Start Free Trial
                    </Link>
                    <Link
                      href="/courses"
                      className="inline-flex items-center justify-center rounded-sm border border-white/[0.08] px-6 py-3 text-sm font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white/90"
                    >
                      Browse Courses
                    </Link>
                  </div>

                  <p className="text-xs text-white/25">
                    Card required. No charge during trial. Cancel any time.
                  </p>
                </div>

                {/* Right — feature checklist */}
                <ul className="flex flex-col gap-3 md:min-w-[280px]">
                  {SUBSCRIPTION_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                      <span className="mt-0.5 flex-shrink-0 text-[#00FF88]">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Course Bundles ─────────────────────────────── */}
          {bundles.length > 0 && (
            <section aria-label="Course bundles" className="mb-16">
              <div className="mb-6">
                <h2 className="mb-2 text-2xl font-bold text-white">Course Bundles</h2>
                <p className="text-sm text-white/40">
                  Prefer to pay per bundle? Each bundle covers a specific discipline or industry
                  vertical.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bundles.map((bundle) => (
                  <BundlePricingCard key={bundle.id} bundle={bundle} />
                ))}
              </div>
            </section>
          )}

          {/* ── Per-Course CTA ─────────────────────────────── */}
          <section
            aria-label="Individual courses"
            className="mb-16 flex flex-col items-start justify-between gap-4 rounded-sm border border-white/[0.06] bg-white/[0.02] p-6 sm:flex-row sm:items-center"
          >
            <div>
              <h2 className="mb-1 text-base font-semibold text-white/85">Or pay per course</h2>
              <p className="text-sm text-white/40">
                Not ready to subscribe? Enrol in individual courses at your own pace.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex flex-shrink-0 items-center rounded-sm border border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.08)] px-5 py-2.5 text-sm font-semibold text-[#00F5FF] transition-colors hover:bg-[rgba(0,245,255,0.14)]"
            >
              View All Courses
            </Link>
          </section>

          {/* ── FAQ ────────────────────────────────────────── */}
          <section aria-label="Frequently asked questions" className="mb-8">
            <h2 className="mb-6 text-2xl font-bold text-white">Frequently Asked Questions</h2>
            <div className="flex flex-col divide-y divide-white/[0.06]">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white/80 hover:text-white">
                    {item.question}
                    <span
                      className="flex-shrink-0 text-white/30 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/45">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* ── Footer note ────────────────────────────────── */}
          <p className="text-center text-xs text-white/20">
            Prices in AUD. GST included. Subscription managed via Stripe — secure payment
            processing.
            <br />
            Questions?{' '}
            <Link href="/contact" className="underline hover:text-white/50">
              Contact the CARSI team
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
