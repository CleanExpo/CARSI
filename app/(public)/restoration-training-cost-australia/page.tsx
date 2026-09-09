import type { Metadata } from 'next';
import Link from 'next/link';

import { BreadcrumbSchema, FAQSchema } from '@/components/seo';
import { INDIVIDUAL_TIERS } from '@/lib/lms/pricing-tiers';
import { OG_IMAGES } from '@/lib/seo/og-image';

/**
 * AU price-anchoring page (BACKLOG row 14).
 *
 * Two rules govern every number and claim on this page.
 *
 * 1. EVERY external price is verified at its source and carries the date it was
 *    checked. The one comparison figure below was read off the provider's own
 *    booking page on 2026-09-08. A price we cannot open and read does not appear
 *    here at all — a wrong competitor price is a credibility and legal risk, and
 *    credibility is the entire asset this page trades on.
 *
 * 2. The comparison is CEC MAINTENANCE vs CERTIFICATION, never "cheaper than
 *    IICRC certification". CARSI is an IICRC CEC provider; it does not deliver
 *    IICRC certification, and copy implying otherwise is a licence-critical
 *    defect (CLAUDE.md, IICRC CEC terminology). Certification is a one-off bought
 *    from an IICRC-approved school. CECs are the RECURRING cost of keeping it.
 *    Those are different purchases, and saying so is both compliant and truer.
 *
 * CARSI's own price comes from INDIVIDUAL_TIERS rather than a literal, so it
 * cannot drift away from /pricing. Per-course is the only tier quoted because it
 * is the only tier without `comingSoon: true` — pointing a buyer at a tier whose
 * checkout cannot be delivered is the fastest way to lose them.
 */

const CHECKED_ON = '8 September 2026';

// Read from https://deconsystems.arlo.co/w/courses/13-iicrc-water-damage-restoration-technician-wrt-online/331
// on 2026-09-08. Quoted verbatim as "$695.00 incl. GST", 3 days delivered over 5
// online webinar sessions, with a separate $70 exam fee payable to the IICRC.
const COMPARISON = {
  provider: 'Decon Systems',
  course: 'IICRC Water Damage Restoration Technician (WRT), online',
  courseFee: 695,
  examFee: 70,
  format: '3 days, delivered over 5 online webinar sessions',
  source:
    'https://deconsystems.arlo.co/w/courses/13-iicrc-water-damage-restoration-technician-wrt-online/331',
} as const;

const COMPARISON_TOTAL = COMPARISON.courseFee + COMPARISON.examFee;

const perCourse = INDIVIDUAL_TIERS.find((tier) => tier.id === 'per_course');
const PER_COURSE_LABEL = perCourse?.priceLabel ?? 'From $20';

const FAQ_ITEMS = [
  {
    question: 'Does a CARSI course make me IICRC certified?',
    answer:
      'No, and any provider telling you otherwise is misleading you. IICRC certification is earned through an IICRC-approved school and its examination. CARSI is accredited as an IICRC CEC provider, which is a different standing: CARSI courses carry CARSI Southern Hemisphere Restoration Designations in their own right, and where an individual course has been approved by the IICRC, the credits it carries are shown on that course and tracked in your dashboard.',
  },
  {
    question: 'So what am I actually comparing?',
    answer:
      'Two different purchases. A certification course is a one-off you buy once per discipline from an IICRC-approved school. CECs are the recurring cost of keeping that certification current, year after year. This page is about the recurring half, because that is the one that repeats for the life of your career.',
  },
  {
    question: 'Why is a CARSI course priced differently from a certification course?',
    answer:
      'Chiefly because they are not the same purchase, and the prices are not substitutes for one another. A certification course buys an IICRC certification, once, through an IICRC-approved school and its examination. A CARSI course buys a CARSI Southern Hemisphere Restoration Designation and, where that particular course has been approved by the IICRC, credits toward keeping a certification you already hold. Delivery costs differ on top of that: a classroom course carries a venue, an instructor for three days and your travel, and takes you off the tools while it runs. Treat them as two separate line items in a training budget rather than as alternatives to each other.',
  },
  {
    question: 'What does a CARSI course cost?',
    answer: `Courses are bought individually, ${PER_COURSE_LABEL.toLowerCase()}. You pay once for the course, your completion is recorded, and any IICRC CECs the course carries are tracked in your dashboard.`,
  },
  {
    question: 'Is the comparison price on this page current?',
    answer: `It was read directly off the provider's own booking page on ${CHECKED_ON} and is quoted with the source linked so you can check it yourself. Prices move; if you are reading this well after that date, open the link and confirm.`,
  },
];

