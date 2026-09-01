import {
  LANDING_DISPLAY_H2_CLASS,
  LANDING_EYEBROW_CLASS,
  LANDING_LEAD_CLASS,
} from '@/components/landing/public-shell-width';
import { marketingTextMuted, marketingTextStrong } from '@/lib/marketing/marketing-ui';

export type IndustryFaq = {
  question: string;
  answer: string;
};

interface IndustryFAQSectionProps {
  industryName: string;
  faqs: IndustryFaq[];
}

export function IndustryFAQSection({ industryName, faqs }: IndustryFAQSectionProps) {
  if (faqs.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className={LANDING_EYEBROW_CLASS}>Frequent questions</p>
          <h2 className={`mt-4 ${LANDING_DISPLAY_H2_CLASS}`}>{industryName} training FAQs</h2>
          <p className={`mt-5 max-w-md ${LANDING_LEAD_CLASS}`}>
            Direct answers for technicians and contractor crews comparing sector-relevant training.
          </p>
        </div>

        <div className="divide-y divide-slate-200/90 border-y border-slate-200/90">
          {faqs.map((faq, index) => (
            <details key={faq.question} className="group py-5 sm:py-6">
              <summary
                className={`flex cursor-pointer list-none items-start gap-4 text-base font-semibold marker:content-none ${marketingTextStrong}`}
              >
                <span className="pt-0.5 font-mono text-[11px] tracking-[0.12em] text-slate-600">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1">{faq.question}</span>
                <span
                  className="mt-1 text-lg leading-none text-[#146fc2] transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className={`mt-4 pr-10 pl-10 text-sm leading-7 ${marketingTextMuted}`}>
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
