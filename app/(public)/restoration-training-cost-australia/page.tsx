import type { Metadata } from 'next';

import { HomeFaqSection } from '@/components/landing/HomeFaqSection';
import { LANDING_LEAD_CLASS } from '@/components/landing/public-shell-width';
import {
  PlatformContextualNext,
  PlatformMidCtaBanner,
  PlatformPageHeroFromSurface,
  PlatformPageSection,
} from '@/components/marketing/platform/PlatformPagePattern';
import { StaticMarketingClosingCta } from '@/components/marketing/StaticMarketingClosingCta';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo';
import { PER_COURSE_PRICE_FALLBACK_LABEL, perCoursePriceLabel } from '@/lib/lms/pricing-tiers';
import { OG_IMAGES } from '@/lib/seo/og-image';
import { getPublicCatalogueFacts } from '@/lib/server/public-catalogue-facts';

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
 *    from a school approved by the IICRC. CECs are the RECURRING cost of keeping it.
 *    Those are different purchases, and saying so is both compliant and truer.
 *
 * CARSI's own price is the lowest published paid-course price, read from the
 * same catalogue source as /courses and /pricing (perCoursePriceLabel), so it
 * cannot drift away from either. Per-course is the only tier quoted because it
 * is the only tier that is always on sale — pointing a buyer at a tier whose
 * checkout cannot be delivered is the fastest way to lose them.
 */

// Same ISR window as the homepage: the build-time prerender has no catalogue, so
// the price is filled in on the first revalidation at run time.
export const revalidate = 300;

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

function buildFaqItems(perCourseLabel: string | null) {
  return [
    {
      question: 'Does a CARSI course make me IICRC certified?',
      answer:
        'No, and any provider telling you otherwise is misleading you. IICRC certification is earned through a school approved by the IICRC and its examination. CARSI is accredited as an IICRC CEC provider, which is a different standing: CARSI courses carry CARSI Southern Hemisphere Restoration Designations in their own right, and where an individual course has been approved by the IICRC, the credits it carries are shown on that course and tracked in your dashboard.',
    },
    {
      question: 'So what am I actually comparing?',
      answer:
        'Two different purchases. A certification course is a one-off you buy once per discipline from a school approved by the IICRC. CECs are the recurring cost of keeping that certification current, year after year. This page is about the recurring half, because that is the one that repeats for the life of your career.',
    },
    {
      question: 'Why is a CARSI course priced differently from a certification course?',
      answer:
        'Chiefly because they are not the same purchase, and the prices are not substitutes for one another. A certification course buys an IICRC certification, once, through a school approved by the IICRC and its examination. A CARSI course buys a CARSI Southern Hemisphere Restoration Designation and, where that particular course has been approved by the IICRC, credits toward keeping a certification you already hold. Delivery costs differ on top of that: a classroom course carries a venue, an instructor for three days and your travel, and takes you off the tools while it runs. Treat them as two separate line items in a training budget rather than as alternatives to each other.',
    },
    {
      question: 'What does a CARSI course cost?',
      answer: `Courses are bought individually, ${
        perCourseLabel ? perCourseLabel.toLowerCase() : 'at the price shown on each course'
      }. You pay once for the course, your completion is recorded, and any IICRC CECs the course carries are tracked in your dashboard.`,
    },
    {
      question: 'Is the comparison price on this page current?',
      answer: `It was read directly off the provider's own booking page on ${CHECKED_ON} and is quoted with the source linked so you can check it yourself. Prices move; if you are reading this well after that date, open the link and confirm.`,
    },
  ];
}

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

export default async function RestorationTrainingCostPage() {
  const facts = await getPublicCatalogueFacts();
  const perCourseLabel = perCoursePriceLabel(facts.minPaidCoursePriceAud);
  const PER_COURSE_LABEL = perCourseLabel ?? PER_COURSE_PRICE_FALLBACK_LABEL;
  const FAQ_ITEMS = buildFaqItems(perCourseLabel);
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

      <PlatformPageHeroFromSurface
        current="/restoration-training-cost-australia"
        variant="ledger"
        glow="left"
        stats={[
          { value: `$${COMPARISON_TOTAL}`, label: 'One-off cert example' },
          { value: PER_COURSE_LABEL, label: 'CARSI per course' },
          { value: CHECKED_ON, label: 'Comparison checked' },
          { value: 'AUD', label: 'All figures' },
        ]}
      />

      <PlatformPageSection
        id="different-purchases"
        eyebrow="Two purchases"
        title="First, the thing most comparisons get wrong"
        tone="muted"
      >
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          A certification course and a continuing education course are not competing products. You
          buy an IICRC certification once per discipline, from a school approved by the IICRC and
          its examination. Keeping that certification current is a separate, recurring cost for the
          rest of your career. CARSI is an accredited IICRC CEC provider and sits on the recurring
          side. CARSI does not deliver IICRC certification, and no CARSI course will make you IICRC
          certified.
        </p>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          So the honest question is not &ldquo;which is cheaper&rdquo;. It is: once you hold a
          certification, what does it cost you every year to keep it?
        </p>
      </PlatformPageSection>

      <PlatformPageSection id="the-numbers" eyebrow="The ledger" title="The numbers" tone="white">
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          Read these as two separate line items, not as two prices for the same thing. The first is
          a one-off certification bought from a school approved by the IICRC. The second is
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
              <span className="mt-1 block text-sm text-slate-600">bought one course at a time</span>
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
              same thing. A certification is bought once per discipline, from a school approved by
              the IICRC and its examination. Continuing education recurs for as long as the
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
          on {CHECKED_ON}. It is one Australian provider and one course, quoted so you can verify it
          — not a survey of the market, and not the only option worth looking at.
        </p>
      </PlatformPageSection>

      <PlatformPageSection
        id="hidden-cost"
        eyebrow="Off the invoice"
        title="The cost that never appears on the invoice"
        tone="muted"
      >
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          A three-day course costs you the fee plus three days you were not earning. We are not
          going to invent a day rate for you, because yours is the only one that matters. Take what
          your crew bills in a day, multiply by three, and add it to the course fee. For most
          restoration businesses that second number is the larger of the two.
        </p>
        <p className={`mt-4 max-w-2xl ${LANDING_LEAD_CLASS}`}>
          That is the whole argument for online CECs. Not that classroom training is bad — hands-on
          certification training is worth doing properly and in person. It is that your{' '}
          <em>recurring</em> credit-keeping should not keep costing you days on site.
        </p>
      </PlatformPageSection>

      <PlatformMidCtaBanner
        title="Have a look at what a course costs"
        lead="Every course lists its own price and the CECs it carries, where it carries any."
        primaryHref="/courses"
        primaryLabel="Browse courses"
        secondaryHref="/pricing"
        secondaryLabel="See all pricing"
      />

      <HomeFaqSection faqs={FAQ_ITEMS} />
      <PlatformContextualNext current="/restoration-training-cost-australia" />
      <StaticMarketingClosingCta />
    </>
  );
}
