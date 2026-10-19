/**
 * Short question-and-answer copy for the pages buyers and answer engines ask about. Each page
 * renders these visibly (HomeFaqSection / its own list) AND emits FAQPage JSON-LD from the same
 * array (faq-parity.test.tsx). Every number and term is an argument computed from its source by
 * the page — the catalogue, the /pricing membership tier or the CEC approvals registry — never
 * typed here. When the catalogue cannot be read, the answers say so instead of stating a zero,
 * and the page emits no FAQPage schema.
 *
 * Copy only (no CSS): check:iicrc-terminology, check:iicrc-compliance, check:standards-claims and
 * check:au-english all scan this file (answer-engine.test.ts).
 */
export type Faq = { question: string; answer: string };

/** The yearly membership tier as /pricing renders it (src/lib/lms/pricing-tiers.ts). */
export type MembershipFacts = {
  priceAud: number;
  /** Whether it can be bought now (the subscriptions flag). */
  available: boolean;
  /** The tier's own description: what it gives and for how long. */
  terms: string;
};

export type CatalogueAnswerFacts = {
  /** False when the published catalogue could not be read: no count or CEC figure is stated. */
  catalogueAvailable: boolean;
  /** Published courses listed on /courses. */
  publishedCourseCount: number;
  /** How many of them are free. */
  freeCourseCount: number;
  /** Cheapest paid course in AUD, or null when unknown. */
  minPaidCoursePriceAud: number | null;
  /** Published courses with an IICRC CEC approval in force today. */
  cecApprovedCount: number;
  membership: MembershipFacts;
};

const UNAVAILABLE =
  'The course list is not available right now, so this cannot be answered at the moment. Please try again shortly.';

function aud(amount: number): string {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)} AUD`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function membershipSentence(m: MembershipFacts): string {
  return m.available
    ? `Yearly membership is ${aud(m.priceAud)} per year: ${sentence(m.terms)}`
    : `Yearly membership (${aud(m.priceAud)} per year) is listed on the pricing page as coming soon and cannot be bought yet.`;
}

const CERTIFICATION_ANSWER =
  'No. IICRC certification is obtained only through IICRC-approved schools and examinations. CARSI is an IICRC CEC Accredited provider and issues its own credentials, the CARSI Southern Hemisphere Restoration Designations. Each one has a public verification page.';

/** /courses — catalogue questions. */
export function catalogueFaqs(f: CatalogueAnswerFacts): Faq[] {
  const certification = {
    question: 'Will a CARSI course make me IICRC certified?',
    answer: CERTIFICATION_ANSWER,
  };
  if (!f.catalogueAvailable) {
    return [
      { question: 'How many courses does CARSI offer?', answer: UNAVAILABLE },
      certification,
      { question: 'Which CARSI courses have IICRC CEC hours?', answer: UNAVAILABLE },
      priceFaq({ minPaidCoursePriceAud: null, membership: f.membership }),
    ];
  }
  const free =
    f.freeCourseCount > 0
      ? ` ${f.freeCourseCount} of them ${plural(f.freeCourseCount, 'is', 'are')} free.`
      : '';
  return [
    {
      question: 'How many courses does CARSI offer?',
      answer: `CARSI has ${f.publishedCourseCount} published ${plural(f.publishedCourseCount, 'course', 'courses')}, all studied online at your own pace.${free}`,
    },
    certification,
    cecWhichFaq(f.cecApprovedCount),
    priceFaq(f),
  ];
}

function cecWhichFaq(cecApprovedCount: number): Faq {
  return {
    question: 'Which CARSI courses have IICRC CEC hours?',
    answer:
      cecApprovedCount > 0
        ? `Only those with an IICRC CEC approval in force: ${cecApprovedCount} at present, listed with their hours and expiry dates on the IICRC CEC courses page. A course without an approval shows no CEC hours.`
        : 'None at present. A course shows CEC hours only while it has an IICRC CEC approval in force.',
  };
}

function priceFaq(f: { minPaidCoursePriceAud: number | null; membership: MembershipFacts }): Faq {
  const perCourse =
    typeof f.minPaidCoursePriceAud === 'number' && f.minPaidCoursePriceAud > 0
      ? `Paid courses are bought one at a time, from ${aud(f.minPaidCoursePriceAud)}; each course page shows its price.`
      : 'Paid courses are bought one at a time; each course page shows its price.';
  return {
    question: 'How much do CARSI courses cost?',
    answer: `${perCourse} ${membershipSentence(f.membership)}`,
  };
}

/** /pricing — buying questions. */
export function pricingFaqs(f: {
  minPaidCoursePriceAud: number | null;
  membership: MembershipFacts;
}): Faq[] {
  return [
    {
      question: 'Do I have to buy anything to start?',
      answer:
        'No. Every learner gets the Free Library at no cost and no card required. When you are ready, buy any individual course outright; yearly membership is optional.',
    },
    priceFaq(f),
    {
      question: "What's included in a yearly membership?",
      answer: f.membership.available
        ? sentence(f.membership.terms)
        : `Yearly membership is coming soon and is not available to purchase yet. The pricing page describes it as: ${sentence(f.membership.terms)} Buy any course individually today.`,
    },
    {
      question: 'Which courses have IICRC CEC hours?',
      answer:
        'Only courses with an IICRC CEC approval in force. They are listed, with their hours and approval expiry dates, on the IICRC CEC courses page. A course without an approval shows no CEC hours.',
    },
  ];
}

/** /iicrc-cec-courses — what the approvals mean. Dates are ISO (YYYY-MM-DD) from the registry. */
export function cecCourseFaqs(f: {
  /** False when the published catalogue could not be read. */
  available: boolean;
  approvedCount: number;
  earliestExpiry: string | null;
  latestExpiry: string | null;
}): Faq[] {
  const meaning = {
    question: 'What does an IICRC CEC approval mean for a CARSI course?',
    answer:
      'The IICRC has approved that course for the Continuing Education Credit (CEC) hours shown, until the expiry date shown. CEC hours go toward the continuing education an existing IICRC certificate holder needs. They are not IICRC certification.',
  };
  const certification = {
    question: 'Will a CARSI course make me IICRC certified?',
    answer: CERTIFICATION_ANSWER,
  };
  if (!f.available) {
    return [
      meaning,
      {
        question: 'How many CARSI courses have an IICRC CEC approval in force?',
        answer: UNAVAILABLE,
      },
      certification,
    ];
  }
  const faqs: Faq[] = [
    meaning,
    {
      question: 'How many CARSI courses have an IICRC CEC approval in force?',
      answer:
        f.approvedCount > 0
          ? `${f.approvedCount} at present, all listed in the table on this page. A course leaves the list when its approval expires.`
          : 'None at present. A course appears here only while its IICRC CEC approval is in force.',
    },
    certification,
  ];
  if (f.approvedCount > 0 && f.earliestExpiry && f.latestExpiry) {
    faqs.push({
      question: 'When do these approvals expire?',
      answer:
        f.earliestExpiry === f.latestExpiry
          ? `Every approval listed here expires on ${f.earliestExpiry}.`
          : `The approvals listed here expire between ${f.earliestExpiry} and ${f.latestExpiry}. Each row shows its own date.`,
    });
  }
  return faqs;
}