export const metadata: Metadata = {
  title: 'What restoration training actually costs in Australia',
  description:
    'What restoration training costs in Australia: one published Australian certification-course fee, checked at source, and what per-course CARSI enrolment costs. Two different purchases — certification is bought once, continuing education recurs.',
  keywords: [
    'restoration training cost Australia',
    'IICRC CEC cost Australia',
    'water damage training price Australia',
    'restoration course fees AUD',
    'continuing education credits restoration',
  ],
  openGraph: {
    images: OG_IMAGES,
    title: 'What restoration training actually costs in Australia | CARSI',
    description:
      'One published Australian certification-course fee, checked at source, and what a CARSI course costs. Different purchases, not substitutes: certification is bought once, continuing education recurs.',
    type: 'website',
    url: 'https://carsi.com.au/restoration-training-cost-australia',
  },
  alternates: {
    canonical: 'https://carsi.com.au/restoration-training-cost-australia',
  },
};

export default function RestorationTrainingCostPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://carsi.com.au' },
          { name: 'Pricing', url: 'https://carsi.com.au/pricing' },
          {
            name: 'What restoration training costs in Australia',
            url: 'https://carsi.com.au/restoration-training-cost-australia',
          },
        ]}
      />
      <FAQSchema questions={FAQ_ITEMS} />

      <main className="mx-auto max-w-3xl px-4 py-14">
        <header>
          <p className="text-sm font-semibold tracking-wide text-[#7a3500] uppercase">
            Australian pricing, in Australian dollars
          </p>
          <h1 className="mt-3 text-4xl leading-tight font-bold text-slate-900">
            What restoration training actually costs in Australia
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">
            Training gets sold with the price at the bottom of the page, so here it is at the top.
            Below is one published Australian course fee, read off the provider&rsquo;s own booking
            page, set beside what a CARSI course costs. Every figure is dated and linked, so you can
            check it rather than take our word for it.
          </p>
        </header>

        <section
          aria-labelledby="different-purchases"
          className="mt-12 rounded-lg border border-[#f2cf8f] bg-[#fff8ed] px-5 py-5"
        >
          <h2 id="different-purchases" className="text-lg font-semibold text-[#7a3500]">
            First, the thing most comparisons get wrong
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#7a3500]">
            A certification course and a continuing education course are not competing products. You
            buy an IICRC certification once per discipline, from an IICRC-approved school and its
            examination. Keeping that certification current is a separate, recurring cost for the
            rest of your career. CARSI is an accredited IICRC CEC provider and sits on the recurring
            side. CARSI does not deliver IICRC certification, and no CARSI course will make you
            IICRC certified.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#7a3500]">
            So the honest question is not &ldquo;which is cheaper&rdquo;. It is: once you hold a
            certification, what does it cost you every year to keep it?
          </p>
        </section>

        <section aria-labelledby="the-numbers" className="mt-12">
          <h2 id="the-numbers" className="text-2xl font-bold text-slate-900">
            The numbers
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
            Read these as two separate line items, not as two prices for the same thing. The first
            is a one-off certification bought from an IICRC-approved school. The second is
            continuing education, which recurs for as long as you hold the certification.
          </p>

          <div className="mt-6 space-y-4 md:hidden">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                One-off · certification
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">{COMPARISON.course}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {COMPARISON.provider} · {COMPARISON.format}
              </p>
              <p className="mt-3 text-slate-800">
                <strong>${COMPARISON.courseFee} incl GST</strong>
                <span className="mt-1 block text-sm text-slate-600">
                  plus a ${COMPARISON.examFee} exam fee paid to the IICRC
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-800">
                  ${COMPARISON_TOTAL} in total
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-700">
                One IICRC certification, bought once. Three days of your week.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Recurring · continuing education
              </p>
              <h3 className="mt-2 text-base font-semibold text-slate-900">A CARSI course</h3>
              <p className="mt-1 text-sm text-slate-600">Online, taken in your own time</p>
              <p className="mt-3 text-slate-800">
                <strong>{PER_COURSE_LABEL}</strong>
                <span className="mt-1 block text-sm text-slate-600">
                  bought one course at a time
                </span>
              </p>
              <p className="mt-3 text-sm text-slate-700">
                A CARSI Southern Hemisphere Restoration Designation, and any IICRC CECs that course
                carries tracked in your dashboard. No days off the tools.
              </p>
            </article>
          </div>

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-[15px]">
              <caption className="sr-only">
                What each purchase costs. These are two different purchases, not two prices for the
                same thing. A certification is bought once per discipline, from an IICRC-approved
                school and its examination. Continuing education recurs for as long as the
                certification is held.
              </caption>
              <thead>
                <tr className="border-b border-slate-300">
                  <th scope="col" className="py-3 pr-4 font-semibold text-slate-900">
                    What you are buying
                  </th>
                  <th scope="col" className="py-3 pr-4 font-semibold text-slate-900">
                    Published price
                  </th>
                  <th scope="col" className="py-3 font-semibold text-slate-900">
                    What it gets you
                  </th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-slate-200">
                  <th scope="row" className="py-4 pr-4 font-medium text-slate-900">
                    <span className="mb-1 block text-xs font-bold tracking-wide text-slate-500 uppercase">
                      One-off &middot; certification
                    </span>
                    {COMPARISON.course}
                    <span className="mt-1 block text-sm font-normal text-slate-600">
                      {COMPARISON.provider} &middot; {COMPARISON.format}
                    </span>
                  </th>
                  <td className="py-4 pr-4 text-slate-800">
                    <strong>${COMPARISON.courseFee} incl GST</strong>
                    <span className="mt-1 block text-sm text-slate-600">
                      plus a ${COMPARISON.examFee} exam fee paid to the IICRC
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-slate-800">
                      ${COMPARISON_TOTAL} in total
                    </span>
                  </td>
                  <td className="py-4 text-slate-700">
                    One IICRC certification, bought once. Three days of your week.
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="py-4 pr-4 font-medium text-slate-900">
                    <span className="mb-1 block text-xs font-bold tracking-wide text-slate-500 uppercase">
                      Recurring &middot; continuing education
                    </span>
                    A CARSI course
                    <span className="mt-1 block text-sm font-normal text-slate-600">
                      Online, taken in your own time
                    </span>
                  </th>
                  <td className="py-4 pr-4 text-slate-800">
                    <strong>{PER_COURSE_LABEL}</strong>
                    <span className="mt-1 block text-sm text-slate-600">
                      bought one course at a time
                    </span>
                  </td>
                  <td className="py-4 text-slate-700">
                    A CARSI Southern Hemisphere Restoration Designation, and any IICRC CECs that
                    course carries tracked in your dashboard. No days off the tools.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            Comparison price read from{' '}
            <a
              className="underline decoration-slate-400 underline-offset-2 hover:text-slate-900"
              href={COMPARISON.source}
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              the provider&rsquo;s published booking page
            </a>{' '}
            on {CHECKED_ON}. It is one Australian provider and one course, quoted so you can verify
            it — not a survey of the market, and not the only option worth looking at.
          </p>
        </section>

        <section aria-labelledby="hidden-cost" className="mt-12">
          <h2 id="hidden-cost" className="text-2xl font-bold text-slate-900">
            The cost that never appears on the invoice
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
            A three-day course costs you the fee plus three days you were not earning. We are not
            going to invent a day rate for you, because yours is the only one that matters. Take
            what your crew bills in a day, multiply by three, and add it to the course fee. For most
            restoration businesses that second number is the larger of the two.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
            That is the whole argument for online CECs. Not that classroom training is bad —
            hands-on certification training is worth doing properly and in person. It is that your{' '}
            <em>recurring</em> credit-keeping should not keep costing you days on site.
          </p>
        </section>

        <section aria-labelledby="next" className="mt-12 border-t border-slate-200 pt-8">
          <h2 id="next" className="text-2xl font-bold text-slate-900">
            Have a look at what a course costs
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700">
            Every course lists its own price and the CECs it carries, where it carries any.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#7a3500] px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-[#5e2900] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a3500]"
              href="/courses"
            >
              Browse courses
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-[15px] font-semibold text-slate-800 transition hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600"
              href="/pricing"
            >
              See all pricing
            </Link>
          </div>
        </section>

        <section aria-labelledby="faq" className="mt-14">
          <h2 id="faq" className="text-2xl font-bold text-slate-900">
            Questions people actually ask
          </h2>
          <dl className="mt-6 space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question}>
                <dt className="text-[15px] font-semibold text-slate-900">{item.question}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-slate-700">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}
